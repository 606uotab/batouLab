# 🧩 batouLab — Version v0.0.4 (alpha)

**Date de publication :** 11 octobre 2025  
**Branche :** `alpha`  
**Tag :** `v0.0.4`

---

## ✨ Nouveautés
- Refonte graphique complète (cohérence blanc / gris / halo doux)
- Sélecteur de modèles corrigé :
  - fond blanc, sélection grise
  - flèche de dropdown rétablie
- Sidebar et topbar harmonisées (gris clair unifié)
- Zone de saisie (“composer”) simplifiée et lisible
- Intégration de version visible dans la top-bar
- Navigation fluide entre conversations et archives

---

## 🧠 Comportement corrigé
- Rafraîchissement dynamique des messages (plus besoin de recharger)
- Sauvegarde de l’état du modèle par conversation
- Fix du problème de clé API manquante
- Correction du hover bleu → halo gris sur tous les boutons
- Export / import / archivage 100 % fonctionnel


> _batouLab v0.0.4 — Agrégateur et orchestrateur de modèles IA_


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


# batouLab V0.0.3 — alpha — 2025-09-23T19:19:46+0200

## Changement de stratégie
Le « coffre-fort » local est **abandonné pour l’instant**. Mise en œuvre fiable et audits jugés trop coûteux en temps à ce stade.
Les **clés API restent sous la responsabilité de l’utilisateur** et **ne sont pas persistées** par l’application.

## Features
- **Architecture multi-fournisseurs**
  Providers séparés: `src-tauri/src/providers/{mistral.rs, anthropic.rs, openai.rs}`. Ajout/maintenance simplifiés.
- **Anthropic (Claude)**
  Support: **Opus 4.1**, **Sonnet 4**, **Claude 3.5 Haiku**.
- **Mistral**
  Stack existante conservée (small/medium/codestral).
- **Sélecteur de modèles**
  Info-bulle concise + description détaillée à la sélection.
- **Onglet “Clés API” simplifié**
  Trois champs clairs (OpenAI, Anthropic, Mistral). Affichage direct. Pas de stockage.
- **UX Chat**
  Composer fixe en bas, zone messages scrollable type ChatGPT.
  Entrée = nouvelle ligne ; Entrée×2 rapide ou Alt+Entrée = envoyer.
  Textarea auto-redimensionnée.

## Correctifs
- Nettoyage du code “export” (supprimé).
- Styles: pas de scrollbar globale quand l’écran est vide; layout 100vh robuste.

## Problèmes connus
- **OpenAI GPT-5**: non priorisé dans cette alpha; routage Responses/Chat encore sujet à variations côté fournisseur.
- Les clés API sont **éphémères** (mémoire processus), à ressaisir au redémarrage.

---
# batouLab 0.0.2 — 2025-09-06T23:57:17+02:00

Type: alpha

Changements:
- UI: sélecteur unique “Modèle” en overlay + “Autres modèles” en sous-fenêtre.
- Bulle explicative déplacée en haut-gauche, halo au survol, auto-hide 15s, fade 1s.
- Entrée×2 pour envoyer, Alt+Entrée conservé.
- Marque en-tête: "batouLab 0.0.2".

Historique:
- 0.0.1: base initiale.
