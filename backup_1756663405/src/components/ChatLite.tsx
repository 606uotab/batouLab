import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Session = {
  id: string;
  title: string;
  provider: "mistral";
  model: string;
  messages: Msg[];
  updatedAt: number;
};

const STORAGE_KEY = "bl_history_v1";

const MISTRAL_MODELS = [
  { id: "mistral-small-latest",  label: "mistral-small-latest",  desc: "Petit, généraliste, contexte 128k." },
  { id: "mistral-medium-latest", label: "mistral-medium-latest", desc: "Medium 3.x multimodal, 128k, bon par défaut." },
  { id: "mistral-large-latest",  label: "mistral-large-latest",  desc: "Alias compatible, pointe vers la version large courante." },
  { id: "codestral-latest",      label: "codestral-latest",      desc: "Modèle code (actuel codestral-2508), contexte étendu." },
  { id: "devstral-medium-2507",  label: "devstral-medium-2507",  desc: "Ingénierie logicielle outillée, robuste pour le dev." },
  { id: "magistral-medium-2507", label: "magistral-medium-2507", desc: "Raisonnement renforcé sur tâches complexes." },
];

// ------- stockage (LS + Rust via invoke) -------
function uid() { return "s_" + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function loadAllLS(): Session[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return [];
    const list = JSON.parse(raw); return Array.isArray(list) ? list as Session[] : []; } catch { return []; }
}
function saveAllLS(list: Session[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
async function loadAllDisk(): Promise<Session[]> {
  try { const raw = await invoke<string>("load_history_enc"); const list = JSON.parse(raw);
    return Array.isArray(list) ? list as Session[] : []; } catch { return []; }
}
async function saveAllDisk(list: Session[]) { try { await invoke("save_history_enc", { json: JSON.stringify(list) }); } catch {} }

export default function ChatLite() {
  const [model, setModel] = useState<string>("mistral-small-latest");
  const [tip, setTip] = useState<string>("");
  const tipTimer = useRef<number | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // boot: disque -> LS -> nouveau
  useEffect(() => { (async () => {
    const disk = await loadAllDisk();
    if (disk.length) {
      const sorted = [...disk].sort((a,b)=>b.updatedAt-a.updatedAt);
      setSessions(sorted); setCurrentId(sorted[0].id);
      setModel(sorted[0].model); setMessages(sorted[0].messages);
      return;
    }
    const ls = loadAllLS();
    if (ls.length) {
      const sorted = [...ls].sort((a,b)=>b.updatedAt-a.updatedAt);
      setSessions(sorted); setCurrentId(sorted[0].id);
      setModel(sorted[0].model); setMessages(sorted[0].messages);
      await saveAllDisk(sorted);
      return;
    }
    const s: Session = { id: uid(), title: "Nouveau chat", provider: "mistral", model, messages: [], updatedAt: Date.now() };
    setSessions([s]); setCurrentId(s.id); await saveAllDisk([s]);
  })(); }, []);

  function persist(partial?: { messages?: Msg[]; title?: string; model?: string }) {
    const next = sessions.map(s => s.id !== currentId ? s : ({
      ...s,
      messages: partial?.messages ?? messages,
      title: partial?.title ?? s.title,
      model: partial?.model ?? model,
      updatedAt: Date.now(),
    })).sort((a,b)=>b.updatedAt-a.updatedAt);
    setSessions(next); saveAllLS(next); void saveAllDisk(next);
  }

  function onModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setModel(next);
    const info = MISTRAL_MODELS.find(m => m.id === next)?.desc ?? "";
    setTip(info);
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setTip(""), 10_000);
    persist({ model: next });
  }

  async function send() {
    const content = input.trim();
    if (!content || busy) return;
    const msgs: Msg[] = [...messages, { role: "user" as const, content }];
    setMessages(msgs); setInput(""); setBusy(true);
    try {
      const result = await invoke<string>("chat_complete", { input: { provider: "mistral", model, messages: msgs } });
      const withAssistant: Msg[] = [...msgs, { role: "assistant" as const, content: result }];
      setMessages(withAssistant); persist({ messages: withAssistant });
    } catch (e: any) {
      const errMsgs: Msg[] = [...msgs, { role: "assistant" as const, content: "Erreur: " + String(e) }];
      setMessages(errMsgs); persist({ messages: errMsgs });
    } finally { setBusy(false); }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  // actions historique
  function actionNew() {
    const s: Session = { id: uid(), title: "Nouveau chat", provider: "mistral", model, messages: [], updatedAt: Date.now() };
    const next = [s, ...sessions]; setSessions(next); setCurrentId(s.id); setMessages([]);
    saveAllLS(next); void saveAllDisk(next);
  }
  function actionDelete(id: string) {
    const next = sessions.filter(s => s.id !== id);
    setSessions(next); saveAllLS(next); void saveAllDisk(next);
    if (currentId === id && next.length) { setCurrentId(next[0].id); setModel(next[0].model); setMessages(next[0].messages); }
  }
  function actionRename(id: string) {
    const name = prompt("Nouveau titre ?", sessions.find(s=>s.id===id)?.title || "Sans titre"); if (!name) return;
    const next = sessions.map(s => s.id===id ? { ...s, title: name, updatedAt: Date.now() } : s).sort((a,b)=>b.updatedAt-a.updatedAt);
    setSessions(next); saveAllLS(next); void saveAllDisk(next);
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "260px 1fr", gap: 12, padding: 12 }}>
      <aside className="history">
        <div className="history-header"><button onClick={actionNew} className="btn">+ Nouveau</button></div>
        <ul className="history-list">
          {sessions.map(s => (
            <li key={s.id} className={s.id===currentId ? "active" : ""}>
              <button className="history-item" onClick={()=>{ setCurrentId(s.id); setModel(s.model); setMessages(s.messages); }} title={s.title}>
                <div className="title">{s.title}</div>
                <div className="meta">{new Date(s.updatedAt).toLocaleString()}</div>
              </button>
              <div className="row-actions">
                <button className="mini" onClick={()=>actionRename(s.id)}>✎</button>
                <button className="mini" onClick={()=>actionDelete(s.id)}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ whiteSpace: "nowrap" }}>Mistral · modèle:</label>
          <select value={model} onChange={onModelChange} className="model-select" style={{ minWidth: 280 }}>
            {MISTRAL_MODELS.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
          </select>
        </div>

        {tip && (<div className="model-tip" role="status" aria-live="polite">{tip}</div>)}

        <div ref={listRef} style={{ height: "55vh", overflow: "auto", border: "1px solid #444", borderRadius: 10, padding: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <strong>{m.role === "user" ? "Toi" : m.role === "assistant" ? "IA" : "Systeme"}</strong>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
                 placeholder={busy ? "En cours..." : "Écris un message et Entrée"}
                 style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #444" }} disabled={busy}/>
          <button onClick={send} disabled={busy} style={{ padding: "10px 14px", borderRadius: 8 }}>Envoyer</button>
        </div>
      </div>
    </div>
  );
}
