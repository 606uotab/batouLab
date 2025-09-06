/**
 * Stockage "index léger + fichiers par session" (chiffrés côté Rust).
 * On expose les mêmes noms de fonctions que le composant attend déjà.
 */
import { invoke } from "@tauri-apps/api/core";

export type Msg = { role: "user"|"assistant"|"system"; content: string };
export type Conversation = {
  id: string;
  title: string;
  provider: "mistral";
  model: string;
  messages: Msg[];
  updatedAt: number;
};

type IndexItem = { id:string; title:string; model:string; updatedAt:number; provider:"mistral" };

const INDEX_FILE_V = 2;

/** ID util (compatible existant) */
export function generateConversationId() {
  return "s_" + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}

/** lit l'index (chiffré) et migre si besoin */
export async function listConversations(): Promise<IndexItem[]> {
  let raw = "[]";
  try { raw = await invoke<string>("load_history_enc"); } catch {}
  // Deux cas :
  // - v2: index léger [{id,title,model,updatedAt,provider}]
  // - legacy: tableau de sessions complètes (avec messages) -> migrer
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && !arr[0]?.messages) {
      // déjà léger
      return arr;
    }
    if (Array.isArray(arr)) {
      // legacy -> migrer: sauver chaque session + fabriquer index léger
      const index: IndexItem[] = [];
      for (const s of arr) {
        if (!s?.id) continue;
        const conv: Conversation = {
          id: s.id,
          title: s.title || "Nouveau chat",
          provider: s.provider || "mistral",
          model: s.model || "mistral-small-latest",
          messages: Array.isArray(s.messages) ? s.messages : [],
          updatedAt: s.updatedAt || Date.now()
        };
        await saveConversation(conv);
        index.push({ id: conv.id, title: conv.title, model: conv.model, updatedAt: conv.updatedAt, provider: "mistral" });
      }
      // on écrase l'index avec le léger
      await invoke("save_history_enc", { json: JSON.stringify(index) });
      return index;
    }
  } catch { /* ignore & recreate */ }

  // pas d’index -> créer vide si absent
  await invoke("save_history_enc", { json: "[]" }).catch(() => {});
  return [];
}

/** sauvegarde une conversation -> fichier chiffré + maj index léger */
export async function saveConversation(c: Conversation): Promise<void> {
  // 1) fichier session
  await invoke("save_session_enc", { id: c.id, json: JSON.stringify(c) });

  // 2) index: upsert
  const idx = await listConversations();
  const i = idx.findIndex(x => x.id === c.id);
  const item: IndexItem = { id: c.id, title: c.title, model: c.model, updatedAt: c.updatedAt, provider: "mistral" };
  if (i >= 0) idx[i] = item; else idx.push(item);
  await invoke("save_history_enc", { json: JSON.stringify(idx) });
}

/** charge une conversation depuis son fichier chiffré */
export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const raw = await invoke<string>("load_session_enc", { id });
    const c = JSON.parse(raw);
    // sanity
    c.messages = Array.isArray(c.messages) ? c.messages : [];
    return c;
  } catch {
    return null;
  }
}

/** supprime le fichier de session + retire de l’index */
export async function deleteConversation(id: string): Promise<void> {
  await invoke("delete_session", { id }).catch(() => {});
  const idx = await listConversations();
  const next = idx.filter(x => x.id !== id);
  await invoke("save_history_enc", { json: JSON.stringify(next) });
}

/** export texte simple (sans chiffrement) */
export async function exportConversationAsText(id: string): Promise<string> {
  const c = await loadConversation(id);
  if (!c) return "";
  const lines: string[] = [];
  lines.push(`# ${c.title}`);
  lines.push(`Model: ${c.model} · Updated: ${new Date(c.updatedAt).toISOString()}`);
  lines.push("");
  for (const m of c.messages) {
    lines.push(`## ${m.role}`);
    lines.push(m.content);
    lines.push("");
  }
  return lines.join("\n");
}
