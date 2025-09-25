set -euo pipefail
F="src-tauri/src/main.rs"
cp -f "$F" "backup_$(date +%s)_main.rs"

python3 - <<'PY'
from pathlib import Path, re
p = Path("src-tauri/src/main.rs")
s = p.read_text()

# Remplace ENTIEREMENT la fonction decrypt_bytes par une version clean.
pat = re.compile(
    r"fn\s+decrypt_bytes\s*\([^)]*\)\s*->\s*Result<Vec<u8>,\s*String>\s*\{.*?\n\}",
    re.S,
)

new = r'''fn decrypt_bytes(state: &State<AppState>, s: &str) -> Result<Vec<u8>, String> {
    let st = s.trim();

    // Cas non chiffré: tableau JSON ou objet JSON SANS champ "nonce" -> on renvoie tel quel.
    if st.starts_with('[') || (st.starts_with('{') && !st.contains("\"nonce\"")) {
        return Ok(st.as_bytes().to_vec());
    }

    // Sinon: envelope JSON { nonce, ct } -> déchiffrement ChaCha20-Poly1305
    let v: serde_json::Value = serde_json::from_str(st).map_err(|e| e.to_string())?;
    let n = base64::decode(v.get("nonce").and_then(|x| x.as_str()).ok_or("missing nonce")?)
        .map_err(|e| e.to_string())?;
    let ct = base64::decode(v.get("ct").and_then(|x| x.as_str()).ok_or("missing ct")?)
        .map_err(|e| e.to_string())?;

    use chacha20poly1305::{aead::{Aead, Payload}, ChaCha20Poly1305, KeyInit};
    let cipher = ChaCha20Poly1305::new((&state.key).into());
    let plain = cipher
        .decrypt((&n).into(), Payload { msg: &ct, aad: b"" })
        .map_err(|e| e.to_string())?;
    Ok(plain)
}
'''
s2, n = pat.subn(new, s, count=1)
if n == 0:
    print("!! decrypt_bytes function not found; aborting")
    raise SystemExit(1)

p.write_text(s2)
print("== Rust decrypt_bytes replaced OK ==")
PY
