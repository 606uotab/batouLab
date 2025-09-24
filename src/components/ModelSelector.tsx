// @ts-nocheck
<<<<<<< HEAD
import React, { useEffect, useRef, useState } from "react";

type Meta = {
  id: string;
  label: string;
  short: string;
  long: string;
};

const MODELS: Record<string, Meta> = {
  "mistral-small-latest": { id:"mistral-small-latest", label:"mistral-small", short:"Généraliste rapide et éco. Contexte long.", long:"Modèle généraliste léger avec bonne latence et coûts réduits. Idéal pour UI réactive, assistants multiples et prototypage. Contexte étendu pour sa taille. Bon multilingue." },
  "mistral-medium-latest": { id:"mistral-medium-latest", label:"mistral-medium", short:"Généraliste premium. Raisonnement et code solides.", long:"Polyvalent haut niveau: planification, synthèse, tool calling et code. Convient aux usages pro et agents outillés. Meilleure robustesse que small, latence/coût supérieurs." },
  "magistral-medium-latest": { id:"magistral-medium-latest", label:"magistral-medium", short:"Reasoning intensif. Chaînes de pensée longues.", long:"Raisonnement avancé pour problèmes difficiles (contraintes, maths/logique). Améliore la fiabilité sur tâches complexes. Latence et coût supérieurs." },
  "codestral-latest": { id:"codestral-latest", label:"codestral", short:"Modèle code. Contexte long, FIM.", long:"Spécialisé développement: complétion, génération, FIM (insertion), création de tests, review et migrations. Contexte long utile pour gros fichiers." },
  "devstral-medium-latest": { id:"devstral-medium-latest", label:"devstral-medium", short:"Agents dev. Exploration/édition multi-fichiers.", long:"Optimisé pour agents logiciels: navigation dans codebases, refactors multi-fichiers, tool calling dans des workflows de dev. Latence/coût intermédiaires." },
  "pixtral-large-latest": { id:"pixtral-large-latest", label:"pixtral-large", short:"Vision avancée: images, documents, UI.", long:"Multimodal image→texte. Comprend des images, documents, graphiques et UI. Idéal pour captures d’écran, schémas, tableaux et docs scannés." },
  "mistral-ocr-latest": { id:"mistral-ocr-latest", label:"mistral-ocr", short:"OCR précis. Extraction texte+structure.", long:"OCR orienté compréhension documentaire: texte, tableaux, équations et médias, avec sortie ordonnée pour post-traitements (RAG, structuration)." },
  "mistral-moderation-latest": { id:"mistral-moderation-latest", label:"mistral-moderation", short:"Modération texte. Étiquettes/scores.", long:"Classifieur de sécurité pour filtrage d’entrées/sorties et journalisation. À utiliser comme garde-fou autour des autres modèles." },
  // autres
  "magistral-small-latest": { id:"magistral-small-latest", label:"magistral-small", short:"Reasoning léger. Coût/latence réduits.", long:"Version compacte de reasoning. Bon compromis pour assistants qui doivent raisonner sans budget élevé. Moins fiable que magistral-medium." },
  "devstral-small-latest": { id:"devstral-small-latest", label:"devstral-small", short:"Agents dev éco. Tool calling.", long:"Variante plus légère pour automatisations dev, Q&A code et petites éditions outillées. Moins performante que devstral-medium." },
  "mistral-large-latest": { id:"mistral-large-latest", label:"mistral-large", short:"Alias compat. Souvent pointe Medium récent.", long:"Entrée héritée pour projets existants; redirige fréquemment vers la génération Medium la plus récente. À garder pour compatibilité." },
  "ministral-8b-latest": { id:"ministral-8b-latest", label:"ministral-8b", short:"Edge 8B. Déploiements embarqués.", long:"Modèle local/embarqué plus capable. Utile hors-ligne ou contraintes fortes de données. Qualité inférieure aux Small/Medium cloud." },
  "ministral-3b-latest": { id:"ministral-3b-latest", label:"ministral-3b", short:"Edge 3B. Très léger.", long:"Ultra-compact pour appareils ou serveurs modestes. Très bonne latence. Moins performant sur tâches complexes." },
  "voxtral-small-latest": { id:"voxtral-small-latest", label:"voxtral-small", short:"Audio-instruct. Commandes vocales.", long:"Prend l’audio en entrée pour commandes/question. Prévoir segmentation/VAD côté app et gestion des durées. Pour dictée et contrôle vocal." },
  "voxtral-mini-latest": { id:"voxtral-mini-latest", label:"voxtral-mini", short:"ASR rapide. Transcription.", long:"Transcription audio→texte focalisée sur la vitesse. Idéale temps réel, moins précise que voxtral-small." },
  "open-mistral-nemo": { id:"open-mistral-nemo", label:"open-mistral-nemo", short:"Modèle ouvert multilingue.", long:"Open-weights multilingue; bon pour coûts maîtrisés et intégrations personnalisées. Moins performant que Medium sur tâches difficiles." },
  "mistral-saba-latest": { id:"mistral-saba-latest", label:"mistral-saba", short:"Optimisé Moyen-Orient/Asie du Sud.", long:"Optimisé pour certaines langues/régions. Utile pour contenu localisé. Non spécialisé vision/code." }
};

