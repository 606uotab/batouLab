// src-tauri/src/providers/openai.rs

use crate::{Message, Role};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct OAReq {
    model: String,
    messages: Vec<OAMsg>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Serialize)]
struct OAMsg {
    role: &'static str,
    content: String,
}

#[derive(Deserialize)]
struct OARes {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: OAMessage,
}

#[derive(Deserialize)]
struct OAMessage {
    content: String,
}

pub async fn chat_complete(api_key: &str, model: &str, msgs: &[Message]) -> Result<String, String> {
    let body = OAReq {
        model: model.to_string(),
        messages: msgs
        .iter()
        .map(|m| OAMsg {
            role: match m.role {
                Role::User => "user",
                Role::Assistant => "assistant",
                Role::System => "system",
            },
            content: m.content.clone(),
        })
        .collect(),
        temperature: None,
    };

    let client = reqwest::Client::builder()
    .user_agent("batouLab/0.0.3")
    .timeout(std::time::Duration::from_secs(60))
    .build()
    .map_err(|e| e.to_string())?;

    let res = client
    .post("https://api.openai.com/v1/chat/completions")
    .bearer_auth(api_key)
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("OpenAI HTTP: {e}"))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(format!("OpenAI {model}: {txt}"));
    }

    let json: OARes = res
    .json()
    .await
    .map_err(|e| format!("OpenAI JSON: {e}"))?;

    json.choices
    .get(0)
    .map(|c| c.message.content.clone())
    .ok_or_else(|| "OpenAI: réponse vide".into())
}
