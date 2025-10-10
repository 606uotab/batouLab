// @ts-nocheck
import React, { useState } from "react";
import { runtimeKeys } from "../runtimeKeys";

export default function ApiKeysPage() {
  const [openai, setOpenai] = useState(runtimeKeys.openai || "");
  const [anthropic, setAnthropic] = useState(runtimeKeys.anthropic || "");
  const [mistral, setMistral] = useState(runtimeKeys.mistral || "");

  return (
    <div className="apikeys-page">
    <h2>Clés API</h2>

    <div className="apikeys-grid">
    <label>
    <div>OpenAI</div>
    <input
    className="apikey-input"
    placeholder="sk-..."
    value={openai}
    onChange={(e) => {
      const v = e.target.value;
      setOpenai(v);
      runtimeKeys.openai = v.trim();
    }}
    />
    </label>

    <label>
    <div>Anthropic (Claude)</div>
    <input
    className="apikey-input"
    placeholder="clé Anthropic…"
    value={anthropic}
    onChange={(e) => {
      const v = e.target.value;
      setAnthropic(v);
      runtimeKeys.anthropic = v.trim();
    }}
    />
    </label>

    <label>
    <div>Mistral</div>
    <input
    className="apikey-input"
    placeholder="mistral-…"
    value={mistral}
    onChange={(e) => {
      const v = e.target.value;
      setMistral(v);
      runtimeKeys.mistral = v.trim();
    }}
    />
    </label>

    <div className="apikey-note">
    Les clés sont <strong>chargées en mémoire uniquement</strong> (aucune persistance).<br />
    Redémarrer l’app réinitialise ces champs.
    </div>
    </div>
    </div>
  );
}
