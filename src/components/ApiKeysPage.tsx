// @ts-nocheck
import React, { useState } from "react";
import { runtimeKeys } from "../runtimeKeys";

export default function ApiKeysPage() {
  const [openai, setOpenai] = useState(runtimeKeys.openai || "");
  const [anthropic, setAnthropic] = useState(runtimeKeys.anthropic || "");
  const [mistral, setMistral] = useState(runtimeKeys.mistral || "");

  const on = (k: "openai" | "anthropic" | "mistral", v: string) => {
    if (k === "openai") { setOpenai(v); runtimeKeys.openai = v; }
    if (k === "anthropic") { setAnthropic(v); runtimeKeys.anthropic = v; }
    if (k === "mistral") { setMistral(v); runtimeKeys.mistral = v; }
  };

  return (
    <div className="api-page">
    <h1 className="api-title">Clés API</h1>

    <div className="api-field">
    <label className="api-label">OpenAI</label>
    <input
    type="text"
    className="api-input"
    placeholder="sk-..."
    value={openai}
    onChange={(e) => on("openai", e.target.value)}
    />
    </div>

    <div className="api-field">
    <label className="api-label">Anthropic (Claude)</label>
    <input
    type="text"
    className="api-input"
    placeholder="clé Anthropic…"
    value={anthropic}
    onChange={(e) => on("anthropic", e.target.value)}
    />
    </div>

    <div className="api-field">
    <label className="api-label">Mistral</label>
    <input
    type="text"
    className="api-input"
    placeholder="mistral-..."
    value={mistral}
    onChange={(e) => on("mistral", e.target.value)}
    />
    </div>
    </div>
  );
}
