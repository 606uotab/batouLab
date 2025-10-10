// @ts-nocheck
import Database from "@tauri-apps/plugin-sql";
import schemaSql from "./schema.sql?raw";

/* ---------- Types ---------- */
export type Role = "user" | "assistant" | "system";

export interface Message {
    id: string;
    conversation_id: string;
    role: Role;
    content: string;
    ts: number;                 // epoch seconds
    meta?: string | null;
}

export interface ConversationRow {
    id: string;
    title: string;
    provider: string;
    model: string;
    status: "active" | "archived";
    created_at: number;
    updated_at: number;
    message_count: number;
}

/* ---------- DB bootstrap ---------- */
let dbPromise: Promise<Database | null> | null = null;

async function openDb(): Promise<Database | null> {
    if (!dbPromise) {
        dbPromise = Database.load("sqlite:conversations.db").catch((e) => {
            console.error("SQLite load failed:", e);
            return null;
        });
    }
    return dbPromise;
}

function splitSql(sql: string): string[] {
    return sql
    .replace(/\r\n/g, "\n")
    .split(/;\s*\n(?=\s*\n)/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith(";") ? s : s + ";"));
}

/** Transaction helper (BEGIN IMMEDIATE / COMMIT / ROLLBACK) */
async function withTxn<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    const db = await openDb(); if (!db) throw new Error("DB not open");
    await db.execute("BEGIN IMMEDIATE;");
    try {
        const out = await fn(db);
        await db.execute("COMMIT;");
        return out;
    } catch (e) {
        try { await db.execute("ROLLBACK;"); } catch {}
        throw e;
    }
}

/* ---------- Schema & Pragmas ---------- */
export async function ensureSchema() {
    const db = await openDb(); if (!db) return;

    // Concurrence & stabilité
    await db.execute("PRAGMA foreign_keys = ON;");
    await db.execute("PRAGMA journal_mode = wal;");
    await db.execute("PRAGMA busy_timeout = 5000;");
    await db.execute("PRAGMA synchronous = NORMAL;");

    for (const stmt of splitSql(schemaSql)) {
        await db.execute(stmt);
    }

    // Migration : valeurs vides -> 'active'
    await db.execute(
        "UPDATE conversations SET status='active' WHERE status IS NULL OR status='';"
    );
}

/* ---------- CRUD ---------- */
export async function createConversation(input: {
    id: string;
    title: string;
    provider: string;
    model: string;
    createdAt?: number;
}) {
    const db = await openDb(); if (!db) return;
    const now = Math.floor(Date.now() / 1000);
    const created = input.createdAt ?? now;
    await db.execute(
        `INSERT INTO conversations (id,title,provider,model,status,created_at,updated_at,message_count)
        VALUES (?,?,?,?, 'active', ?, ?, 0);`,
                     [input.id, input.title, input.provider, input.model, created, created]
    );
}

export async function appendMessage(m: Message) {
    const db = await openDb(); if (!db) return;
    await db.execute(
        `INSERT INTO messages (id, conversation_id, role, content, ts, meta)
        VALUES (?, ?, ?, ?, ?, ?);`,
                     [m.id, m.conversation_id, m.role, m.content, m.ts, m.meta ?? null]
    );
}

export async function listConversations(
    status: "active" | "archived" = "active"
): Promise<ConversationRow[]> {
    const db = await openDb(); if (!db) return [];
    return db.select<ConversationRow[]>(
        `SELECT id,title,provider,model,status,created_at,updated_at,message_count
        FROM conversations
        WHERE TRIM(LOWER(status)) = TRIM(LOWER(?))
        ORDER BY updated_at DESC;`,
        [status]
    );
}

export async function listArchived(): Promise<ConversationRow[]> {
    return listConversations("archived");
}

export async function getConversation(
    id: string
): Promise<{ conv: ConversationRow; messages: Message[] } | null> {
    const db = await openDb(); if (!db) return null;

    const conv = await db.select<ConversationRow[]>(
        `SELECT id,title,provider,model,status,created_at,updated_at,message_count
        FROM conversations
        WHERE id = ?;`,
        [id]
    );
    if (conv.length === 0) return null;

    const messages = await db.select<Message[]>(
        `SELECT id,conversation_id,role,content,ts,meta
        FROM messages
        WHERE conversation_id = ?
        ORDER BY ts ASC, id ASC;`,
        [id]
    );

    return { conv: conv[0], messages };
}

export async function archiveConversation(id: string) {
    const db = await openDb(); if (!db) return;
    const now = Math.floor(Date.now() / 1000);
    await db.execute(
        `UPDATE conversations SET status='archived', updated_at = ? WHERE id = ?;`,
        [now, id]
    );
}

export async function restoreConversation(id: string) {
    const db = await openDb(); if (!db) return;
    const now = Math.floor(Date.now() / 1000);
    await db.execute(
        `UPDATE conversations SET status='active', updated_at = ? WHERE id = ?;`,
        [now, id]
    );
}

export async function purgeConversation(id: string) {
    const db = await openDb(); if (!db) return;
    await db.execute(`DELETE FROM conversations WHERE id = ?;`, [id]);
}

