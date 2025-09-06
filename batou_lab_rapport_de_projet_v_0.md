# BatouLab — Rapport de projet (v0.1 α)

**Auteur :** Chef de projet BatouLab  
**Périmètre :** Application desktop légère (Tauri v2 + React/TS) pour agréger plusieurs IA (Mistral opérationnel, OpenAI à activer), avec 3 modes cibles (*Coder*, *Movie Maker*, *Story Maker*).  
**Cibles OS :** Debian/Linux (priorité), BSD (à valider).  
**Date :** 2025‑08‑31

---

## 1) Executive summary
- **Vision :** une interface locale, rapide et sobre pour piloter plusieurs IA sans navigateur, avec gestion sécurisée des clés et des « projets » orientés usage.
- **Décisions clés :**
  - Base **Tauri v2** (runtime WRY + WebKitGTK) + **React/TS** (Vite).
  - **Clés API locales** : d’abord `keyring`, sinon fichier **chiffré** (XChaCha20‑Poly1305 + HKDF) dans `~/.config/BatouLab/keys/`.
  - **Distribution** : binaire + **tarball signé GPG** avant tout packaging natif.
- **État v0.1 (α)** :
  - Projet compilable et exécutable (`npm run tauri dev`).
  - **Écran Clés API** : saisie → test distant → sauvegarde/suppression + **statut provider**.
  - **Chat minimal** relié au backend Rust : **Mistral OK** (clé valide), OpenAI **désactivé** pour l’instant.
  - Repo GitHub en place ; branches **alpha** et **beta** créées (main volontairement vide).

---

## 2) Travaux accomplis (synthèse)
**Environnement & dépendances**  
- Installation des paquets Debian (build, WebKitGTK 4.0 + 4.1, GTK3/4, libadwaita).  
- Rust via **rustup** (1.89.0) ; Node 22 + Vite.  
- Résolution de conflits apt/npm, et des erreurs de port Vite (`1420`).

**Initialisation app**  
- Création du squelette `create-tauri-app` (template react‑ts).  
- Ajout de **src/components/ApiKeysPage.tsx** et **ChatLite.tsx**.

**Backend Rust (Tauri v2)**  
- `keys.rs` : stockage clé provider `openai|mistral`, `keyring` fallback → fichier chiffré (**XChaCha20‑Poly1305** via `chacha20poly1305`), **HKDF** pour dériver la clé, permissions strictes.  
- `main.rs` : commandes exposées `validate_api_key`, `save_api_key`, `remove_api_key`, `refresh_provider_status`, `emit_current_status`, **`chat_complete`**.  
- Migration **v2** (trait `Emitter`, `app.emit`), nettoyage **Cargo.toml** (doublons `serde`, features crypto).

**Frontend React**  
- Passage aux imports Tauri v2 : `@tauri-apps/api/core` (invoke) et `@tauri-apps/api/event` (listen).  
- Page **Clés API** : test live, statut vert/rouge.  
- **ChatLite** : envoi d’un tableau `messages[]` (role/content), sélection provider/modèle basique.

**Intégration Mistral**  
- Vérif HTTP via `curl` (modèles, 401/403).  
- Backend `reqwest` avec `.bearer_auth(key)` + JSON unifié `/v1/chat/completions`.

**Dépôt GitHub**  
- Création et **push** initial.  
- Branches **alpha** (travail en cours) et **beta** (pré‑stabilisation).  
- `main` laissé vide pour tagger quand v1.0 sera prête.

---

