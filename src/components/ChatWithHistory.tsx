// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModelSelector from "@components/ModelSelector";
import { runtimeKeys } from "../runtimeKeys";

import {
  ensureSchema, listConversations, getConversation, createConversation,
  appendMessage, archiveConversation,
  updateConversationTitle, searchConversations, importBackup,
  updateConversationModel,                       // ✅ NEW
} from "@/db/db";

import { mkdir, writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/api/path";
import { open as openDialog, message as msgBox } from "@tauri-apps/plugin-dialog";

type Role = "user" | "assistant" | "system";
type Message = { role: Role; content: string; ts?: number };
type Conversation = { id: string; title: string; model: string; messages: Message[]; message_count?: number };

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const providerOf = (m: string) =>
m.startsWith("gpt-") ? "openai" : m.startsWith("claude-") ? "anthropic" : "mistral";
const DOUBLE_MS = 320;

/* ---------------- util ---------------- */
async function reloadActiveList(
  setConvs: Function,
  setActiveId: Function,
  keepActive?: string
) {
  const rows = await listConversations("active");

  setConvs((prev: Conversation[]) => {
    const prevById = new Map(prev.map((c) => [c.id, c]));
    const mapped: Conversation[] = rows.map((r) => {
      const prevC = prevById.get(r.id);
      return {
        id: r.id,
        title: r.title || "Nouveau chat",
        model: r.model,
        message_count: r.message_count,
        messages: prevC?.messages || [],
      };
    });

    const next =
    keepActive && mapped.some((x) => x.id === keepActive)
    ? keepActive
    : mapped[0]?.id || "";

    setActiveId(next);
    try { localStorage.setItem("ui.activeId", next); } catch {}
    return mapped;
  });
}

export default function ChatWithHistory() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>(() => {
    try { return localStorage.getItem("ui.activeId") || ""; } catch { return ""; }
  });
  const [model, setModel] = useState<string>("mistral-small-latest");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("ui.collapsed")==="1"; } catch { return false; }
  });
  const [nearBottom, setNearBottom] = useState(true);

  const [dbSearching, setDbSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Export / Archive modales
  const [showExportSel, setShowExportSel] = useState(false);
  const [exportPick, setExportPick] = useState<Record<string, boolean>>({});
  const [archiverAfterExport, setArchiverAfterExport] = useState(true);

  const [showArchiveSel, setShowArchiveSel] = useState(false);
  const [archivePick, setArchivePick] = useState<Record<string, boolean>>({});

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const lastEnterTs = useRef<number>(0);

  const active = useMemo(
    () => convs.find((c) => c.id === activeId) || null,
                         [convs, activeId]
  );

  /* ---------------- init ---------------- */
  useEffect(() => {
    (async () => {
      try {
        await ensureSchema();
        await reloadActiveList(setConvs, setActiveId, activeId || undefined);
      } catch (e) {
        console.error("DB init failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* load messages on active change */
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const data = await getConversation(activeId);
      if (!data) return;
      const msgs: Message[] = (data.messages || []).map((m) => ({
        role: m.role, content: m.content, ts: m.ts * 1000
      }));
      setConvs((prev) =>
      prev.map((c) =>
      c.id === activeId
      ? ({ ...c, title: data.conv.title, model: data.conv.model, message_count: data.conv.message_count, messages: msgs })
      : c
      )
      );
    })().catch(console.error);
  }, [activeId]);

  useEffect(() => {
    try { localStorage.setItem("ui.collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onScroll() {
    const el = messagesRef.current; if (!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    setNearBottom(gap <= 32);
  }
  function scrollToBottom(force=false) {
    const el = messagesRef.current; if (!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    if (force || gap <= 32) { el.scrollTop = el.scrollHeight; setNearBottom(true); }
  }
  function autoGrow(t: HTMLTextAreaElement | null) {
    if (!t) return;
    t.style.height = "auto";
    const h = Math.min(200, t.scrollHeight);
    t.style.height = h + "px";
    t.style.overflowY = h >= 200 ? "auto" : "hidden";
  }
  useEffect(() => { autoGrow(textRef.current); }, [draft]);
  useEffect(() => { scrollToBottom(false); }, [activeId, active?.messages.length]);

  /* --------------- recherche DB --------------- */
  useEffect(() => {
    (async () => {
      const q = search.trim();
      if (!q) {
        setDbSearching(false);
        await reloadActiveList(setConvs, setActiveId, activeId);
        return;
      }
      setDbSearching(true);
      const rows = await searchConversations(q);
      setConvs(rows.map(r => ({
        id: r.id, title: r.title || "Nouveau chat", model: r.model,
        message_count: r.message_count, messages: []
      })));
    })().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function newChat(skipFocus=false) {
    if (creating) return;
    setCreating(true);
    try {
      const id = uuid();
      if (search) setSearch("");
      await createConversation({ id, title: "Nouveau chat", provider: providerOf(model), model });
      await reloadActiveList(setConvs, setActiveId, id);
      setDraft("");
      if (!skipFocus) queueMicrotask(() => { textRef.current?.focus(); autoGrow(textRef.current); });
    } catch (e) {
      console.error("createConversation failed:", e);
    } finally {
      setCreating(false);
    }
  }

  function setTitleOnFirstUser(id: string, t: string) {
    const newTitle = t.slice(0, 48);
    setConvs(prev => prev.map(c =>
    c.id === id && (c.title === "Nouveau chat" || !c.title.trim())
    ? { ...c, title: newTitle }
    : c
    ));
    updateConversationTitle(id, newTitle).catch(console.error);
  }

  async function onSend() {
    const msg = draft.trim(); if (!active || !msg) return;
    const nowMs = Date.now(); const nowSec = Math.floor(nowMs/1000);

    const userMsg: Message = { role:"user", content:msg, ts:nowMs };
    setConvs(prev => prev.map(c =>
    c.id===active.id ? { ...c, messages:[...c.messages, userMsg] } : c
    ));
    setTitleOnFirstUser(active.id, msg);
    setDraft(""); autoGrow(textRef.current); scrollToBottom(true);

    try {
      await appendMessage({ id:uuid(), conversation_id:active.id, role:"user", content:msg, ts:nowSec, meta:null });
      await reloadActiveList(setConvs, setActiveId, active.id);
    } catch (e) { console.error("append user failed:", e); }

    try {
      const prov = providerOf(active.model || model);
      const key =
      prov==="openai" ? runtimeKeys.openai :
      prov==="anthropic" ? runtimeKeys.anthropic :
      runtimeKeys.mistral;
      if (!key) throw new Error(`Clé ${prov} manquante`);

      // snapshot
      const current = (convs.find(c => c.id===active.id)?.messages || []);
      const payload = [...current, userMsg].map(m => ({ role:m.role, content:m.content }));

      const reply: string = await invoke("chat_complete", {
        input: { provider:prov, model:active.model||model, api_key:key, messages:payload }
      });

      const assistant: Message = { role:"assistant", content:String(reply ?? ""), ts:Date.now() };
      setConvs(prev => prev.map(c =>
      c.id===active.id ? { ...c, messages:[...c.messages, assistant] } : c
      ));
      try {
        await appendMessage({
          id:uuid(), conversation_id:active.id, role:"assistant",
                            content:String(reply ?? ""), ts:Math.floor(Date.now()/1000), meta:null
        });
        await reloadActiveList(setConvs, setActiveId, active.id);
      } catch (e) { console.error("append assistant failed:", e); }
      scrollToBottom(true);
    } catch (e:any) {
      const t = typeof e==="string" ? e : (e?.message ?? e?.toString?.() ?? "Erreur inconnue");
      const assistant: Message = { role:"assistant", content:`[Erreur API] ${t}`, ts:Date.now() };
      setConvs(prev => prev.map(c =>
      c.id===active.id ? { ...c, messages:[...c.messages, assistant] } : c
      ));
      try {
        await appendMessage({
          id:uuid(), conversation_id:active.id, role:"assistant",
                            content:`[Erreur API] ${t}`, ts:Math.floor(Date.now()/1000), meta:null
        });
        await reloadActiveList(setConvs, setActiveId, active.id);
      } catch {}
      scrollToBottom(true);
    } finally {
      queueMicrotask(() => textRef.current?.focus());
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || dbSearching) return convs;
    return convs.filter(c => {
      const hitTitle = (c.title||"").toLowerCase().includes(q);
      const hitMsg = (c.messages||[]).some(m => (m.content||"").toLowerCase().includes(q));
      return hitTitle || hitMsg;
    });
  }, [convs, search, dbSearching]);

  /* --------------- Export --------------- */
  async function exportOne(id: string) {
    try {
      const data = await getConversation(id);
      if (!data) return false;
      const payload = {
        conversation: data.conv,
        messages: data.messages,
        exported_at: Math.floor(Date.now()/1000),
        format: "batoulab.conversation@v1",
      };

      const root = "conversations";
      try { await mkdir(root, { baseDir: BaseDirectory.AppData }); } catch {}
      try { await mkdir(`${root}/exports`, { baseDir: BaseDirectory.AppData }); } catch {}
      const path = `${root}/exports/${id}.json`;
      await writeTextFile(path, JSON.stringify(payload, null, 2), { baseDir: BaseDirectory.AppData });
      return true;
    } catch (e) {
      console.warn("export JSON failed:", e);
      return false;
    }
  }

  function openExportSelection() {
    const init: Record<string, boolean> = Object.fromEntries(convs.map(c => [c.id, false]));
    setExportPick(init);
    setShowExportSel(true);
  }
  function toggleExportPick(id: string) { setExportPick(prev => ({ ...prev, [id]: !prev[id] })); }
  function exportPickAll(v: boolean) {
    const next: Record<string, boolean> = {};
    for (const c of convs) next[c.id]=v;
    setExportPick(next);
  }

  async function doExportSelected() {
    const ids = Object.keys(exportPick).filter(id => exportPick[id]);
    if (ids.length === 0) { setShowExportSel(false); return; }

    let ok = 0, fail = 0;
    for (const id of ids) {
      const done = await exportOne(id);
      if (done) ok++; else fail++;
    }

    if (archiverAfterExport && ok > 0) {
      for (const id of ids) { try { await archiveConversation(id); } catch {} }
      await reloadActiveList(setConvs, setActiveId);
    }

    await msgBox(`Export terminé.\nRéussis: ${ok}${fail?` · Échecs: ${fail}`:""}\nChemin: AppData/conversations/exports`, {
      title:"Export", kind: fail? "warning" : "info"
    });
    setShowExportSel(false);
  }

  /* -------- Import fichier JSON -------- */
  async function importFile() {
    try {
      const filepath = await openDialog({ multiple:false, directory:false, filters:[{ name:"Backup JSON", extensions:["json"] }] });
      if (!filepath || Array.isArray(filepath)) return;
      const raw = await readTextFile(filepath);
      const json = JSON.parse(raw);
      const res = await importBackup(json);
      await msgBox(`Import: ${res.imported} conversation(s), renommées: ${res.remapped}.`, { title:"Import", kind:"info" });
      await reloadActiveList(setConvs, setActiveId);
    } catch (e) { await msgBox(`Échec import: ${String(e)}`, { title:"Import", kind:"error" }); }
  }

  /* --------------- Archive (sélection) --------------- */
  function openArchiveSelection() {
    const init: Record<string, boolean> = Object.fromEntries(convs.map(c => [c.id, false]));
    setArchivePick(init);
    setShowArchiveSel(true);
  }
  function toggleArchivePick(id: string) { setArchivePick(prev => ({ ...prev, [id]: !prev[id] })); }
  function archivePickAll(v: boolean) {
    const next: Record<string, boolean> = {};
    for (const c of convs) next[c.id]=v;
    setArchivePick(next);
  }
  async function doArchiveSelected() {
    const ids = Object.keys(archivePick).filter(id => archivePick[id]);
    if (ids.length === 0) { setShowArchiveSel(false); return; }
    for (const id of ids) {
      try { await archiveConversation(id); }
      catch (e) { console.warn("archive failed", id, e); }
    }
    await reloadActiveList(setConvs, setActiveId);
    setShowArchiveSel(false);
  }

  /* ---------------- UI ---------------- */
  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
    {collapsed && (
      <button className="toggle-fab" title="Ouvrir la sidebar (Ctrl+B)" onClick={() => setCollapsed(false)}>☰</button>
    )}

    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
    <div className="sidebar-header" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
    <button className="linkbtn" onClick={() => newChat(false)} disabled={creating}>+ Nouvelle</button>
    <button className="linkbtn" onClick={importFile}>Importer .json</button>
    <button className="linkbtn" onClick={openExportSelection}>Export</button>
    <button className="linkbtn" onClick={openArchiveSelection}>Archiver</button>
    </div>

    <div className="sidebar-controls">
    <ModelSelector
    activeModel={active?.model || model}
    onPick={async (id) => {
      const m = id;
      setModel(m);
      if (active) {
        // UI immédiate
        setConvs(prev => prev.map(c => c.id===active.id ? ({ ...c, model:m }) : c));
        // ✅ Persistance en DB
        try { await updateConversationModel(active.id, m, providerOf(m)); }
        catch(e){ console.error("updateConversationModel failed:", e); }
      }
    }}
    />
    </div>

    <div className="sidebar-controls">
    <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Rechercher…" className="input" />
    </div>

    <div className="sidebar-list">
    {filtered.map(c => (
      <div key={c.id} className={`conv ${c.id===activeId ? "active" : ""}`}
      onClick={() => setActiveId(c.id)} title={c.title || "Nouveau chat"}>
      <div className="conv-title label">
      {c.title || "Nouveau chat"}{" "}
      <span className="small muted">({c.message_count ?? c.messages.length ?? 0})</span>
      </div>
      <div className="small muted">{c.model}</div>
      </div>
    ))}
    </div>
    </aside>

    <main className="main">
    <div className="header">
    <button className="linkbtn" title="Replier/Déplier la sidebar (Ctrl+B)"
    onClick={() => setCollapsed(v=>!v)}>{collapsed ? "›" : "‹"}</button>
    <div className="label">{active?.title || "Nouveau chat"}</div>
    <div className="right"><span className="badge">{active?.model || model}</span></div>
    </div>

    <div className="messages" ref={messagesRef} onScroll={onScroll}>
    <div className="inner">
    {!active || active.messages.length === 0 ? (
      <div className="small muted">Saisis un message pour démarrer.</div>
    ) : (
      active.messages.map((m,i)=>(
        <div key={i} className={`msg anim-in ${m.role}`}>
        <div className="who">
        {m.role==="user"?"Utilisateur":m.role==="assistant"?"Assistant":"Système"}
        <span className="ts">
        {new Date(m.ts || Date.now()).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
        </span>
        </div>
        <div>{m.content}</div>
        </div>
      ))
    )}
    </div>
    {!nearBottom && (
      <button className="go-bottom" aria-label="Aller au dernier message"
      title="Aller au dernier" onClick={() => scrollToBottom(true)} />
    )}
    </div>

    <div className="composer">
    <div className="row">
    <textarea
    ref={textRef} value={draft}
    onChange={(e)=>{ setDraft(e.target.value); autoGrow(e.currentTarget); }}
    onInput={(e)=>autoGrow(e.currentTarget)}
    placeholder="Écrire un message" className="textarea"
    onKeyDown={(e) => {
      if (e.key!=="Enter") { lastEnterTs.current=0; return; }
      if (e.altKey) { e.preventDefault(); onSend(); lastEnterTs.current=0; return; }
      if (e.shiftKey||e.ctrlKey||e.metaKey) return;
      if (e.repeat) return;
      const now = performance.now();
      if (now - lastEnterTs.current <= DOUBLE_MS) { e.preventDefault(); onSend(); lastEnterTs.current=0; }
      else { lastEnterTs.current = now; }
    }}
    />
    <button className="linkbtn" onClick={onSend}>Envoyer</button>
    </div>
    <div className="hint">Entrée ajoute une ligne. Alt+Entrée ou Entrée×2 envoie. Raccourci: Ctrl+B pour la sidebar.</div>
    </div>
    </main>

    {/* Modale Export */}
    {showExportSel && (
      <div className="modal-backdrop" onClick={()=>setShowExportSel(false)}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
      <div className="modal-head">
      <h3>Exporter des conversations</h3>
      <button className="linkbtn" onClick={()=>setShowExportSel(false)}>✕</button>
      </div>

      <div style={{ marginBottom:10, display:"flex", gap:8, alignItems:"center" }}>
      <button className="linkbtn" onClick={()=>exportPickAll(true)}>Tout cocher</button>
      <button className="linkbtn" onClick={()=>exportPickAll(false)}>Tout décocher</button>
      <label style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
      <input type="checkbox" checked={archiverAfterExport}
      onChange={(e)=>setArchiverAfterExport(e.target.checked)} />
      Archiver après export
      </label>
      </div>

      <ul className="modal-list">
      {convs.map(c => (
        <li key={c.id} className="modal-item">
        <label className="modal-check">
        <input type="checkbox" checked={!!exportPick[c.id]}
        onChange={()=>toggleExportPick(c.id)} />
        <span>
        <strong>{c.title || "Nouveau chat"}</strong>
        <br/><span className="small muted">{c.model}</span>
        </span>
        </label>
        <span className="small muted">({c.message_count ?? c.messages.length ?? 0})</span>
        </li>
      ))}
      </ul>

      <div className="modal-actions">
      <button className="linkbtn" onClick={doExportSelected}>Exporter</button>
      </div>
      </div>
      </div>
    )}

    {/* Modale Archiver */}
    {showArchiveSel && (
      <div className="modal-backdrop" onClick={()=>setShowArchiveSel(false)}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
      <div className="modal-head">
      <h3>Archiver des conversations</h3>
      <button className="linkbtn" onClick={()=>setShowArchiveSel(false)}>✕</button>
      </div>

      <div style={{ marginBottom:10, display:"flex", gap:8 }}>
      <button className="linkbtn" onClick={()=>archivePickAll(true)}>Tout cocher</button>
      <button className="linkbtn" onClick={()=>archivePickAll(false)}>Tout décocher</button>
      </div>

      <ul className="modal-list">
      {convs.map(c => (
        <li key={c.id} className="modal-item">
        <label className="modal-check">
        <input type="checkbox" checked={!!archivePick[c.id]}
        onChange={()=>toggleArchivePick(c.id)} />
        <span>
        <strong>{c.title || "Nouveau chat"}</strong>
        <br/><span className="small muted">{c.model}</span>
        </span>
        </label>
        <span className="small muted">({c.message_count ?? c.messages.length ?? 0})</span>
        </li>
      ))}
      </ul>

      <div className="modal-actions">
      <button className="linkbtn" onClick={doArchiveSelected}>Archiver</button>
      </div>
      </div>
      </div>
    )}
    </div>
  );
}
