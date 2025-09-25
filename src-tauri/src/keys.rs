use std::{fs, path::PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default)]
struct KeyFile { entries: std::collections::BTreeMap<String,String> }

fn key_path() -> Result<PathBuf, String> {
  let mut p = dirs::config_dir().ok_or("no config_dir")?;
  p.push("batoulab");
  fs::create_dir_all(&p).map_err(|e| e.to_string())?;
  p.push("keys.json");
  Ok(p)
}
pub fn save_api_key(provider:&str, key:&str) -> Result<(), String> {
  let p = key_path()?;
  let mut data: KeyFile = if p.exists() {
    serde_json::from_str(&fs::read_to_string(&p).map_err(|e| e.to_string())?).unwrap_or_default()
  } else { KeyFile::default() };
  data.entries.insert(provider.to_string(), key.to_string());
  fs::write(&p, serde_json::to_string_pretty(&data).unwrap()).map_err(|e| e.to_string())
}
pub fn load_api_key(provider:&str) -> Result<Option<String>, String> {
  let p = key_path()?;
  if !p.exists() { return Ok(None); }
  let data: KeyFile = serde_json::from_str(&fs::read_to_string(&p).map_err(|e| e.to_string())?)
    .unwrap_or_default();
  Ok(data.entries.get(provider).cloned())
}
pub fn remove_api_key(provider:&str) -> Result<(), String> {
  let p = key_path()?;
  if !p.exists() { return Ok(()); }
  let mut data: KeyFile = serde_json::from_str(&fs::read_to_string(&p).map_err(|e| e.to_string())?)
    .unwrap_or_default();
  data.entries.remove(provider);
  fs::write(&p, serde_json::to_string_pretty(&data).unwrap()).map_err(|e| e.to_string())
}
