import React from "react";

type Meta = { id: string; label: string; short: string; long: string };

const MODELS: Record<string, Meta> = {
  // --- OpenAI ---
  "gpt-5":               { id:"gpt-5",               label:"gpt-5",               short:"Généraliste haut niveau.", long:"GPT-5 : très bonnes capacités généralistes pour tâches complexes." },
  "gpt-5-mini":          { id:"gpt-5-mini",          label:"gpt-5-mini",          short:"Rapide, éco.",             long:"Latence faible et coût réduit. Idéal pour assistants interactifs." },
  "gpt-4.1":             { id:"gpt-4.1",             label:"gpt-4.1",             short:"Polyvalent stable.",       long:"Base polyvalente pour conversation et code standard." },

  // --- Anthropic (Claude) ---
  "claude-opus-4-1-20250805": { id:"claude-opus-4-1-20250805", label:"claude-opus-4.1", short:"Max qualité.", long:"Meilleur raisonnement et rédaction longue." },
  "claude-sonnet-4-20250514": { id:"claude-sonnet-4-20250514", label:"claude-sonnet-4", short:"Équilibre.",   long:"Excellent compromis qualité/latence." },
  "claude-3-5-haiku-latest":  { id:"claude-3-5-haiku-latest",  label:"claude-haiku-3.5", short:"Très réactif.", long:"Rapide et économique. Bon pour UX et tool-use." },

  // --- Mistral (liste étendue) ---
  "mistral-small-latest":   { id:"mistral-small-latest",   label:"mistral-small",   short:"Rapide, éco.",                       long:"Généraliste léger, bonne latence/coût, contexte long pour sa taille." },
  "mistral-medium-latest":  { id:"mistral-medium-latest",  label:"mistral-medium",  short:"Polyvalent premium.",                 long:"Planification, synthèse, tool calling et code. Plus robuste que small." },
  "magistral-medium-latest":{ id:"magistral-medium-latest",label:"magistral-medium",short:"Reasoning intensif.",                 long:"Meilleure fiabilité sur tâches complexes; latence/coût supérieurs." },
  "codestral-latest":       { id:"codestral-latest",       label:"codestral",       short:"Spécialiste code.",                   long:"Complétion/génération, FIM, tests/reviews. Contexte long." },
  "devstral-medium-latest": { id:"devstral-medium-latest", label:"devstral-medium", short:"Agents dev multi-fichiers.",          long:"Optimisé agents logiciels et refactors multi-fichiers." },
  "pixtral-large-latest":   { id:"pixtral-large-latest",   label:"pixtral-large",   short:"Vision avancée.",                     long:"Compréhension d’images, documents, UI, schémas, tableaux." },
  "mistral-ocr-latest":     { id:"mistral-ocr-latest",     label:"mistral-ocr",     short:"OCR précis.",                         long:"Extraction texte + structure pour docs/tables/équations." },
  "mistral-moderation-latest": { id:"mistral-moderation-latest", label:"mistral-moderation", short:"Modération.", long:"Classifieur sécurité pour filtrage I/O et journalisation." },
  "magistral-small-latest": { id:"magistral-small-latest", label:"magistral-small", short:"Reasoning léger.",                    long:"Compromis pour assistants qui doivent raisonner à moindre coût." },
  "devstral-small-latest":  { id:"devstral-small-latest",  label:"devstral-small",  short:"Agents dev éco.",                     long:"Automatisations dev, Q&A code, petites éditions outillées." },
  "mistral-large-latest":   { id:"mistral-large-latest",   label:"mistral-large",   short:"Alias compat.",                       long:"Souvent redirigé vers Medium récent; garder pour compatibilité." },
  "ministral-8b-latest":    { id:"ministral-8b-latest",    label:"ministral-8b",    short:"Edge 8B.",                            long:"Déploiements embarqués/hors-ligne. Qualité < Small/Medium cloud." },
  "ministral-3b-latest":    { id:"ministral-3b-latest",    label:"ministral-3b",    short:"Edge 3B très léger.",                 long:"Ultra-compact, très bonne latence, moins bon sur tâches complexes." },
  "voxtral-small-latest":   { id:"voxtral-small-latest",   label:"voxtral-small",   short:"Audio-instruct.",                     long:"Commandes vocales/dictée (prévoir VAD/segmentation côté app)." },
  "voxtral-mini-latest":    { id:"voxtral-mini-latest",    label:"voxtral-mini",    short:"ASR rapide.",                         long:"Transcription temps réel; moins précis que voxtral-small." },
  "open-mistral-nemo":      { id:"open-mistral-nemo",      label:"open-mistral-nemo", short:"Modèle ouvert.",                    long:"Open-weights multilingue; coûts maîtrisés, intégrations perso." },
  "mistral-saba-latest":    { id:"mistral-saba-latest",    label:"mistral-saba",    short:"Optimisé régions.",                   long:"Optimisé pour certaines langues/régions. Non spécialisé vision/code." },
};

const GROUPS: { label: string; ids: string[] }[] = [
  { label: "OpenAI", ids: ["gpt-5", "gpt-5-mini", "gpt-4.1"] },
{ label: "Anthropic (Claude)", ids: ["claude-opus-4-1-20250805", "claude-sonnet-4-20250514", "claude-3-5-haiku-latest"] },
{ label: "Mistral — principaux", ids: ["mistral-small-latest","mistral-medium-latest","magistral-medium-latest","codestral-latest","devstral-medium-latest","pixtral-large-latest","mistral-ocr-latest","mistral-moderation-latest"] },
{ label: "Mistral — autres", ids: ["magistral-small-latest","devstral-small-latest","mistral-large-latest","ministral-8b-latest","ministral-3b-latest","voxtral-small-latest","voxtral-mini-latest","open-mistral-nemo","mistral-saba-latest"] },
];

type Props = { activeModel: string; onPick: (id: string) => void };

export default function ModelSelector({ activeModel, onPick }: Props) {
  const current = MODELS[activeModel] ?? MODELS["mistral-small-latest"];
  return (
    <div>
    <label className="small muted">Modèle</label>
    <select
    value={current.id}
    onChange={(e) => onPick(e.target.value)}
    title={current.short}
    style={{ width: "100%" }}
    >
    {GROUPS.map((g) => (
      <optgroup key={g.label} label={g.label}>
      {g.ids.filter((id) => id in MODELS).map((id) => (
        <option key={id} value={id} title={MODELS[id].short}>
        {MODELS[id].label}
        </option>
      ))}
      </optgroup>
    ))}
    </select>
    <div className="small muted" style={{ marginTop: 6 }}>{current.long}</div>
    </div>
  );
}