## 3) Architecture actuelle
```
┌───────────────────────── Desktop (Tauri v2) ─────────────────────────┐
│ React + Vite + TypeScript (UI)                                       │
│  • Pages : ApiKeysPage, ChatLite                                     │
│  • @tauri-apps/api : core (invoke), event (listen)                   │
│                                                                       │
│ Rust (src-tauri)                                                      │
│  • Commands :                                                         │
│    validate_api_key, save_api_key, remove_api_key,                    │
│    refresh_provider_status, emit_current_status, chat_complete        │
│  • keys.rs : stockage & chiffrement des clés, validation distante     │
│                                                                       │
│ Réseau : Reqwest (JSON, TLS) → POST /v1/chat/completions              │
└──────────────────────────────────────────────────────────────────────┘
```
**Arborescence utile**
```
batoulab-app/
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

## 4) État actuel — ce qui fonctionne / ce qui reste
**Fonctionne**
- Lancement dev : `npm run tauri dev` (fenêtre Tauri OK).  
- **Clés API** Mistral : test, enregistrement/suppression, statut UI.  
- **Chat minimal** : envoi de `messages[]` vers `chat_complete` → **Mistral répond** (selon modèle et quota).

**À surveiller / à compléter**
- OpenAI : commande prête mais **désactivée** côté UI ; activer après v0.1.  
- UX : pas encore de navigation « 3 modes », ni de thème de marque.  
- Résilience réseau : pas de retry/backoff ni de messages d’erreur enrichis.  
- Pas de **streaming** token‑par‑token, ni **historique** des chats.

---

## 5) Sécurité & stockage des clés
- Priorité : **keyring** système (Linux Secret Service, etc.).  
- Fallback : fichier chiffré dans `~/.config/BatouLab/keys/` avec KEK local `~/.config/BatouLab/keys/.kek` (chmod strict).  
- Aucune clé écrite dans les logs (vérifier en build release).  
- Prévoir rotation/flush et bouton « Oublier toutes les clés ».

---

## 6) Points techniques notables
- Crypto : utilisation de `chacha20poly1305` (XChaCha20‑Poly1305) sans feature exotique.  
- Tauri v2 : import `use tauri::Emitter;` et `app.emit(...)` (remplace `emit_all`).  
- HTTP : `reqwest` + `rustls` ; prévoir une **option build `native-tls`** pour environnements proxy/entreprise.

---

## 7) Roadmap (proposée)
### v0.2 — Packaging & UX de base
- [ ] **Tarball** Linux + **signature GPG**, script post‑install (création du dossier `~/.config/BatouLab`).
- [ ] **Sidebar + routing** (Chat / Clés / Modes).  
- [ ] **Thème** (palette, Montserrat, icône app).  
- [ ] Sélecteur **modèles** (Mistral/OpenAI) + presets.  
- [ ] **Messages d’erreur** lisibles (401/403/429/timeout) + timeout/retry minimal.  
- [ ] Option build **TLS** : `native-tls` vs `rustls` (feature flag).  
- [ ] README finalisé + notes réseau/TLS.

### v0.3 — Modes & données locales
- [ ] Squelettes **Coder / Movie Maker / Story Maker**.  
- [ ] **Historique** local chiffré (par projet + chat rapide).  
- [ ] Abstraction **Provider** (Mistral, OpenAI ; extensible).  
- [ ] Catalogue de **modèles** par provider (auto‑complétion).

### v0.4 — Expérience Chat
- [ ] **Streaming** SSE + annulation ; affichage token‑par‑token.  
- [ ] Politique **retry/backoff** + gestion 429.  
- [ ] Import/Export de **sessions** (JSON).

### v1.0 — Stabilisation
- [ ] **CI GitHub Actions** (build Linux/BSD) + artefacts **signés**.  
- [ ] **Docs** utilisateur & développeur.  
- [ ] Revue **sécurité** (crypto, permissions) + **licence** & **privacy**.  
- [ ] Tests E2E Linux/BSD ; budget mémoire/CPU documenté.

---

## 8) Reprendre le développement — mémo équipe
**Démarrer**
```bash
npm install
npm run tauri dev
```
Si Vite indique « Port 1420 is already in use », fermez l’instance précédente ou lancez :  
`npm run tauri dev -- --port 1421`

**Tester Mistral en CLI**
```bash
curl -sS https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $MISTRAL_API_KEY" | head
```

**Emplacements clés**
- Clés chiffrées : `~/.config/BatouLab/keys/`  
- KEK : `~/.config/BatouLab/keys/.kek`  
- Code clés/crypto : `src-tauri/src/keys.rs`  
- Commandes Tauri : `src-tauri/src/main.rs`

---

## 9) Risques & atténuations
- **TLS/Proxy** : prévoir build `native-tls` + doc réseau.  
- **Variations API provider** : messages d’erreur clairs, couche `Provider`.  
- **Keyring BSD** : fallback fichier + tests réels.  
- **Dépendances WebKit** : doc d’installation par OS.

---

## 10) Annexes (rappel)
**Commands Tauri exposées** : `validate_api_key`, `save_api_key`, `remove_api_key`, `refresh_provider_status`, `emit_current_status`, `chat_complete`.  
**Endpoints** : `POST /v1/chat/completions` (Mistral/OpenAI), Auth `Bearer <key>`.  
**Modèles Mistral typiques** : `mistral-small-latest`, `mistral-large-latest`, `codestral-2508` (code).

