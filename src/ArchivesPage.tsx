// @ts-nocheck
import React, { useEffect, useState } from "react";
import { listArchived, restoreConversation, purgeConversation, importBackup } from "../db/db";
import { open as openDialog, message as msgBox } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

export default function ArchivesPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function reload() {
        setLoading(true);
        try {
            const r = await listArchived();
            setRows(r||[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { reload(); }, []);

    async function doRestore(id: string) {
        try {
            await restoreConversation(id);
            await reload();
            await msgBox("Conversation restaurée.", { title:"Archives", kind:"info" });
        } catch (e) {
            await msgBox(String(e), { title:"Erreur", kind:"error" });
        }
    }

    async function doPurge(id: string) {
        const ok = confirm("Supprimer définitivement cette conversation ?");
        if (!ok) return;
        try {
            await purgeConversation(id);
            await reload();
            await msgBox("Conversation supprimée.", { title:"Archives", kind:"info" });
        } catch (e) {
            await msgBox(String(e), { title:"Erreur", kind:"error" });
        }
    }

    async function importFile() {
        try {
            const filepath = await openDialog({ multiple:false, directory:false, filters:[{ name:"JSON", extensions:["json"] }] });
            if (!filepath || Array.isArray(filepath)) return;
            const raw = await readTextFile(filepath);
            const json = JSON.parse(raw);

            const payload = (json?.format === "batoulab.conversation@v1")
            ? { items: [ { conversation: json.conversation, messages: json.messages } ] }
            : json;

            const res = await importBackup(payload);
            await msgBox(`Import: ${res.imported} conversation(s), renommées: ${res.remapped}.`, { title:"Import", kind:"info" });
            await reload();
        } catch (e) { await msgBox(`Échec import: ${String(e)}`, { title:"Import", kind:"error" }); }
    }

    return (
        <div style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{margin:0}}>Archives</h2>
        <button className="linkbtn" onClick={importFile}>Importer .json</button>
        </div>

        {loading ? (
            <div className="small muted">Chargement…</div>
        ) : rows.length === 0 ? (
            <div className="small muted">Aucune conversation archivée.</div>
        ) : (
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
            {rows.map(a => (
                <li key={a.id} style={{ border:"1px solid #ddd", borderRadius:6, padding:10, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                <div>
                <div><strong>{a.title || "Sans titre"}</strong></div>
                <div className="small muted">{a.model} · {new Date((a.updated_at||0)*1000).toLocaleString()}</div>
                </div>
                <div style={{ whiteSpace:"nowrap" }}>
                <button className="linkbtn" onClick={()=>doRestore(a.id)}>Restaurer</button>
                <button className="linkbtn" onClick={()=>doPurge(a.id)} style={{ marginLeft:8, color:"#b00" }}>Supprimer</button>
                </div>
                </div>
                </li>
            ))}
            </ul>
        )}
        </div>
    );
}
