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
