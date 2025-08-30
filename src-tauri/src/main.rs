#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

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

fn main() {
  tauri::Builder::default()
    .setup(|app| { init_keys_and_status(&app.app_handle()); Ok(()) })
    .invoke_handler(tauri::generate_handler![
      validate_api_key,
      save_api_key,
      remove_api_key,
      refresh_provider_status,
      emit_current_status,
      chat_complete
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
