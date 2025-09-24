# BatouLab

> Interface desktop légère (Tauri v2 + React/TS) pour utiliser plusieurs IA (Mistral aujourd’hui, OpenAI bientôt) sans navigateur. Clés API stockées localement. Cibles : Debian/Linux & BSD.

---

## ✨ Fonctionnalités (v0.1)
- Écran **Clés API** : saisir, **tester**, enregistrer & supprimer (Mistral et OpenAI).
- **Chat minimal** multi‑providers via une commande Rust (`chat_complete`).
- Stockage des clés via **keyring** quand possible, sinon fichier local **chiffré** (XChaCha20‑Poly1305 + HKDF) dans `~/.config/BatouLab/keys/`.
- Base **Tauri v2** / React + Vite (imports `@tauri-apps/api/core`, `@tauri-apps/api/event`).

> **Note** : à ce stade, le **provider Mistral** est opérationnel. OpenAI sera (ré)activé juste après la v0.1.

---

## 🧭 Architecture
```
┌───────────────────────── Desktop (Tauri v2) ─────────────────────────┐
│ React + Vite + TypeScript (UI)                                       │
│  • Pages : ApiKeysPage, ChatLite                                     │
│  • @tauri-apps/api : core (invoke), event (listen)                   │
│                                                                       │
│ Rust (src-tauri)                                                      │
│  • Commands :                                                         │
│    validate_api_key, save_api_key, remove_api_key,                    │
│    refresh_provider_status, emit_current_status, chat_complete        │
│  • keys.rs : stockage & chiffrement des clés, validation distante     │
│                                                                       │
│ Réseau : Reqwest (JSON, TLS) → POST /v1/chat/completions              │
└──────────────────────────────────────────────────────────────────────┘
```
**Arborescence**
```
batouLab/ (ou batoulab-app/)
├─ src/
│  ├─ components/
│  │  ├─ ApiKeysPage.tsx
│  │  └─ ChatLite.tsx
│  └─ App.tsx
└─ src-tauri/
   ├─ src/
   │  ├─ main.rs
   │  └─ keys.rs
   └─ Cargo.toml
```

---

## 📦 Prérequis
- **Debian/Ubuntu** : GTK/WebKitGTK et outils build
```bash
sudo apt update && sudo apt install -y \
  build-essential curl wget file libssl-dev libwebkit2gtk-4.0-dev \
  libayatana-appindicator3-dev librsvg2-dev libxdo-dev
```
- **Rust**
```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
. "$HOME/.cargo/env"
```
- **Node.js + npm** (ou pnpm)
```bash
sudo apt install -y nodejs npm
```

---

## 🚀 Installation (depuis GitHub)
```bash
# 1) Cloner
git clone https://github.com/606uotab/batouLab.git
cd batouLab

# 2) Installer les deps frontend
npm install

# 3) Lancer en dev (ouvre la fenêtre Tauri)
npm run tauri dev
```

Si `vite` indique `Port 1420 is already in use` : fermez l’instance précédente **ou** lancez `npm run tauri dev -- --port 1421` puis mettez à jour l’URL Vite si besoin.

---

## 🔑 Configuration des clés API
Ouvrez **Clés API** dans l’application :
1. Choisissez **Mistral**.
2. Collez votre clé depuis https://console.mistral.ai/ (onglet API keys).
3. **Tester** → **Enregistrer**. Le statut doit passer au vert.

> Test CLI :
```bash
curl -sS https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $MISTRAL_API_KEY" | head
```

---

## 💬 Utilisation (Chat)
- Onglet **Chat** → choisissez **Mistral** et un modèle (ex. `mistral-small-latest`).
- Tapez un message et **Envoyer**. La commande `chat_complete` s’occupe de l’appel HTTP.

Modèles usuels :
- **Mistral** : `mistral-small-latest`, `mistral-large-latest`, `codestral-2508*` (code).
- **OpenAI** : `gpt-4o-mini`, `gpt-4.1-mini` *(bientôt activé in‑app)*.

---

## 🛠️ Build release (pré‑v0.2)
```bash
# Build binaire release
cd src-tauri && cargo build --release
# Binaire : target/release/batoulab-app

# (v0.2) Tarball + signature GPG
# tar -cJf batoulab-<ver>-linux-x86_64.tar.xz batoulab-app
# gpg --armor --detach-sign batoulab-<ver>-linux-x86_64.tar.xz
```

---

## 🐞 Dépannage
- **401 Unauthorized** : clé absente/erronée → re‑tester dans Clés API. Proxy d’entreprise ? Prévoir build `native-tls` (OpenSSL) en alternative à `rustls`.
- **Port 1420 occupé** : fermer l’ancienne app ou changer de port.
- **Keyring indisponible** : fallback fichier chiffré dans `~/.config/BatouLab/keys/`.

---

## 🗺️ Roadmap (extrait)

La V0.0.1 est la première bouture alpha puossée sur GitHub. Et il reste beaucoup de travail !
  - v0.2 : packaging tarball signé GPG, thème/branding, sidebar & routing, sélection de modèles, messages d’erreur clairs.
  - v0.3 : modes **Coder / Movie Maker / Story Maker**, historique local chiffré, abstraction `Provider`.
  - v0.4 : **streaming** token‑par‑token, retry/backoff, export de sessions.

La V0.9 sera la Beta, sortable au publique.

La V1 sera le modèle coding only, terminé.

La V2 sera le modèle intégrand le coding/story maker
LA V3 sera avec le coding/StoryMaker/Movie Maker



---

## 🤝 Contribuer
PR bienvenues ! Merci d’ouvrir des issues pour bugs/feature requests. Style : Rust (rustfmt/clippy), TS/React (ESLint/Prettier).

---

## 📄 Licence
OpenSource Total.

---

## 🙏 Remerciements
- Tauri, Mistral AI, OpenAI, et la communauté Rust/JS.

