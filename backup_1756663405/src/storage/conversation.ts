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

const STORAGE_KEY = "bl_history_v1";
const isTauri = typeof window !== "undefined" && "__TAURI_IPC__" in window;

export function generateConversationId(): string {
  return "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadAllLS(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as Conversation[]) : [];
  } catch { return []; }
}
function saveAllLS(list: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

async function loadAll(): Promise<Conversation[]> {
  if (isTauri) {
    try {
      const raw = await invoke<string>("load_history");
      const list = JSON.parse(raw);
      return Array.isArray(list) ? (list as Conversation[]) : [];
    } catch { /* fallthrough */ }
  }
  return loadAllLS();
}
async function saveAll(list: Conversation[]) {
  if (isTauri) {
    try { await invoke("save_history", { json: JSON.stringify(list) }); return; } catch {}
  }
  saveAllLS(list);
}

export async function listConversations(): Promise<Conversation[]> {
  const list = await loadAll();
  // tri par updatedAt desc
  return [...list].sort((a,b)=>b.updatedAt-a.updatedAt);
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const list = await loadAll();
  return list.find(x=>x.id===id) ?? null;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const list = await loadAll();
  const i = list.findIndex(x=>x.id===conv.id);
  if (i>=0) list[i] = conv; else list.push(conv);
  await saveAll(list);
}

export async function deleteConversation(id: string): Promise<void> {
  const list = await loadAll();
  const next = list.filter(x=>x.id!==id);
  await saveAll(next);
}

export function exportConversationAsText(conv: Conversation): string {
  const lines: string[] = [];
  lines.push(`# ${conv.title}  (model: ${conv.model})`);
  for (const m of conv.messages) {
    lines.push(`\n## ${m.role}\n`);
    lines.push(m.content);
  }
  return lines.join("\n");
}
