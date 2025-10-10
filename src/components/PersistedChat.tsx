import { useEffect, useState } from "react";
import {
  ensureSchema,
  listConversations,
  createConversation,
  archiveConversation,
  exportConversation,
  type ConversationRow,
} from "../db/db";
import { ensureDir, writeTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/api/path";

type Props = {
  activeProvider: string;     // ex. "mistral" | "anthropic" | "openai"
  activeModel: string;        // ex. "mistral-small-latest"
  onSelect: (id: string) => void;
};

export default function PersistedChat({
  activeProvider,
  activeModel,
  onSelect,
}: Props) {
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await ensureSchema();
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    const rows = await listConversations("active");
    setConvs(rows);
    setLoading(false);
  }

  async function onNew() {
    const id = crypto.randomUUID();
    await createConversation({
      id,
      title: "Nouveau chat",
      provider: activeProvider || "unknown",
      model: activeModel || "unknown",
    });
    await refresh();
    onSelect(id);
  }

  async function onArchive(id: string) {
    await archiveConversation(id);
    await refresh();
  }

  async function onExport(id: string) {
    const payload = await exportConversation(id);
    if (!payload) return;
    const dir = "conversations/exports";
    await ensureDir(dir, { baseDir: BaseDirectory.AppData });
    const path = `${dir}/${id}.json`;
    await writeTextFile(path, JSON.stringify(payload, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
    // Optionnel: console info
    console.log("Exporté -> AppData/", path);
  }

  return (
    <div className="sidebar">
    <button onClick={onNew}>+ Nouvelle</button>

    <label className="small muted" style={{ marginTop: 8 }}>Modèle</label>
    {/* Le sélecteur de modèle est déjà ailleurs, on n’y touche pas */}

    <input
    placeholder="Rechercher..."
    onChange={() => {}}
    disabled
    style={{ width: "100%", marginTop: 6 }}
    />

    <div style={{ marginTop: 12 }}>
    {loading && <div className="small muted">Chargement…</div>}
    {!loading &&
      convs.map((c) => (
        <div
        key={c.id}
        className="chat-item"
        style={{
          border: "1px solid #ddd",
          borderRadius: 6,
          padding: 8,
          marginBottom: 8,
          cursor: "pointer",
        }}
        onClick={() => onSelect(c.id)}
        title={`${c.provider}/${c.model}`}
        >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{c.title}</strong>
        <div>
        <button onClick={(e) => { e.stopPropagation(); onExport(c.id); }}>
        Exporter
        </button>
        <button
        onClick={(e) => { e.stopPropagation(); onArchive(c.id); }}
        style={{ marginLeft: 6 }}
        aria-label="Archiver"
        title="Archiver"
        >
        ×
        </button>
        </div>
        </div>
        <div className="small muted">{activeModel}</div>
        </div>
      ))}
      {!loading && convs.length === 0 && (
        <div className="small muted">Aucune conversation active.</div>
      )}
      </div>
      </div>
  );
}
