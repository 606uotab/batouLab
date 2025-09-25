set -euo pipefail
python3 - <<'PY'
from pathlib import Path
import re
p = Path("src-tauri/src/main.rs")
s = p.read_text()

# Remplace tout le bloc foireux par une version valide Rust
s = re.sub(
    r"if\s*st\.starts_with.*?to_vec\(\)\)\s*\}\s*",
    "if st.starts_with('[') || (st.starts_with('{') && !st.contains(\"\\\"nonce\\\"\")) {\n"
    "    return Ok(st.as_bytes().to_vec());\n"
    "}\n",
    s,
    flags=re.S
)
p.write_text(s)
PY
