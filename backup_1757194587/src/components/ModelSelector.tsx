// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";

type Meta = {
  id: string;
  label: string;
  short: string;
  long: string;
};

const MODELS: Record<string, Meta> = {
  "mistral-small-latest": {
    id: "mistral-small-latest",
    label: "mistral-small",
    short: "Généraliste rapide et éco. Contexte long.",
    long: "Modèle généraliste léger avec bonne latence et coûts réduits. Idéal pour UI réactive, assistants multiples et prototypage. Contexte étendu pour sa taille. Bon multilingue."
  },
  "mistral-medium-latest": {
    id: "mistral-medium-latest",
    label: "mistral-medium",
    short: "Généraliste premium. Raisonnement et code solides.",
    long: "Polyvalent haut niveau: planification, synthèse, tool calling et code. Convient aux usages pro et agents outillés. Meilleure robustesse que small, latence/coût supérieurs."
  },
  "magistral-medium-latest": {
    id: "magistral-medium-latest",
    label: "magistral-medium",
    short: "Reasoning intensif. Chaînes de pensée longues.",
    long: "Raisonnement avancé pour problèmes difficiles (contraintes, maths/logique). Améliore la fiabilité sur tâches complexes. Latence et coût supérieurs."
  },
  "codestral-latest": {
    id: "codestral-latest",
    label: "codestral",
    short: "Modèle code. Contexte long, FIM.",
    long: "Spécialisé développement: complétion, génération, FIM (insertion), création de tests, review et migrations. Contexte long utile pour gros fichiers."
  },
  "devstral-medium-latest": {
    id: "devstral-medium-latest",
    label: "devstral-medium",
    short: "Agents dev. Exploration/édition multi-fichiers.",
    long: "Optimisé pour agents logiciels: navigation dans codebases, refactors multi-fichiers, tool calling dans des workflows de dev. Latence/coût intermédiaires."
  },
  "pixtral-large-latest": {
    id: "pixtral-large-latest",
    label: "pixtral-large",
    short: "Vision avancée: images, documents, UI.",
    long: "Multimodal image→texte. Comprend des images, documents, graphiques et UI. Idéal pour captures d’écran, schémas, tableaux et docs scannés."
  },
  "mistral-ocr-latest": {
    id: "mistral-ocr-latest",
    label: "mistral-ocr",
    short: "OCR précis. Extraction texte+structure.",
    long: "OCR orienté compréhension documentaire: texte, tableaux, équations et médias, avec sortie ordonnée pour post-traitements (RAG, structuration)."
  },
  "mistral-moderation-latest": {
    id: "mistral-moderation-latest",
    label: "mistral-moderation",
    short: "Modération texte. Étiquettes/scores.",
    long: "Classifieur de sécurité pour filtrage d’entrées/sorties et journalisation. À utiliser comme garde-fou autour des autres modèles."
  },
  // Autres modèles
  "magistral-small-latest": {
    id: "magistral-small-latest",
    label: "magistral-small",
    short: "Reasoning léger. Coût/latence réduits.",
    long: "Version compacte de reasoning. Bon compromis pour assistants qui doivent raisonner sans budget élevé. Moins fiable que magistral-medium."
  },
  "devstral-small-latest": {
    id: "devstral-small-latest",
    label: "devstral-small",
    short: "Agents dev éco. Tool calling.",
    long: "Variante plus légère pour automatisations dev, Q&A code et petites éditions outillées. Moins performante que devstral-medium."
  },
  "mistral-large-latest": {
    id: "mistral-large-latest",
    label: "mistral-large",
    short: "Alias compat. Souvent pointe Medium récent.",
    long: "Entrée héritée pour projets existants; redirige fréquemment vers la génération Medium la plus récente. À garder pour compatibilité."
  },
  "ministral-8b-latest": {
    id: "ministral-8b-latest",
    label: "ministral-8b",
    short: "Edge 8B. Déploiements embarqués.",
    long: "Modèle local/embarqué plus capable. Utile hors-ligne ou contraintes fortes de données. Qualité inférieure aux Small/Medium cloud."
  },
  "ministral-3b-latest": {
    id: "ministral-3b-latest",
    label: "ministral-3b",
    short: "Edge 3B. Très léger.",
    long: "Ultra-compact pour appareils ou serveurs modestes. Très bonne latence. Moins performant sur tâches complexes."
  },
  "voxtral-small-latest": {
    id: "voxtral-small-latest",
    label: "voxtral-small",
    short: "Audio-instruct. Commandes vocales.",
    long: "Prend l’audio en entrée pour commandes/question. Prévoir segmentation/VAD côté app et gestion des durées. Pour dictée et contrôle vocal."
  },
  "voxtral-mini-latest": {
    id: "voxtral-mini-latest",
    label: "voxtral-mini",
    short: "ASR rapide. Transcription.",
    long: "Transcription audio→texte focalisée sur la vitesse. Idéale temps réel, moins précise que voxtral-small."
  },
  "open-mistral-nemo": {
    id: "open-mistral-nemo",
    label: "open-mistral-nemo",
    short: "Modèle ouvert multilingue.",
    long: "Open-weights multilingue; bon pour coûts maîtrisés et intégrations personnalisées. Moins performant que Medium sur tâches difficiles."
  },
  "mistral-saba-latest": {
    id: "mistral-saba-latest",
    label: "mistral-saba",
    short: "Optimisé Moyen-Orient/Asie du Sud.",
    long: "Optimisé pour certaines langues/régions. Utile pour contenu localisé. Non spécialisé vision/code."
  }
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
  const [open, setOpen] = useState(false);        // fenêtre déroulante "Modèle"
  const [othersOpen, setOthersOpen] = useState(false); // sous-fenêtre "Autres modèles"
  const [popId, setPopId] = useState<string | null>(null); // bulle explicative
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
  }

  // Bulle: auto-hide après 15s sauf si hover; à la sortie, fade 1s
  useEffect(() => {
    clearTimers();
    if (popId){
      // 15s auto-hide
      // @ts-ignore
      hideTimer.current = window.setTimeout(() => fadeOutThenHide(1000), 15000);
    }
    return clearTimers;
  }, [popId]);

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

