#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use std::sync::Mutex;
use rand::RngCore;
use rand::rngs::OsRng;
use argon2::{Argon2};
use chacha20poly1305::{XChaCha20Poly1305, aead::{Aead, KeyInit}, XNonce};
use base64;
use zeroize::Zeroize;
use tauri::State;
use tauri::{Emitter, Manager};
use serde::{Deserialize, Serialize};
mod keys;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
  pub role: String,
  pub content: String,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatInput {
  pub provider: String,          // ignoré (on force mistral)
  pub model: String,             // ex: "mistral-small-latest"
  pub messages: Vec<ChatMessage>
}

#[tauri::command]
async fn validate_api_key(_provider: String, key: String) -> Result<bool, String> {
  let url = "https://api.mistral.ai/v1/models";
  let client = reqwest::Client::new();
  let resp = client.get(url).bearer_auth(&key).send().await
    .map_err(|e| e.to_string())?;
  Ok(resp.status().is_success())
}

#[tauri::command]
fn save_api_key(_provider: String, key: String) -> Result<(), String> {
  keys::save_api_key("mistral", &key).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_api_key(_provider: String) -> Result<(), String> {
  keys::remove_api_key("mistral").map_err(|e| e.to_string())
}

#[tauri::command]
fn refresh_provider_status(app: tauri::AppHandle, _provider: String) -> Result<(), String> {
  tauri::async_runtime::spawn(async move {
    let ok = match keys::load_api_key("mistral") {
      Ok(Some(k)) => validate_api_key("mistral".into(), k).await.unwrap_or(false),
      _ => false,
    };
    let _ = app.emit("provider_status", serde_json::json!({ "provider": "mistral", "ok": ok }));
  });
  Ok(())
}

#[tauri::command]
fn emit_current_status(app: tauri::AppHandle) {
  let _ = refresh_provider_status(app, "mistral".to_string());
}

#[tauri::command]
async fn chat_complete(input: ChatInput) -> Result<String, String> {
  // 1) charge la clé Mistral
  let key = keys::load_api_key("mistral")
    .map_err(|e| e.to_string())?
    .ok_or("Aucune clé Mistral enregistrée (onglet Clés API)".to_string())?;

  // 2) requête chat Mistral
  #[derive(Serialize)]
  struct Req<'a> { model: &'a str, messages: &'a [ChatMessage] }
  #[derive(Deserialize)]
  struct Resp { choices: Vec<Choice> }
  #[derive(Deserialize)]
  struct Choice { message: ChoiceMsg }
  #[derive(Deserialize)]
  struct ChoiceMsg { role: String, content: String }

  let url = "https://api.mistral.ai/v1/chat/completions";
  let client = reqwest::Client::new();
  let resp = client
    .post(url)
    .bearer_auth(&key)
    .json(&Req { model: &input.model, messages: &input.messages })
    .send()
    .await
    .map_err(|e| e.to_string())?;

  if !resp.status().is_success() {
    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    return Err(format!("HTTP {} for {} -> {}", status, url, body));
  }

  let data: Resp = resp.json().await.map_err(|e| e.to_string())?;
  Ok(data.choices.get(0).map(|c| c.message.content.clone()).unwrap_or_default())
}

fn init_keys_and_status(app: &tauri::AppHandle) {
  let _ = app.emit("provider_status", serde_json::json!({ "provider": "mistral", "ok": false }));
}

struct AppState { key: Mutex<Option<[u8;32]>> }


fn chats_root() -> std::path::PathBuf {
  let home = dirs::home_dir().ok_or("no home").unwrap();
  home.join(".config/BatouLab/chats")
}
fn key_file_path() -> std::path::PathBuf { chats_root().join(".key.json") }
fn ensure_dirs() -> Result<(), String> { std::fs::create_dir_all(chats_root()).map_err(|e| e.to_string()) }
fn derive_key(pass:&str, salt:&[u8]) -> Result<[u8;32], String> {
  let mut key=[0u8;32];
  let params=argon2::Params::new(256*1024,3,1,None).map_err(|e| e.to_string())?;
  let a=Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
  a.hash_password_into(pass.as_bytes(), salt, &mut key).map_err(|e| e.to_string())?; Ok(key)
}
fn read_or_create_salt() -> Result<[u8;16], String> {
  ensure_dirs()?;
  let p=key_file_path();
  if p.exists() {
    let v:serde_json::Value=serde_json::from_str(&std::fs::read_to_string(&p).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let b=v.get("salt").and_then(|x| x.as_str()).ok_or("invalid key file")?;
    let d=base64::decode(b).map_err(|e| e.to_string())?; if d.len()!=16 {return Err("bad salt".into())}
    let mut salt=[0u8;16]; salt.copy_from_slice(&d); return Ok(salt)
  } else {
    let mut salt=[0u8;16]; OsRng.fill_bytes(&mut salt);
    let obj=serde_json::json!({"v":1,"salt":base64::encode(salt)});
    std::fs::write(&p, serde_json::to_string_pretty(&obj).unwrap()).map_err(|e| e.to_string())?;
    return Ok(salt)
  }
}
fn cipher_from_state(state:&State<AppState>) -> Result<XChaCha20Poly1305,String>{
  let g=state.key.lock().unwrap(); let k=g.as_ref().ok_or("locked")?; Ok(XChaCha20Poly1305::new((&k[..]).into()))
}
fn encrypt_bytes(state:&State<AppState>, plain:&[u8]) -> Result<String,String>{
  let c=cipher_from_state(state)?; let mut n=[0u8;24]; OsRng.fill_bytes(&mut n);
  let ct=c.encrypt(XNonce::from_slice(&n), plain).map_err(|e| e.to_string())?;
  Ok(serde_json::to_string(&serde_json::json!({"v":1,"nonce":base64::encode(n),"ct":base64::encode(ct)})).unwrap())
}
fn decrypt_bytes(state:&State<AppState>, s:&str) -> Result<Vec<u8>,String>{
  let st=s.trim_start();
  if st.starts_with('[') or (st.starts_with('{') and !st.contains("\"nonce\"")) { return Ok(st.as_bytes().to_vec()) }
  let v:serde_json::Value=serde_json::from_str(st).map_err(|e| e.to_string())?;
  let n=base64::decode(v.get("nonce").and_then(|x| x.as_str()).ok_or("missing nonce")?).map_err(|e| e.to_string())?;
  let ct=base64::decode(v.get("ct").and_then(|x| x.as_str()).ok_or("missing ct")?).map_err(|e| e.to_string())?;
  let c=cipher_from_state(state)?; let pt=c.decrypt(XNonce::from_slice(&n), ct.as_ref()).map_err(|e| e.to_string())?;
  Ok(pt)
}

fn main() {
  
#[tauri::command]
fn save_history(json: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let path = home.join(".config/BatouLab/chats/index.json");
    if let Some(dir) = path.parent() { std::fs::create_dir_all(dir).map_err(|e| e.to_string())?; }
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_history() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let path = home.join(".config/BatouLab/chats/index.json");
    match std::fs::read_to_string(&path) {
        Ok(s) => Ok(s),
        Err(_) => Ok("[]".into()),
    }
}



#[tauri::command]
fn unlock_history(passphrase:String, state:tauri::State<AppState>) -> Result<(),String>{
  let salt=read_or_create_salt()?; let key=derive_key(&passphrase,&salt)?;
  { let mut slot=state.key.lock().unwrap(); *slot=Some(key); }
  Ok(())
}
#[tauri::command]
fn lock_history(state:tauri::State<AppState>) -> Result<(),String>{
  let mut slot=state.key.lock().unwrap(); if let Some(mut k)=slot.take(){ k.zeroize(); } Ok(())
}
#[tauri::command]
fn status_history(state:tauri::State<AppState>) -> Result<bool,String>{ Ok(state.key.lock().unwrap().is_some()) }
#[tauri::command]
fn save_history_enc(json:String, state:tauri::State<AppState>) -> Result<(),String>{
  ensure_dirs()?; let enc=encrypt_bytes(&state, json.as_bytes())?;
  std::fs::write(chats_root().join("index.json"), enc).map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn load_history_enc(state:tauri::State<AppState>) -> Result<String,String>{
  ensure_dirs()?; let p=chats_root().join("index.json");
  if !p.exists(){ return Ok("[]".into()) }
  let s=std::fs::read_to_string(&p).map_err(|e| e.to_string())?;
  Ok(String::from_utf8(decrypt_bytes(&state,&s)?).map_err(|e| e.to_string())?)
}


tauri::Builder::default()
        .manage(AppState { key: Mutex::new(None) })
    .setup(|app| { init_keys_and_status(&app.app_handle()); Ok(()) })
    .invoke_handler(tauri::generate_handler![validate_api_key, save_api_key, remove_api_key, refresh_provider_status, emit_current_status, chat_complete, save_history, load_history, unlock_history, lock_history, status_history, save_history_enc, load_history_enc])
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
