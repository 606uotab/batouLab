import { invoke } from "@tauri-apps/api/core";

export type Msg = { role: "user" | "assistant" | "system"; content: string };
export type Conversation = {
  id: string;
  title: string;
  provider: "mistral";
  model: string;
  messages: Msg[];
  updatedAt: number;
};

export type SessionMeta = {
  id: string;
  title: string;
  provider: "mistral";
  model: string;
  updatedAt: number;
};

export function generateConversationId() {
  return "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listConversations(): Promise<SessionMeta[]> {
  const raw = await invoke<string>("list_sessions");
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as SessionMeta[]) : [];
  } catch { return []; }
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await invoke("save_session_enc", {
    id: conv.id,
    json: JSON.stringify(conv),
  });
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const raw = await invoke<string>("load_session_enc", { id });
  if (!raw) return null;
  try { return JSON.parse(raw) as Conversation; } catch { return null; }
}

export async function deleteConversation(id: string): Promise<void> {
  await invoke("delete_session", { id });
}

export async function exportConversationAsText(id: string): Promise<string> {
  // renvoie un texte lisible (ou, si indispo, le JSON déchiffré)
  const txt = await invoke<string>("export_session_text", { id });
  return txt || "";
}
