// src/storage/storage.fs.ts
import { writeTextFile, remove } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/api/path";
import { ensureDir } from "@tauri-apps/plugin-fs";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    ts?: number;
}

export interface Conversation {
    id: string;
    title: string;
    provider: string;
    model: string;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
}

export interface ConversationMeta {
    id: string;
    title: string;
    provider: string;
    model: string;
    createdAt: number;
    updatedAt: number;
    size: number;
}

interface Index {
    conversations: ConversationMeta[];
}

const baseDir = BaseDirectory.AppData;
const INDEX_FILE = "conversations/index.json";

function fileOf(id: string) {
    return `conversations/${id}.json`;
}

async function loadIndex(): Promise<Index> {
    try {
        const text = await readTextFile(INDEX_FILE, { baseDir });
        return JSON.parse(text);
    } catch {
        return { conversations: [] };
    }
}

async function saveIndex(idx: Index) {
    await writeTextFile(INDEX_FILE, JSON.stringify(idx, null, 2), { baseDir });
}

let throttled: NodeJS.Timeout | null = null;
function saveIndexThrottled(idx: Index) {
    if (throttled) clearTimeout(throttled);
    throttled = setTimeout(() => {
        saveIndex(idx);
        throttled = null;
    }, 500);
}

export async function upsertConversation(c: Conversation) {
    await ensureDir("conversations", { baseDir });
    await writeTextFile(fileOf(c.id), JSON.stringify(c, null, 2), { baseDir });
    const idx = await loadIndex();
    const meta: ConversationMeta = {
        id: c.id,
        title: c.title,
        provider: c.provider,
        model: c.model,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        size: c.messages.length,
    };
    const i = idx.conversations.findIndex((x: ConversationMeta) => x.id === c.id);
    if (i >= 0) idx.conversations[i] = meta;
    else idx.conversations.unshift(meta);
    saveIndexThrottled(idx);
}

export async function deleteConversation(id: string) {
    await remove(fileOf(id), { baseDir });
    const idx = await loadIndex();
    idx.conversations = idx.conversations.filter((x: ConversationMeta) => x.id !== id);
    saveIndexThrottled(idx);
}
