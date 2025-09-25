// src-tauri/src/providers/mistral.rs

use crate::{Message, Role};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: AssistantMessage,
}

#[derive(Deserialize)]
struct AssistantMessage {
    content: String,
}

pub async fn chat_complete(
    api_key: &str,
    model: &str,
    msgs: &[Message],
) -> Result<String, String> {
    let body = ChatRequest {
        model: model.to_string(),
        messages: msgs
        .iter()
        .map(|m| ChatMessage {
            role: match m.role {
                Role::User => "user",
                Role::Assistant => "assistant",
                Role::System => "system",
            },
            content: m.content.clone(),
        })
        .collect(),
    };

    let client = reqwest::Client::builder()
    .user_agent("batouLab/0.0.3")
    .timeout(std::time::Duration::from_secs(60))
    .build()
    .map_err(|e| e.to_string())?;

    let res = client
    .post("https://api.mistral.ai/v1/chat/completions")
    .bearer_auth(api_key)
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Mistral HTTP: {e}"))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(format!("Mistral {model}: {txt}"));
    }

    let json: ChatResponse = res
    .json()
    .await
    .map_err(|e| format!("Mistral JSON: {e}"))?;

    Ok(json
    .choices
    .get(0)
    .map(|c| c.message.content.clone())
    .unwrap_or_default())
}
