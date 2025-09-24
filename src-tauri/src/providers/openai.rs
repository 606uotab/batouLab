use anyhow::{anyhow, Result};
use serde_json::{json, Value};
use crate::Msg;

fn needs_responses(model: &str) -> bool {
    let m = model.to_lowercase();
    m.starts_with("gpt-5") || m.contains("deep-research") || m == "computer-use-preview"
}

pub async fn call(api_key: &str, model: &str, msgs: &[Msg]) -> Result<String> {
    if needs_responses(model) {
        if let Ok(s) = call_responses(api_key, model, msgs).await { return Ok(s); }
        return call_chat(api_key, model, msgs).await;
    }
    match call_chat(api_key, model, msgs).await {
        Ok(s) if !s.trim().is_empty() => Ok(s),
        _ => call_responses(api_key, model, msgs).await,
    }
}

async fn call_chat(api_key: &str, model: &str, msgs: &[Msg]) -> Result<String> {
    let client = reqwest::Client::new();
    let body = json!({
        "model": model,
        "messages": msgs.iter().map(|m| json!({"role": m.role, "content": m.content})).collect::<Vec<_>>(),
        "temperature": 0.7, "max_tokens": 1024
    });
    let res = client.post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key).json(&body).send().await?;
    if !res.status().is_success() {
        return Err(anyhow!("OpenAI(chat) HTTP {}", res.status()));
    }
    let v: Value = res.json().await?;
    let s = v.pointer("/choices/0/message/content").and_then(|x| x.as_str())
        .or_else(|| v.pointer("/choices/0/text").and_then(|x| x.as_str()))
        .unwrap_or_default().to_string();
    if s.trim().is_empty() { return Err(anyhow!("OpenAI(chat): sortie vide")); }
    Ok(s)
}

async fn call_responses(api_key: &str, model: &str, msgs: &[Msg]) -> Result<String> {
    let client = reqwest::Client::new();
    let instructions = msgs.iter().filter(|m| m.role=="system").map(|m| m.content.clone()).collect::<Vec<_>>().join("\n\n");
    let input_msgs: Vec<Value> = msgs.iter().filter(|m| m.role!="system")
        .map(|m| json!({"role": m.role, "content":[{"type":"input_text","text": m.content}]})).collect();

    let body = json!({
        "model": model,
        "instructions": if instructions.is_empty(){ Value::Null } else { Value::String(instructions) },
        "input": input_msgs,
        "temperature": 0.7,
        "max_output_tokens": 1024
    });
    let res = client.post("https://api.openai.com/v1/responses")
        .bearer_auth(api_key).json(&body).send().await?;
    if !res.status().is_success() {
        return Err(anyhow!("OpenAI(responses) HTTP {}", res.status()));
    }
    let v: Value = res.json().await?;

    if let Some(s) = v.get("output_text").and_then(|x| x.as_str()) {
        if !s.trim().is_empty() { return Ok(s.to_string()); }
    }
    if let Some(arr) = v.get("output").and_then(|x| x.as_array()) {
        let mut text_buf = String::new();
        for item in arr {
            if let Some(content) = item.get("content").and_then(|x| x.as_array()) {
                for p in content {
                    if let Some(t) = p.get("text").and_then(|x| x.as_str()) {
                        text_buf.push_str(t);
                    }
                }
            }
        }
        if !text_buf.trim().is_empty() { return Ok(text_buf); }
    }
    Err(anyhow!("OpenAI(responses): sortie vide"))
}
