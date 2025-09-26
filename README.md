# BatouLab

> **Version actuelle : v0.0.3.b (alpha)**

## 🚀 Description
BatouLab est une application desktop basée sur **Tauri + React + Rust** qui permet de dialoguer avec plusieurs fournisseurs d’IA :
- **Mistral**
- **OpenAI**
- **Anthropic (Claude)**

### Fonctionnalités principales
- Interface de chat moderne avec historique sauvegardé
- Sélection dynamique de modèles (GPT-4/5, Claude Opus/Sonnet, Mistral Small/Medium/etc.)
- Gestion des clés API via l’onglet **API Keys**
- Sidebar d’historique avec export des conversations
- Interface soignée et responsive

---

## 🛠️ Installation

### Prérequis
- **Node.js** ≥ 18
- **Rust** + toolchain (cargo)
- **Tauri CLI**

### Cloner le repo
```bash
git clone https://github.com/606uotab/batouLab.git
cd batouLab

Installer les dépendances

npm install

Lancer en mode développement

npm run tauri dev

Build release (binaire)

npm run tauri build

🔑 Configuration

Dans l’onglet API, renseignez vos clés personnelles :

    sk-... → OpenAI

    mistral-... → Mistral

    claude-... → Anthropic

Ces clés sont stockées en mémoire (runtime) uniquement pour la session.
📌 Notes de version

Voir VERSION.md
📜 Licence

Projet open-source (MIT).


---

### ✅ Mise à jour de `VERSION.md`

```markdown
# Historique des versions

## v0.0.3.b (alpha) – 2025-09-25
- Première version stable **multi-providers** :
  - Support Mistral, OpenAI et Anthropic (Claude)
  - Sélecteur de modèles intégré
  - Saisie et gestion des clés API
- Nouvelle UI pour le chat :
  - Sidebar avec historique et export TXT
  - Messages avec timestamps
  - Composer amélioré (double Entrée / Alt+Entrée pour envoyer)
- Nettoyage et restructuration du code Rust (providers séparés)
- Ajout du système de **tags Git** et publication GitHub

👉 Tu veux que je génère ces deux fichiers (README.md et VERSION.md) prêts à être ajoutés et commités dans ton repo, ou bien tu préfères copier/coller manuellement ?
Vous avez dit :
Manuellement 
ChatGPT a dit :

Parfait 👍

Alors tu peux simplement :

    Ouvrir README.md et remplacer son contenu par :

# BatouLab

> **Version actuelle : v0.0.3.b (alpha)**

## 🚀 Description
BatouLab est une application desktop basée sur **Tauri + React + Rust** qui permet de dialoguer avec plusieurs fournisseurs d’IA :
- **Mistral**
- **OpenAI**
- **Anthropic (Claude)**

### Fonctionnalités principales
- Interface de chat moderne avec historique sauvegardé
- Sélection dynamique de modèles (GPT-4/5, Claude Opus/Sonnet, Mistral Small/Medium/etc.)
- Gestion des clés API via l’onglet **API Keys**
- Sidebar d’historique avec export des conversations
- Interface soignée et responsive

---

## 🛠️ Installation

### Prérequis
- **Node.js** ≥ 18
- **Rust** + toolchain (cargo)
- **Tauri CLI**

### Cloner le repo
```bash
git clone https://github.com/606uotab/batouLab.git
cd batouLab

Installer les dépendances

npm install

Lancer en mode développement

npm run tauri dev

Build release (binaire)

npm run tauri build

🔑 Configuration

Dans l’onglet API, renseignez vos clés personnelles :

    sk-... → OpenAI

    mistral-... → Mistral

    claude-... → Anthropic

Ces clés sont stockées en mémoire (runtime) uniquement pour la session.
📌 Notes de version

Voir VERSION.md
