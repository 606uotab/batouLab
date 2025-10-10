// @ts-nocheck
import { useEffect, useState } from "react";
import ChatWithHistory from "@components/ChatWithHistory";
import ApiKeysPage from "@components/ApiKeysPage";
import { APP_VERSION } from "./version";

// Archives inline (simple & autonome)
import { listArchived, restoreConversation, purgeConversation, importBackup } from "@/db/db";
//import { open as openDialog, message as msgBox } from "@tauri-apps/plugin-dialog";
import { open as openDialog, message as msgBox, confirm as confirmBox } from "@tauri-apps/plugin-dialog";

import { readTextFile } from "@tauri-apps/plugin-fs";

function ArchivesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try { setRows(await listArchived()); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function onRestore(id: string) {
    try {
      await restoreConversation(id);
      await reload();
      await msgBox("Conversation restaurée.", { title:"Archives", kind:"info" });
    } catch (e) {
      await msgBox(String(e), { title:"Archives", kind:"error" });
    }
  }

  async function onPurge(id: string) {
  const ok = await confirmBox("Supprimer définitivement cette conversation ?", {
    title: "batoulab-app",
    kind: "warning",
    okLabel: "Valider",
    cancelLabel: "Annuler",
  });
  if (!ok) return;

  try {
    await purgeConversation(id);
    await reload();
  } catch (e) {
    await msgBox(String(e), { title: "Archives", kind: "error" });
  }
}


  async function onImportJson() {
    try {
      const filepath = await openDialog({ multiple:false, directory:false, filters:[{ name:"Backup JSON", extensions:["json"] }] });
      if (!filepath || Array.isArray(filepath)) return;
      const raw = await readTextFile(filepath);
      const json = JSON.parse(raw);
      const res = await importBackup(json);
      await msgBox(`Import: ${res.imported} conversation(s), renommées: ${res.remapped}.`, { title:"Import", kind:"info" });
      await reload();
    } catch (e) { await msgBox(`Échec import: ${String(e)}`, { title:"Import", kind:"error" }); }
  }

  return (
    <div className="page">
    <div className="toolbar" style={{ display:"flex", gap:8, marginBottom:12 }}>
    <button className="linkbtn" onClick={onImportJson}>Import .json</button>
    <button className="linkbtn" onClick={reload}>Actualiser</button>
    </div>

    {loading ? (
      <div className="small muted">Chargement…</div>
    ) : rows.length === 0 ? (
      <div className="small muted">Aucune conversation archivée.</div>
    ) : (
      <ul style={{ listStyle:"none", padding:0, margin:0 }}>
      {rows.map(a => (
        <li key={a.id} style={{ border:"1px solid #ddd", borderRadius:6, padding:10, marginBottom:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center" }}>
        <div>
        <div><strong>{a.title || "Sans titre"}</strong></div>
        <div className="small muted">{a.model} · {new Date((a.updated_at||0)*1000).toLocaleString()}</div>
        </div>
        <div style={{ whiteSpace:"nowrap" }}>
        <button className="linkbtn" onClick={()=>onRestore(a.id)}>Restaurer</button>
        <button className="linkbtn" style={{ marginLeft:8, color:"#b00" }} onClick={()=>onPurge(a.id)}>Supprimer</button>
        </div>
        </div>
        </li>
      ))}
      </ul>
    )}
    </div>
  );
}

type Tab = "chat" | "keys" | "archives";

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");

  useEffect(() => { document.title = `batoLab V${APP_VERSION}`; }, []);

  return (
    <div className="container">
    <header className="topbar">
    <nav className="tabs">
    <button className={`tab ${tab==="chat"?"active":""}`} onClick={()=>setTab("chat")}>Chat</button>
    <button className={`tab ${tab==="keys"?"active":""}`} onClick={()=>setTab("keys")}>🔑 Clés API</button>
    <button className={`tab ${tab==="archives"?"active":""}`} onClick={()=>setTab("archives")}>Archives</button>
    </nav>
    </header>

    <section className="content">
    {tab==="chat" && <ChatWithHistory />}
    {tab==="keys" && <ApiKeysPage />}
    {tab==="archives" && <ArchivesPage />}
    </section>
    </div>
  );
}