export async function exportConversation(id: string) {
    const data = await getConversation(id);
    if (!data) return null;
    return {
        conversation: data.conv,
        messages: data.messages,
        exported_at: Math.floor(Date.now() / 1000),
        format: "batoulab.conversation@v1",
    };
}

export async function updateConversationTitle(id: string, title: string) {
    const db = await openDb(); if (!db) return;
    const now = Math.floor(Date.now() / 1000);
    await db.execute(
        `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?;`,
        [title, now, id]
    );
}

/** ✅ Nouveau : mise à jour PERSISTANTE du modèle (et, optionnellement, du provider) */
export async function updateConversationModel(id: string, model: string, provider?: string) {
    const db = await openDb(); if (!db) return;
    const now = Math.floor(Date.now() / 1000);

    if (provider) {
        await db.execute(
            `UPDATE conversations SET model = ?, provider = ?, updated_at = ? WHERE id = ?;`,
            [model, provider, now, id]
        );
    } else {
        await db.execute(
            `UPDATE conversations SET model = ?, updated_at = ? WHERE id = ?;`,
            [model, now, id]
        );
    }
}

export async function searchConversations(query: string): Promise<ConversationRow[]> {
    const db = await openDb(); if (!db) return [];
    const q = `%${query.toLowerCase()}%`;
    return db.select<ConversationRow[]>(
        `SELECT DISTINCT c.id, c.title, c.provider, c.model, c.status,
        c.created_at, c.updated_at, c.message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE TRIM(LOWER(c.status))='active'
    AND (LOWER(c.title) LIKE ? OR LOWER(m.content) LIKE ?)
    ORDER BY c.updated_at DESC;`,
    [q, q]
    );
}

/* ---------- Export / Import / Ops de masse ---------- */
export async function exportAllConversations(scope: "active" | "all" = "active") {
    const db = await openDb(); if (!db) return null;

    const rows = await db.select<ConversationRow[]>(
        scope === "active"
        ? `SELECT * FROM conversations WHERE TRIM(LOWER(status))='active' ORDER BY updated_at DESC;`
        : `SELECT * FROM conversations ORDER BY updated_at DESC;`
    );

    const items: any[] = [];
    for (const c of rows) {
        const messages = await db.select<Message[]>(
            `SELECT id,conversation_id,role,content,ts,meta
            FROM messages
            WHERE conversation_id = ?
            ORDER BY ts ASC, id ASC;`,
            [c.id]
        );
        items.push({ conversation: c, messages });
    }

    return {
        format: "batoulab.backup@v1",
            exported_at: Math.floor(Date.now() / 1000),
            items,
    };
}

export async function importBackup(payload: any) {
    if (!payload || !Array.isArray(payload.items)) {
        return { imported: 0, remapped: 0 };
    }

    let imported = 0, remapped = 0;

    await withTxn(async (db) => {
        for (const it of payload.items) {
            if (!it?.conversation?.id) continue;

            const c = it.conversation as ConversationRow;

            const exists = await db.select<{ id: string }[]>(
                `SELECT id FROM conversations WHERE id = ?;`,
                [c.id]
            );

            let targetId = c.id;
            if (exists.length > 0) {
                remapped++;
                targetId = `${c.id}-${Date.now().toString(36)}`;
            }

            await db.execute(
                `INSERT INTO conversations (id,title,provider,model,status,created_at,updated_at,message_count)
                VALUES (?,?,?,?,?,?,?,?);`,
                             [
                                 targetId,
                             c.title,
                             c.provider,
                             c.model,
                             c.status,
                             c.created_at,
                             c.updated_at,
                             c.message_count ?? (it.messages?.length ?? 0),
                             ]
            );

            if (Array.isArray(it.messages)) {
                for (const m of it.messages as Message[]) {
                    await db.execute(
                        `INSERT INTO messages (id,conversation_id,role,content,ts,meta)
                        VALUES (?,?,?,?,?,?);`,
                                     [
                                         m.id || `${targetId}-${Math.random().toString(36).slice(2)}`,
                                     targetId,
                                     m.role,
                                     m.content,
                                     m.ts,
                                     m.meta ?? null,
                                     ]
                    );
                }
            }

            imported++;
        }
    });

    return { imported, remapped };
}

export async function archiveAllActive() {
    await withTxn(async (db) => {
        const now = Math.floor(Date.now() / 1000);
        await db.execute(
            `UPDATE conversations
            SET status='archived', updated_at=?
            WHERE TRIM(LOWER(status))='active';`,
                         [now]
        );
    });
}

/* ---------- Stats ---------- */
export async function countByStatus() {
    const db = await openDb(); if (!db) return { active: 0, archived: 0 };
    const rows = await db.select<{ status: string; n: number }[]>(
        "SELECT status, COUNT(*) AS n FROM conversations GROUP BY status;"
    );
    const map = Object.fromEntries(
        rows.map((r) => [String(r.status).toLowerCase().trim(), Number(r.n)])
    );
    return { active: map["active"] ?? 0, archived: map["archived"] ?? 0 };
}