const PRIMARY = [
  "mistral-small-latest",
  "mistral-medium-latest",
  "magistral-medium-latest",
  "codestral-latest",
  "devstral-medium-latest",
  "pixtral-large-latest",
  "mistral-ocr-latest",
  "mistral-moderation-latest",
];

const OTHERS = [
  "magistral-small-latest",
  "devstral-small-latest",
  "mistral-large-latest",
  "ministral-8b-latest",
  "ministral-3b-latest",
  "voxtral-small-latest",
  "voxtral-mini-latest",
  "open-mistral-nemo",
  "mistral-saba-latest",
];

export default function ModelSelector({
  activeModel,
  onPick,
}: {
  activeModel: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [popId, setPopId] = useState<string | null>(null);
  const [popLeft, setPopLeft] = useState<number>(360); // px
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);
  const fadeTimer = useRef<number | null>(null);

  // Fermer menus au clic dehors
  useEffect(() => {
    function onDocClick(e: MouseEvent){
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setOthersOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent){
      if (e.key === "Escape") { setOpen(false); setOthersOpen(false); hideNow(); }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function labelFor(id: string){
    const m = MODELS[id]; return m ? m.label : id.replace(/-latest$/, "");
  }

  function pick(id: string){
    onPick(id);
    setPopId(id);
    setOpen(false);
    setOthersOpen(false);
    recalcPopLeft();
  }

  // Bulle: auto-hide 15s sauf hover; à la sortie, fade 1s
  useEffect(() => {
    clearTimers();
    if (popId){
      // @ts-ignore
      hideTimer.current = window.setTimeout(() => fadeOutThenHide(1000), 15000);
      recalcPopLeft();
    }
    return clearTimers;
  }, [popId]);

  useEffect(() => {
    function onResize(){ if (popId) recalcPopLeft(); }
    window.addEventListener("resize", onResize);
    // recalcule sur transition de la sidebar
    const sb = document.querySelector("aside.sidebar");
    function onTr(e: any){ if (e.propertyName === "width" && popId) recalcPopLeft(); }
    sb?.addEventListener("transitionend", onTr);
    return () => {
      window.removeEventListener("resize", onResize);
      sb?.removeEventListener("transitionend", onTr);
    };
  }, [popId]);

  function recalcPopLeft(){
    const sb = document.querySelector("aside.sidebar") as HTMLElement | null;
    const w = sb ? sb.getBoundingClientRect().width : 0;
    const next = Math.max(16, Math.round(w + 16));
    setPopLeft(next);
  }

  function clearTimers(){
    if (hideTimer.current){ clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (fadeTimer.current){ clearTimeout(fadeTimer.current); fadeTimer.current = null; }
  }

  function hideNow(){ clearTimers(); setPopId(null); }

  function fadeOutThenHide(delayMs: number){
    const el = popRef.current; if (!el) { hideNow(); return; }
    el.classList.add("fade-out");
    // @ts-ignore
    fadeTimer.current = window.setTimeout(() => { hideNow(); el.classList.remove("fade-out"); }, delayMs);
  }

  const renderList = (ids: string[]) => (
    <div className="models-scroll">
      {ids.map((id) => {
        const m = MODELS[id];
        const isActive = activeModel === id;
        return (
          <button
            key={id}
            className={`model-pill ${isActive ? "active" : ""}`}
            title={m.short}
            onClick={() => pick(id)}
          >
            <span className="pill-name">{m.label}</span>
            {isActive && <span className="pill-badge">actif</span>}
          </button>
        );
      })}
    </div>
  );

  const current = popId ? MODELS[popId] : null;

  return (
    <div className="models-wrap" ref={wrapRef}>
      <button className="model-toggle" onClick={() => setOpen(v => !v)}>
        <span>Modèle</span>
        <span className="current">{labelFor(activeModel)}</span>
        <span className="chev">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="model-menu" role="menu">
          {renderList(PRIMARY)}
          <button className="others-toggle" onClick={() => setOthersOpen(v => !v)}>
            Autres modèles <span className="chev">{othersOpen ? "▴" : "▾"}</span>
          </button>

          {othersOpen && (
            <div className="others-panel">
              {renderList(OTHERS)}
              <div className="others-actions">
                <button className="linkbtn small" onClick={() => setOthersOpen(false)}>Fermer</button>
              </div>
            </div>
          )}
        </div>
      )}

      {current && (
        <div
          className="model-pop"
          ref={popRef}
          style={{ left: `${popLeft}px` }}
          onMouseEnter={() => { clearTimers(); }}
          onMouseLeave={() => { fadeOutThenHide(1000); }}
        >
          <div className="model-pop-title">{current.label}</div>
          <div className="model-pop-body">{current.long}</div>
          <div className="model-pop-actions">
            <button className="linkbtn" onClick={() => hideNow()}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

=======
import React from "react";

type Meta = { id:string; label:string; short:string; long:string };

const MODELS: Record<string, Meta> = {
  // --- OpenAI ---
  "gpt-5":               { id:"gpt-5",               label:"gpt-5",               short:"Généraliste haut niveau.", long:"GPT-5: modèle généraliste hautes capacités. Bon pour tâches complexes, génération et analyse." },
  "gpt-5-mini":          { id:"gpt-5-mini",          label:"gpt-5-mini",          short:"Rapide, coût réduit.",     long:"GPT-5 mini: latence faible et coût réduit. Bons résumés et assistants interactifs." },
  "gpt-5-nano":          { id:"gpt-5-nano",          label:"gpt-5-nano",          short:"Ultra-éco.",               long:"GPT-5 nano: maximum d’économie. Petites tâches et orchestrations simples." },
  "gpt-4.1":             { id:"gpt-4.1",             label:"gpt-4.1",             short:"Solide polyvalent.",       long:"GPT-4.1: base polyvalente stable pour conversations et code standard." },
  "o3-deep-research":    { id:"o3-deep-research",    label:"o3-deep-research",    short:"Recherche approfondie.",   long:"o3 deep-research: investigations longues via Responses API (chaînes de raisonnement)." },
  "o4-mini-deep-research":{id:"o4-mini-deep-research",label:"o4-mini-deep-research",short:"Recherche rapide.",       long:"o4 mini deep-research: variante plus rapide/éco pour recherches automatiques." },
  "gpt-oss-120b":        { id:"gpt-oss-120b",        label:"gpt-oss-120b",        short:"OSS grand modèle.",        long:"OSS 120B: grand modèle open-source (via endpoint OpenAI) pour comparaisons." },
  "gpt-oss-20b":         { id:"gpt-oss-20b",         label:"gpt-oss-20b",         short:"OSS moyen.",               long:"OSS 20B: alternatif open-source, coût/latence faibles." },
  "computer-use-preview":{ id:"computer-use-preview", label:"computer-use",       short:"Contrôle d’apps.",         long:"Computer-use: pilotage d’applications. Nécessite Responses API et droits spéciaux." },

  // --- Anthropic (Claude) ---
  "claude-opus-4-1-20250805": { id:"claude-opus-4-1-20250805", label:"claude-opus-4.1", short:"Max qualité.", long:"Claude Opus 4.1: meilleur raisonnement et rédaction longue." },
  "claude-sonnet-4-20250514": { id:"claude-sonnet-4-20250514", label:"claude-sonnet-4", short:"Équilibre.",   long:"Claude Sonnet 4: équilibre qualité/latence." },
  "claude-3-5-haiku-latest":  { id:"claude-3-5-haiku-latest",  label:"claude-haiku-3.5", short:"Rapide & éco.", long:"Claude 3.5 Haiku: très réactif et économique. Bon pour UX et tool-use." },

  // --- Mistral ---
  "mistral-small-latest":  { id:"mistral-small-latest",  label:"mistral-small",  short:"Rapide & éco.", long:"Généraliste léger. Bonne latence/coût. Contexte long pour sa taille." },
  "mistral-medium-latest": { id:"mistral-medium-latest", label:"mistral-medium", short:"Polyvalent.",    long:"Meilleur compromis mistral pour tâches variées." },
  "codestral":             { id:"codestral",             label:"codestral",       short:"Code-centric.",  long:"Spécialisé code, complétion et explication." }
};

type Props = { activeModel:string; onPick:(id:string)=>void };

export default function ModelSelector({activeModel, onPick}:Props){
  const keys = Object.keys(MODELS);
  const current = MODELS[activeModel] ?? MODELS["mistral-small-latest"];
  return (
    <div>
      <label className="small muted">Modèle</label>
      <select
        value={current.id}
        onChange={(e)=>onPick(e.target.value)}
        title={current.short}
        style={{width:"100%"}}
      >
        <optgroup label="OpenAI">
          {["gpt-5","gpt-5-mini","gpt-5-nano","gpt-4.1","o3-deep-research","o4-mini-deep-research","gpt-oss-120b","gpt-oss-20b","computer-use-preview"]
            .filter(id=>MODELS[id])
            .map(id=> <option key={id} value={id} title={MODELS[id].short}>{MODELS[id].label}</option>)}
        </optgroup>
        <optgroup label="Anthropic (Claude)">
          {["claude-opus-4-1-20250805","claude-sonnet-4-20250514","claude-3-5-haiku-latest"]
            .map(id=> <option key={id} value={id} title={MODELS[id].short}>{MODELS[id].label}</option>)}
        </optgroup>
        <optgroup label="Mistral">
          {["mistral-small-latest","mistral-medium-latest","codestral"]
            .map(id=> <option key={id} value={id} title={MODELS[id].short}>{MODELS[id].label}</option>)}
        </optgroup>
      </select>
      <div className="small muted" style={{marginTop:6}}>{current.long}</div>
    </div>
  );
}
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
