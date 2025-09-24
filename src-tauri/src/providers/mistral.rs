use serde_json::json;
use anyhow::Result;

pub async fn call(api_key: &str, model: &str, msgs: &[crate::Msg]) -> Result<String> {
    let client = reqwest::Client::new();
    let body = json!({
        "model": model,
        "messages": msgs.iter().map(|m| json!({"role": m.role, "content": m.content})).collect::<Vec<_>>(),
    });
    let res = client.post("https://api.mistral.ai/v1/chat/completions")
        .bearer_auth(api_key).json(&body).send().await?;
    let v: serde_json::Value = res.json().await?;
    Ok(v.pointer("/choices/0/message/content").and_then(|x| x.as_str()).unwrap_or("").to_string())
}
