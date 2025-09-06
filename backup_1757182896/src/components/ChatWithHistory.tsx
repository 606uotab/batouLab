// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Role = "user" | "assistant" | "system";
type Message = { role: Role; content: string };
type Conversation = {
  id: string;
  title: string;
  provider: "mistral";
  model: string;
  messages: Message[];
};

const MODELS = [
  { id: "mistral-small-latest", label: "Mistral Small" },
  { id: "mistral-medium-latest", label: "Mistral Medium" },
  { id: "mistral-large-latest", label: "Mistral Large" },
];

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatWithHistory() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const active = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);

  useEffect(() => {
    if (convs.length === 0) newChat();
  }, []);

  function newChat() {
    const id = uuid();
    const c: Conversation = { id, title: "Nouveau chat", provider: "mistral", model, messages: [] };
    setConvs((prev) => [c, ...prev]);
    setActiveId(id);
    setDraft("");
    queueMicrotask(() => textRef.current?.focus());
  }

  function removeChat(id: string) {
    setConvs((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      const next = convs.find((c) => c.id !== id);
      setActiveId(next?.id || "");
    }
  }

  function setTitleOnFirstUser(id: string, userText: string) {
    setConvs((prev) =>
      prev.map((c) =>
        c.id === id && (c.title === "Nouveau chat" || !c.title.trim())
          ? { ...c, title: userText.slice(0, 48) }
          : c
      )
    );
  }

  async function onSend() {
    const msg = draft.trim();
    if (!active || !msg) return;

    const userMsg: Message = { role: "user", content: msg };
    setConvs((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, userMsg] } : c))
    );
    setTitleOnFirstUser(active.id, msg);
    setDraft("");

    try {
      const payload = [...active.messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const reply = await invoke<string>("chat_complete", {
        input: { provider: "mistral", model: active.model || model, messages: payload },
      });
      const assistant: Message = { role: "assistant", content: String(reply ?? "") };
      setConvs((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, assistant] } : c))
      );
    } catch (e: any) {
      const errText = typeof e === "string" ? e : (e?.message ?? e?.toString?.() ?? "Erreur inconnue");
      const assistant: Message = { role: "assistant", content: `[Erreur API] ${errText}` };
      setConvs((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, assistant] } : c))
      );
    } finally {
      queueMicrotask(() => textRef.current?.focus());
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c) => {
      const title = (c.title || "").toLowerCase();
      const hitTitle = title.includes(q);
      const hitMsg = (c.messages || []).some((m) => (m.content || "").toLowerCase().includes(q));
      return hitTitle || hitMsg;
    });
  }, [convs, search]);

  // auto-resize textarea
  function autoGrow(t: HTMLTextAreaElement | null) {
    if (!t) return;
    t.style.height = "auto";
    const h = Math.min(200, t.scrollHeight);
    t.style.height = `${h}px`;
  }
  useEffect(() => { autoGrow(textRef.current); }, [draft]);

  function exportTxt(id: string) {
    const c = convs.find((x) => x.id === id);
    if (!c) return;
    const lines = c.messages.map((m) => `[${m.role}] ${m.content}`).join("\\n\\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = (c.title || "conversation") + ".txt";
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <button className="linkbtn" onClick={newChat}>+ Nouveau</button>
          <button className="linkbtn right" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <div className="sidebar-controls">
          <label className="small label">Modèle</label>
          <select
            className="select"
            value={model}
            onChange={(e) => {
              const m = e.target.value;
              setModel(m);
              if (active) {
                setConvs((prev) => prev.map((c) => (c.id === active.id ? { ...c, model: m } : c)));
              }
            }}
          >
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        <div className="sidebar-controls">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="input"
          />
        </div>

        <div className="sidebar-list">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`conv ${c.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(c.id)}
              title={c.title || "Nouveau chat"}
            >
              <div className="conv-title label">{c.title || "Nouveau chat"}</div>
              <div className="conv-actions">
                <button className="linkbtn small" onClick={(e) => { e.stopPropagation(); exportTxt(c.id); }}>Exporter</button>
                <button className="linkbtn small" onClick={(e) => { e.stopPropagation(); removeChat(c.id); }}>×</button>
              </div>
              <div className="small muted">{c.model}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="header">
          <div className="label">{active?.title || "Nouveau chat"}</div>
          <div className="right">
            <span className="badge">{active?.model || model}</span>
          </div>
        </div>

        <div className="messages">
          {!active || active.messages.length === 0 ? (
            <div className="small muted">Saisis un message pour démarrer.</div>
          ) : (
            active.messages.map((m, i) => (
              <div key={i} className="msg">
                <div className="who">{m.role === "user" ? "Utilisateur" : m.role === "assistant" ? "Assistant" : "Système"}</div>
                <div>{m.content}</div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="composer">
          <div className="row">
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onInput={(e) => autoGrow(e.currentTarget)}
              placeholder="Écrire un message"
              className="textarea"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.altKey) { e.preventDefault(); onSend(); }
              }}
            />
            <button className="linkbtn" onClick={onSend}>Envoyer</button>
          </div>
          <div className="hint">Entrée ajoute une ligne. Alt+Entrée envoie. Ou cliquer sur Envoyer.</div>
        </div>
      </main>
    </div>
  );
}

