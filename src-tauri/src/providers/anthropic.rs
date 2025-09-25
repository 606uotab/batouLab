// src-tauri/src/providers/anthropic.rs

use crate::{Message, Role};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct AReq {
    model: String,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<AMsg>,
}

#[derive(Serialize)]
struct AMsg {
    role: &'static str, // "user" | "assistant"
    content: Vec<AText>,
}

#[derive(Serialize)]
struct AText {
    #[serde(rename = "type")]
    t: &'static str, // "text"
    text: String,
}

#[derive(Deserialize)]
struct ARes {
    content: Vec<APart>,
}

#[derive(Deserialize)]
struct APart {
    #[serde(rename = "type")]
    _t: String,
    text: String,
}

pub async fn chat_complete(api_key: &str, model: &str, msgs: &[Message]) -> Result<String, String> {
    // Anthropic: `system` séparé, messages user/assistant avec un tableau de blocks
    let mut system_acc: Vec<&str> = Vec::new();
    let mut conv: Vec<AMsg> = Vec::new();

    for m in msgs {
        match m.role {
            Role::System => system_acc.push(&m.content),
            Role::User => conv.push(AMsg {
                role: "user",
                content: vec![AText { t: "text", text: m.content.clone() }],
            }),
            Role::Assistant => conv.push(AMsg {
                role: "assistant",
                content: vec![AText { t: "text", text: m.content.clone() }],
            }),
        }
    }

    let body = AReq {
        model: model.to_string(),
        max_tokens: 1024,
        system: if system_acc.is_empty() {
            None
        } else {
            Some(system_acc.join("\n\n"))
        },
        messages: conv,
    };

    let client = reqwest::Client::builder()
    .user_agent("batouLab/0.0.3")
    .timeout(std::time::Duration::from_secs(60))
    .build()
    .map_err(|e| e.to_string())?;

    let res = client
    .post("https://api.anthropic.com/v1/messages")
    .header("x-api-key", api_key)
    .header("anthropic-version", "2023-06-01")
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Anthropic HTTP: {e}"))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(format!("Anthropic {model}: {txt}"));
    }

    let json: ARes = res
    .json()
    .await
    .map_err(|e| format!("Anthropic JSON: {e}"))?;

    json.content
    .get(0)
    .map(|p| p.text.clone())
    .ok_or_else(|| "Anthropic: réponse vide".into())
}
