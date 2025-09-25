#!/usr/bin/env bash
set -euo pipefail
echo "[update] cwd: $(pwd)"

# vérif basique
[ -f package.json ] || { echo "[error] package.json introuvable"; exit 1; }
[ -f src-tauri/tauri.conf.json ] || { echo "[error] src-tauri/tauri.conf.json introuvable"; exit 1; }

# patch tauri.conf.json (capabilities seulement au bon endroit)
node - src-tauri/tauri.conf.json <<'NODE'
const fs=require('fs'),p=process.argv[2];
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.app=j.app||{}; j.app.windows=j.app.windows?.length?j.app.windows:[{label:'main'}];
if(!j.app.windows[0].label) j.app.windows[0].label='main';
j.app.security=j.app.security||{};
const want=new Set(['default','http-mistral','conversations']);
const have=new Set(j.app.security.capabilities||[]);
j.app.security.capabilities=[...new Set([...have,...want])];
if(j.app.windows[0].capabilities) delete j.app.windows[0].capabilities;
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("[tauri] patched", p);
NODE

echo "[done] Option B install complete."
