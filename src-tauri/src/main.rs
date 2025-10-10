use serde::{Deserialize, Serialize};
use tauri_plugin_sql::Builder as SqlPlugin;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
  User,
  Assistant,
  System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
  pub role: Role,
  pub content: String,
  #[serde(default)]
  pub ts: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatInput {
  pub provider: String, // "openai" | "anthropic" | "mistral"
  pub model: String,
  #[serde(default)]
  pub api_key: Option<String>,
  pub messages: Vec<Message>,
}

// modules providers
mod providers;
use providers::{anthropic, mistral, openai};

#[tauri::command]
async fn chat_complete(input: ChatInput) -> Result<String, String> {
  let api_key = input.api_key.unwrap_or_default();
  let model = input.model;
  match input.provider.as_str() {
    "openai" => openai::chat_complete(&api_key, &model, &input.messages).await,
    "anthropic" => anthropic::chat_complete(&api_key, &model, &input.messages).await,
    "mistral" => mistral::chat_complete(&api_key, &model, &input.messages).await,
    other => Err(format!("Fournisseur inconnu: {other}")),
  }
}

fn main() {
  tauri::Builder::default()
  .plugin(tauri_plugin_opener::init())
  .plugin(tauri_plugin_http::init())
  .plugin(tauri_plugin_fs::init())
  .plugin(tauri_plugin_dialog::init())      // sélection/confirmation fichiers
  .plugin(SqlPlugin::default().build())     // tauri-plugin-sql v2
  .invoke_handler(tauri::generate_handler![chat_complete])
  .run(tauri::generate_context!())
  .expect("error while running tauri application");
}
