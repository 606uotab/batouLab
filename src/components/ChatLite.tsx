import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export default function ChatLite() {
  const [model, setModel] = useState("mistral-small-latest");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "system", content: "Tu es BatouLab, assistant concis et utile." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...msgs, { role: "user", content: input.trim() } as Msg];
    setMsgs(next); setInput(""); setErr(null); setLoading(true);
    try {
      const reply = await invoke<string>("chat_complete", {
        input: { provider: "mistral", model, messages: next },
      });
      setMsgs([...next, { role: "assistant", content: reply } as Msg]);
    } catch (e: any) {
      setErr(String(e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <b>Mistral</b> · modèle:{" "}
        <input value={model} onChange={(e)=>setModel(e.target.value)} style={{ width: 260 }} />
      </div>
      <textarea readOnly rows={18} style={{ width: "100%", marginBottom: 8 }}
        value={msgs.map(m => `${m.role}: ${m.content}`).join("\n\n")} />
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Écris ton message..."
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==="Enter") send(); }}
          style={{ flex: 1 }}
        />
        <button onClick={send} disabled={loading}>Envoyer</button>
      </div>
      {err && <div style={{ color: "crimson", marginTop: 8 }}>Erreur: {err}</div>}
      <div style={{ marginTop: 6, color: "#666" }}>
        Astuce modèles Mistral: <code>mistral-small-latest</code>, <code>mistral-large-latest</code>, <code>codestral-2508</code>…
      </div>
    </div>
  );
}
