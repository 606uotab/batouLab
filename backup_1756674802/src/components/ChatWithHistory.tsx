import { useEffect, useState } from "react";
import { type Conversation, listConversations, loadConversation, saveConversation, deleteConversation, exportConversationAsText } from "../storage/conversation";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export default function ChatWithHistory() {
  const [history, setHistory] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    listConversations().then(setHistory).catch(() => setHistory([]));
  }, []);

  async function openConv(id: string) {
    const conv = await loadConversation(id);
    if (conv) {
      setCurrentId(conv.id);
      setConversation(conv);
    }
  }

  async function addUserMsg() {
    if (!conversation || !input.trim()) return;
    const next: Conversation = {
      ...conversation,
      messages: [...conversation.messages, { role: "user", content: input.trim() } as Msg],
      updatedAt: Date.now(),
    };
    await saveConversation(next);
    setConversation(next);
    setInput("");
    listConversations().then(setHistory).catch(() => {});
  }

  async function remove(id: string) {
    await deleteConversation(id);
    if (currentId === id) {
      setCurrentId("");
      setConversation(null);
    }
    listConversations().then(setHistory).catch(() => {});
  }

  async function doExport(id: string) {
    const conv = await loadConversation(id);
    if (!conv) return;
    const txt = await exportConversationAsText(conv);
    // Téléchargement côté navigateur (Vite)
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conv.title || conv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, height: "100%" }}>
      <aside style={{ borderRight: "1px solid var(--border,#444)", paddingRight: 8, overflow: "auto" }}>
        <h3>Conversations</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {history.map(h => (
            <li key={h.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
              <button onClick={() => openConv(h.id)} title={h.title} style={{ flex: 1 }}>{h.title || h.id}</button>
              <button onClick={() => doExport(h.id)} title="Exporter">⬇️</button>
              <button onClick={() => remove(h.id)} title="Supprimer">🗑️</button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border,#444)", borderRadius: 8, padding: 8 }}>
          {conversation ? (
            <div>
              <h3 style={{ marginTop: 0 }}>{conversation.title || conversation.id} · {conversation.provider}:{conversation.model}</h3>
              {conversation.messages.map((m, i) => (
                <div key={i} style={{ margin: "6px 0" }}>
                  <strong>{m.role}:</strong> <span>{m.content}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>Sélectionne une conversation…</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ton message…" style={{ flex: 1 }} />
          <button onClick={addUserMsg}>Envoyer</button>
        </div>
      </main>
    </div>
  );
}
