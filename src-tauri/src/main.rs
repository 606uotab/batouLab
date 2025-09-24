<<<<<<< HEAD
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
=======
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use serde::Deserialize;

mod providers;
use providers::{mistral, anthropic, openai};

#[derive(Debug, Deserialize)]
pub struct Msg { pub role: String, pub content: String }

#[derive(Debug, Deserialize)]
pub struct ChatInput {
  pub provider: String,   // "mistral" | "anthropic" | "openai"
  pub model: String,
  pub api_key: String,
  pub messages: Vec<Msg>,
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
}

#[tauri::command]
async fn chat_complete(input: ChatInput) -> Result<String, String> {
<<<<<<< HEAD
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
=======
  let res = match input.provider.as_str() {
    "mistral"   => mistral::call(&input.api_key, &input.model, &input.messages).await,
    "anthropic" => anthropic::call(&input.api_key, &input.model, &input.messages).await,
    "openai"    => openai::call(&input.api_key, &input.model, &input.messages).await,
    _ => Err(anyhow::anyhow!("provider inconnu")),
  };
  res.map_err(|e| e.to_string())
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
}

fn main() {
  tauri::Builder::default()
<<<<<<< HEAD
    .setup(|app| { init_keys_and_status(&app.app_handle()); Ok(()) })
    .invoke_handler(tauri::generate_handler![
      validate_api_key,
      save_api_key,
      remove_api_key,
      refresh_provider_status,
      emit_current_status,
      chat_complete
    ])
=======
    .invoke_handler(tauri::generate_handler![chat_complete])
    .setup(|app| {
      if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_title("batouLab V0.0.3");
      }
      Ok(())
    })
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
