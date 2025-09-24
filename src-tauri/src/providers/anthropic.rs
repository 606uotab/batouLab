use serde_json::json;
use anyhow::Result;

// Messages API: POST /v1/messages + headers anthropic-version, x-api-key. :contentReference[oaicite:0]{index=0}
pub async fn call(api_key: &str, model: &str, msgs: &[crate::Msg]) -> Result<String> {
    let client = reqwest::Client::new();
    let system = msgs.iter().filter(|m| m.role == "system")
        .map(|m| m.content.clone()).collect::<Vec<_>>().join("\n\n");
    let messages: Vec<serde_json::Value> = msgs.iter()
        .filter(|m| m.role != "system")
        .map(|m| json!({"role": if m.role=="assistant" {"assistant"} else {"user"},
                        "content":[{"type":"text","text": m.content}]}))
        .collect();
    let mut body = json!({ "model": model, "max_tokens": 1024, "messages": messages });
    if !system.is_empty() { body["system"] = serde_json::Value::String(system); }

    let res = client.post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body).send().await?;
    let v: serde_json::Value = res.json().await?;
    let mut out = String::new();
    if let Some(arr) = v.get("content").and_then(|x| x.as_array()) {
        for p in arr { if let Some(t)=p.get("text").and_then(|t| t.as_str()) { out.push_str(t); } }
    }
    Ok(out)
}
