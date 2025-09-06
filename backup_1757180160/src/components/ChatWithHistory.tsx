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
];

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2);
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

export default function ChatWithHistory() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const active = useMemo(
    () => convs.find((c) => c.id === activeId) || null,
    [convs, activeId]
  );

  useEffect(() => {
    if (convs.length === 0) newChat();
    // eslint-disable-next-line
  }, []);

  function newChat() {
    const id = uuid();
    const c: Conversation = {
      id,
      title: "Nouveau chat",
      provider: "mistral",
      model,
      messages: [],
    };
    setConvs((prev) => [c, ...prev]);
    setActiveId(id);
    setDraft("");
    queueMicrotask(() => textRef.current?.focus());
  }

  function removeChat(id: string) {
    setConvs((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      const rest = convs.filter((c) => c.id !== id);
      setActiveId(rest[0]?.id || "");
    }
  }

  function exportTxt(id: string) {
    const c = convs.find((x) => x.id === id);
    if (!c) return;
    const lines = c.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`);
    downloadText(`${c.title || "chat"}.txt`, lines.join("\n\n"));
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

    // push user
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

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[320px] border-r bg-white text-black flex flex-col">
        <div className="p-2 flex gap-2 items-center">
          <button className="px-3 py-1 rounded border bg-white" onClick={newChat}>+ Nouveau</button>
          <select
            className="px-2 py-1 border rounded bg-white text-black"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              // si un chat est actif, on met à jour son modèle
              if (active) {
                const m = e.target.value;
                setConvs((prev) => prev.map((c) => c.id === active.id ? { ...c, model: m } : c));
              }
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="px-2 pb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (titre + messages)…"
            className="w-full px-3 py-2 border rounded bg-white text-black"
          />
        </div>

        <div className="overflow-auto px-2 pb-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`border rounded p-2 mb-2 cursor-pointer ${c.id === activeId ? "border-black" : "border-gray-300"}`}
              onClick={() => setActiveId(c.id)}
            >
              <div className="flex justify-between items-center gap-2">
                <div className="font-semibold truncate">{c.title || "Nouveau chat"}</div>
                <div className="flex gap-1">
                  <button className="px-2 py-1 text-xs border rounded" onClick={(e) => { e.stopPropagation(); exportTxt(c.id); }}>Exporter .txt</button>
                  <button className="px-2 py-1 text-xs border rounded" onClick={(e) => { e.stopPropagation(); removeChat(c.id); }}>×</button>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1 truncate">{c.model}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-white text-black flex flex-col">
        <div className="p-4 border-b">
          <div className="text-lg font-semibold">{active?.title || "Nouveau chat"}</div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!active || active.messages.length === 0 ? (
            <div className="text-gray-600">Saisis un message pour démarrer.</div>
          ) : (
            <div className="space-y-3">
              {active.messages.map((m, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="text-xs text-gray-600 mb-1">
                    {m.role === "user" ? "Utilisateur" : m.role === "assistant" ? "Assistant" : "Système"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="p-3 border-t bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire un message"
              className="flex-1 min-h-[56px] max-h-[200px] px-3 py-2 border rounded bg-white text-black"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button className="px-4 py-2 border rounded bg-white text-black" onClick={onSend}>Envoyer</button>
          </div>
          <div className="text-xs text-gray-600 mt-1">Entrée pour envoyer. Maj+Entrée pour nouvelle ligne.</div>
        </div>
      </main>
    </div>
  );
}
