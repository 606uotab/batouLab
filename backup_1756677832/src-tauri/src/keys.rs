use anyhow::{anyhow, bail, Context, Result};
use base64::{engine::general_purpose, Engine as _};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce}; // XChaCha20 24-byte nonce
use dirs::config_dir;
use hkdf::Hkdf;
use keyring::Entry;
use rand::RngCore;
use sha2::Sha256;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

const SERVICE_OPENAI: &str = "BatouLab:openai";
const SERVICE_MISTRAL: &str = "BatouLab:mistral";

#[derive(thiserror::Error, Debug)]
pub enum KeyStoreError {
  #[error("provider inconnu")] UnknownProvider,
}

fn service_name(provider: &str) -> Result<&'static str> {
  Ok(match provider {
    "openai" => SERVICE_OPENAI,
    "mistral" => SERVICE_MISTRAL,
    _ => return Err(KeyStoreError::UnknownProvider.into()),
  })
}

fn keys_dir() -> Result<PathBuf> {
  let dir = config_dir().unwrap_or_else(|| PathBuf::from("."))
    .join("BatouLab").join("keys");
  fs::create_dir_all(&dir)?;
  Ok(dir)
}

fn kek_path() -> Result<PathBuf> { Ok(keys_dir()?.join(".kek")) }

fn ensure_kek() -> Result<Vec<u8>> {
  let path = kek_path()?;
  if path.exists() {
    let mut v = Vec::new();
    File::open(&path)?.read_to_end(&mut v)?;
    Ok(v)
  } else {
    let mut kek = vec![0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut kek);
    let mut f = File::create(&path)?;
    f.write_all(&kek)?;
    #[cfg(unix)] {
      let mut perm = fs::metadata(&path)?.permissions();
      perm.set_mode(0o600);
      fs::set_permissions(&path, perm)?;
    }
    Ok(kek)
  }
}

fn derive_content_key(kek: &[u8], context: &str) -> chacha20poly1305::Key {
  let hk = Hkdf::<Sha256>::new(None, kek);
  let mut okm = [0u8; 32];
  hk.expand(context.as_bytes(), &mut okm).expect("HKDF expand");
  chacha20poly1305::Key::from_slice(&okm).to_owned()
}

fn enc_path(provider: &str) -> Result<PathBuf> {
  Ok(keys_dir()?.join(format!("{}.enc", provider)))
}

fn encrypt_to_file(provider: &str, plaintext: &[u8]) -> Result<()> {
  let kek = ensure_kek()?;
  let key = derive_content_key(&kek, &format!("batoulab:{}", provider));
  let cipher = XChaCha20Poly1305::new(&key);
  let mut nonce_bytes = [0u8; 24];
  rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
  let nonce = XNonce::from_slice(&nonce_bytes);
  let ct = cipher.encrypt(nonce, plaintext)
    .map_err(|e| anyhow!("encrypt: {:?}", e))?; // pas .context() ici
  let mut out = Vec::with_capacity(24 + ct.len());
  out.extend_from_slice(&nonce_bytes);
  out.extend_from_slice(&ct);
  let b64 = general_purpose::STANDARD_NO_PAD.encode(out);
  fs::write(enc_path(provider)?, b64)?;
  Ok(())
}

fn decrypt_from_file(provider: &str) -> Result<Vec<u8>> {
  let b64 = fs::read_to_string(enc_path(provider)?)?;
  let data = general_purpose::STANDARD_NO_PAD.decode(b64).context("b64")?;
  if data.len() < 24 { bail!("ciphertext trop court"); }
  let (nonce_bytes, ct) = data.split_at(24);
  let kek = ensure_kek()?;
  let key = derive_content_key(&kek, &format!("batoulab:{}", provider));
  let cipher = XChaCha20Poly1305::new(&key);
  let nonce = XNonce::from_slice(nonce_bytes);
  let pt = cipher.decrypt(nonce, ct)
    .map_err(|e| anyhow!("decrypt: {:?}", e))?; // pas .context() ici
  Ok(pt)
}

pub fn save_api_key(provider: &str, key: &str) -> Result<()> {
  if let Ok(service) = service_name(provider) {
    if let Ok(entry) = Entry::new(service, "default") {
      if entry.set_password(key).is_ok() { return Ok(()); }
    }
  }
  encrypt_to_file(provider, key.as_bytes())
}

pub fn load_api_key(provider: &str) -> Result<Option<String>> {
  if let Ok(service) = service_name(provider) {
    if let Ok(entry) = Entry::new(service, "default") {
      if let Ok(k) = entry.get_password() { return Ok(Some(k)); }
    }
  }
  let p = enc_path(provider)?;
  if !p.exists() { return Ok(None); }
  let pt = decrypt_from_file(provider)?;
  Ok(Some(String::from_utf8(pt)?))
}

pub fn remove_api_key(provider: &str) -> Result<()> {
  if let Ok(service) = service_name(provider) {
    if let Ok(entry) = Entry::new(service, "default") {
      let _ = entry.delete_password();
    }
  }
  let p = enc_path(provider)?;
  if p.exists() { fs::remove_file(p)?; }
  Ok(())
}

pub async fn validate_api_key(provider: &str, key: &str) -> Result<bool> {
  let url = match provider {
    "openai" => "https://api.openai.com/v1/models",
    "mistral" => "https://api.mistral.ai/v1/models",
    _ => bail!("provider inconnu"),
  };
  let resp = reqwest::Client::new().get(url).bearer_auth(key).send().await?;
  Ok(resp.status().is_success())
}
