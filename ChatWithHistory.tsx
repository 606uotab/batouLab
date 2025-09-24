import { useEffect, useRef, useState } from "react";
import {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  exportConversationAsText,
  generateConversationId,
} from "../src/storage/conversation";

type Msg = { role: "user" | "assistant"; content: string; timestamp: string };

function newConversation(agent = "chatgpt", mode = "Coder") {
  const now = new Date().toISOString();
  return {
    id: generateConversationId(),
    title: "Nouvelle conversation",
    agent,
    mode,
    created_at: now,
    updated_at: now,
    messages: [] as Msg[],
  };
}

export default function ChatWithHistory() {
  const [conversation, setConversation] = useState(() => newConversation());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    { id: string; title: string; agent: string; mode: string; updated_at: string }[]
  >([]);
  const listRef = useRef<HTMLDivElement>(null);

  // Charger l'historique au démarrage
  useEffect(() => {
    listConversations().then(setHistory);
  }, []);

  // Sauvegarder automatiquement et rafraîchir la liste lorsqu'il y a un changement
  useEffect(() => {
    saveConversation(conversation).then(() => {
      listConversations().then(setHistory);
    });
  }, [conversation]);

  // Scroll vers le bas quand un message est ajouté
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages]);

  // Envoi d'un message : à adapter avec ton appel IA
  async function send() {
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    setConversation((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { role: "user", content, timestamp: new Date().toISOString() },
      ],
      updated_at: new Date().toISOString(),
    }));
    setInput("");
    try {
      const result = await fakeAIReply(content);
      setConversation((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { role: "assistant", content: result, timestamp: new Date().toISOString() },
        ],
        updated_at: new Date().toISOString(),
      }));
    } catch (e: any) {
      setConversation((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { role: "assistant", content: "Erreur : " + String(e), timestamp: new Date().toISOString() },
        ],
        updated_at: new Date().toISOString(),
      }));
    } finally {
      setBusy(false);
    }
  }

  // Simule une réponse d'IA (remplace par ton appel réel)
  async function fakeAIReply(input: string): Promise<string> {
    return new Promise((resolve) => setTimeout(() => resolve("Réponse IA à : " + input), 1000));
    // Remplace cette implémentation par ton appel `invoke(...)`
  }

  // Charge une conversation existante dans l'UI
  function openConversation(id: string) {
    loadConversation(id).then((conv) => {
      if (conv) setConversation(conv);
    });
  }

  // Crée un nouveau chat
  function newChat() {
    setConversation(newConversation());
  }

  // Supprime une conversation
  function removeConversation(id: string) {
    deleteConversation(id).then(() => {
      listConversations().then(setHistory);
      if (conversation.id === id) newChat();
    });
  }

  // Exporte une conversation en texte
  async function exportTxt(id: string) {
    const txt = await exportConversationAsText(id);
    if (txt) console.log(txt);
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, padding: 12 }}>
      {/* Historique des conversations */}
      <aside className="history">
        <button onClick={newChat} className="btn">+ Nouveau</button>
        <ul className="history-list">
          {history.map((item) => (
            <li key={item.id} className={item.id === conversation.id ? "active" : ""}>
              <button
                className="history-item"
                onClick={() => openConversation(item.id)}
                title={item.title}
              >
                <div className="title">{item.title}</div>
                <div className="meta">{new Date(item.updated_at).toLocaleString()}</div>
              </button>
              <div className="row-actions">
                <button className="mini" onClick={() => exportTxt(item.id)}>⇩</button>
                <button className="mini" onClick={() => removeConversation(item.id)}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversation en cours */}
      <div style={{ display: "grid", gap: 12 }}>
        <div ref={listRef} style={{ height: "55vh", overflow: "auto", border: "1px solid #444", borderRadius: 10, padding: 12 }}>
          {conversation.messages.map((m, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <strong>{m.role === "user" ? "Toi" : "IA"}</strong>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder={busy ? "En cours..." : "Écris un message et appuie sur Entrée"}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #444" }}
            disabled={busy}
          />
          <button onClick={send} disabled={busy} style={{ padding: "10px 14px", borderRadius: 8 }}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}