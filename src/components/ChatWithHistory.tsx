// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModelSelector from "./ModelSelector";
<<<<<<< HEAD

type Role = "user" | "assistant" | "system";
type Message = { role: Role; content: string; ts?: number };
type Conversation = {
  id: string;
  title: string;
  provider: "mistral";
  model: string;
  messages: Message[];
};

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatWithHistory() {
=======
import { runtimeKeys } from "../runtimeKeys";

type Role = "user" | "assistant" | "system";
type Message = { role: Role; content: string; ts?: number };
type Conversation = { id: string; title: string; model: string; messages: Message[] };

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const providerOf = (m: string) => m.startsWith("gpt-") ? "openai" : m.startsWith("claude-") ? "anthropic" : "mistral";
const DOUBLE_MS = 320;

export default function ChatWithHistory(){
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [model, setModel] = useState<string>("mistral-small-latest");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
<<<<<<< HEAD
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("ui.collapsed") === "1"; } catch { return false; }
  });
  const [nearBottom, setNearBottom] = useState(true);

  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Double-Entrée pour envoyer
  const lastEnterTs = useRef<number>(0);
  const DOUBLE_ENTER_MS = 320;

  const active = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);

  useEffect(() => { if (convs.length === 0) newChat(); }, []);

  useEffect(() => {
    try { localStorage.setItem("ui.collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault(); setCollapsed((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function newChat() {
    const id = uuid();
    const c: Conversation = { id, title: "Nouveau chat", provider: "mistral", model, messages: [] };
    setConvs((prev) => [c, ...prev]);
    setActiveId(id);
    setDraft("");
    queueMicrotask(() => textRef.current?.focus());
  }

  function removeChat(id: string) {
    setConvs((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      const next = convs.find((c) => c.id !== id);
      setActiveId(next?.id || "");
    }
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

    const userMsg: Message = { role: "user", content: msg, ts: Date.now() };
    setConvs((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, userMsg] } : c))
    );
    setTitleOnFirstUser(active.id, msg);
    setDraft("");
    scrollToBottom(true);

    try {
      const payload = [...active.messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const reply = await invoke<string>("chat_complete", {
        input: { provider: "mistral", model: active.model || model, messages: payload },
      });
      const assistant: Message = { role: "assistant", content: String(reply ?? ""), ts: Date.now() };
      setConvs((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, assistant] } : c))
      );
      scrollToBottom(true);
    } catch (e: any) {
      const errText = typeof e === "string" ? e : (e?.message ?? e?.toString?.() ?? "Erreur inconnue");
      const assistant: Message = { role: "assistant", content: `[Erreur API] ${errText}`, ts: Date.now() };
      setConvs((prev) =>
        prev.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, assistant] } : c))
      );
      scrollToBottom(true);
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

  function autoGrow(t: HTMLTextAreaElement | null) {
    if (!t) return;
    t.style.height = "auto";
    const h = Math.min(200, t.scrollHeight);
    t.style.height = `${h}px`;
  }
  useEffect(() => { autoGrow(textRef.current); }, [draft]);

  function handleScroll() {
    const el = messagesRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    setNearBottom(gap <= 32);
  }

  function scrollToBottom(force = false) {
    const el = messagesRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    if (force || gap <= 32) {
      el.scrollTop = el.scrollHeight;
      setNearBottom(true);
    }
  }

  useEffect(() => { scrollToBottom(false); }, [activeId, active?.messages.length]);

  function exportTxt(id: string) {
    const c = convs.find((x) => x.id === id);
    if (!c) return;
    const lines = c.messages.map((m) => `[${m.role}] ${m.content}`).join("\\n\\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = (c.title || "conversation") + ".txt";
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      {collapsed && (
        <button className="toggle-fab" title="Ouvrir la sidebar (Ctrl+B)" onClick={() => setCollapsed(false)}>☰</button>
      )}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <button className="linkbtn" onClick={newChat}>+ Nouveau</button>
        </div>

        <div className="sidebar-controls">
          <ModelSelector
            activeModel={active?.model || model}
            onPick={(id) => {
              const m = id;
              setModel(m);
              if (active) {
                setConvs((prev) => prev.map((c) => (c.id === active.id ? { ...c, model: m } : c)));
              }
            }}
          />
        </div>

        <div className="sidebar-controls">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="input"
          />
        </div>

        <div className="sidebar-list">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`conv ${c.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(c.id)}
              title={c.title || "Nouveau chat"}
            >
              <div className="conv-title label">{c.title || "Nouveau chat"}</div>
              <div className="conv-actions">
                <button className="linkbtn small" onClick={(e) => { e.stopPropagation(); exportTxt(c.id); }}>Exporter</button>
                <button className="linkbtn small" onClick={(e) => { e.stopPropagation(); removeChat(c.id); }}>×</button>
              </div>
              <div className="small muted">{c.model}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="header">
          <button
            className="linkbtn"
            title="Replier/Déplier la sidebar (Ctrl+B)"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "›" : "‹"}
          </button>
          
          <div className="label">{active?.title || "Nouveau chat"}</div>
          <div className="right">
            <span className="badge">{active?.model || model}</span>
          </div>
        </div>

        <div className="messages" ref={messagesRef} onScroll={handleScroll}>
          <div className="inner">
            {!active || active.messages.length === 0 ? (
              <div className="small muted">Saisis un message pour démarrer.</div>
            ) : (
              active.messages.map((m, i) => (
                <div key={i} className={`msg anim-in ${m.role}`}>
                  <div className="who">
                    {m.role === "user" ? "Utilisateur" : m.role === "assistant" ? "Assistant" : "Système"}
                    <span className="ts">{new Date(m.ts || Date.now()).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"})}</span>
                  </div>
                  <div>{m.content}</div>
                </div>
              ))
            )}
          </div>

          {!nearBottom && (
            <button
              className="go-bottom"
              aria-label="Aller au dernier message"
              title="Aller au dernier"
              onClick={() => scrollToBottom(true)}
            />
=======
  const [collapsed, setCollapsed] = useState<boolean>(()=>{ try { return localStorage.getItem("ui.collapsed")==="1"; } catch { return false; }});

  const messagesRef = useRef<HTMLDivElement|null>(null);
  const textRef = useRef<HTMLTextAreaElement|null>(null);
  const lastEnterTs = useRef<number>(0);
  const nearBottom = useRef<boolean>(true);

  const active = useMemo(()=>convs.find(c=>c.id===activeId)||null,[convs,activeId]);

  useEffect(()=>{ if(convs.length===0) newChat(); },[]);
  useEffect(()=>{ try { localStorage.setItem("ui.collapsed", collapsed?"1":"0"); } catch{} },[collapsed]);

  function newChat(){
    const id = uuid();
    const c: Conversation = { id, title: "Nouveau chat", model, messages: [] };
    setConvs(prev=>[c,...prev]); setActiveId(id); setDraft("");
    queueMicrotask(()=>{ textRef.current?.focus(); autoGrow(textRef.current); });
  }
  function removeChat(id:string){
    setConvs(prev=>prev.filter(c=>c.id!==id));
    if(id===activeId){ setActiveId(convs.find(c=>c.id!==id)?.id || ""); }
  }
  function setTitleOnFirstUser(id:string, t:string){
    setConvs(prev=>prev.map(c=>c.id===id && (c.title==="Nouveau chat"||!c.title.trim()) ? ({...c,title:t.slice(0,48)}) : c));
  }

  function onScroll(){
    const el=messagesRef.current; if(!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    nearBottom.current = gap <= 32;
  }
  function scrollToBottom(force=false){
    const el=messagesRef.current; if(!el) return;
    if(force || nearBottom.current){ el.scrollTop = el.scrollHeight; }
  }
  function autoGrow(t: HTMLTextAreaElement | null){
    if(!t) return;
    t.style.height = "auto";
    const h = Math.min(200, t.scrollHeight);
    t.style.height = h+"px";
    t.style.overflowY = (h>=200) ? "auto" : "hidden";
  }

  async function onSend(){
    const msg = draft.trim(); if(!active || !msg) return;
    const userMsg: Message = { role:"user", content: msg, ts: Date.now() };
    setConvs(prev=>prev.map(c=>c.id===active.id?{...c, messages:[...c.messages, userMsg]}:c));
    setTitleOnFirstUser(active.id, msg);
    setDraft(""); autoGrow(textRef.current); scrollToBottom(true);

    try{
      const prov = providerOf(active.model || model);
      const key = prov==="openai" ? runtimeKeys.openai : prov==="anthropic" ? runtimeKeys.anthropic : runtimeKeys.mistral;
      if(!key) throw new Error(`Clé ${prov} manquante`);
      const payload = [...active.messages, userMsg].map(m=>({ role:m.role, content:m.content }));
      const reply: string = await invoke("chat_complete", { input: { provider: prov, model: active.model || model, api_key: key, messages: payload } });
      const assistant: Message = { role:"assistant", content:String(reply??""), ts: Date.now() };
      setConvs(prev=>prev.map(c=>c.id===active.id?{...c, messages:[...c.messages, assistant]}:c));
      scrollToBottom(true);
    }catch(e:any){
      const t = typeof e==="string"? e : (e?.message ?? e?.toString?.() ?? "Erreur inconnue");
      const assistant: Message = { role:"assistant", content:`[Erreur API] ${t}`, ts: Date.now() };
      setConvs(prev=>prev.map(c=>c.id===active.id?{...c, messages:[...c.messages, assistant]}:c));
      scrollToBottom(true);
    }finally{
      queueMicrotask(()=>textRef.current?.focus());
    }
  }

  const filtered = useMemo(()=>{
    const q=search.trim().toLowerCase(); if(!q) return convs;
    return convs.filter(c=>{
      const hitTitle=(c.title||"").toLowerCase().includes(q);
      const hitMsg=(c.messages||[]).some(m=>(m.content||"").toLowerCase().includes(q));
      return hitTitle||hitMsg;
    });
  },[convs,search]);

  return (
    <div className={`app ${collapsed?"collapsed":""}`}>
      {/* Sidebar */}
      {collapsed ? null : (
        <aside style={{overflow:"auto", borderRight:"1px solid #eee"}}>
          <div style={{padding:"8px"}}><button className="linkbtn" onClick={newChat}>+ Nouveau</button></div>
          <div style={{padding:"8px"}}>
            <ModelSelector
              activeModel={active?.model || model}
              onPick={(id)=>{ const m=id; setModel(m); if(active) setConvs(prev=>prev.map(c=>c.id===active.id?{...c, model:m}:c)); }}
            />
          </div>
          <div style={{padding:"8px"}}><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Rechercher…" className="input"/></div>
          <div style={{padding:"8px"}}>
            {filtered.map(c=>(
              <div key={c.id} className={`conv ${c.id===activeId?"active":""}`} onClick={()=>setActiveId(c.id)} title={c.title||"Nouveau chat"}>
                <div className="conv-title label">{c.title||"Nouveau chat"}</div>
                <div className="conv-actions"><button className="linkbtn small" onClick={(e)=>{e.stopPropagation(); removeChat(c.id);}}>×</button></div>
                <div className="small muted">{c.model}</div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main: header, messages (scroll), composer fixe */}
      <main className="main">
        <div className="header">
          <button className="linkbtn" onClick={()=>setCollapsed(v=>!v)}>{collapsed?"☰":"‹"}</button>
          <div className="label">{active?.title || "Nouveau chat"}</div>
          <div style={{marginLeft:"auto"}}><span className="badge">{active?.model || model}</span></div>
        </div>

        <div className="messages" ref={messagesRef} onScroll={onScroll}>
          {!active || active.messages.length===0 ? (
            <div className="small muted">Saisis un message pour démarrer.</div>
          ) : (
            active.messages.map((m,i)=>(
              <div key={i} className={`msg ${m.role}`} style={{margin:"10px 0"}}>
                <div className="who small muted" style={{marginBottom:4}}>
                  {m.role==="user"?"Utilisateur":m.role==="assistant"?"Assistant":"Système"}
                  <span style={{marginLeft:6}}>{new Date(m.ts || Date.now()).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div>{m.content}</div>
              </div>
            ))
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
          )}
        </div>

        <div className="composer">
<<<<<<< HEAD
          <div className="row">
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onInput={(e) => autoGrow(e.currentTarget)}
              placeholder="Écrire un message"
              className="textarea"
              onKeyDown={(e) => {
                if (e.key !== "Enter") { lastEnterTs.current = 0; return; }
                if (e.altKey) { e.preventDefault(); onSend(); lastEnterTs.current = 0; return; }
                if (e.repeat) return;
                const now = performance.now();
                if (now - lastEnterTs.current <= DOUBLE_ENTER_MS) {
                  e.preventDefault();
                  onSend();
                  lastEnterTs.current = 0;
                } else {
                  lastEnterTs.current = now;
                }
=======
          <div style={{display:"flex", gap:8}}>
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e)=>{ setDraft(e.target.value); autoGrow(e.currentTarget); }}
              onInput={(e)=>autoGrow(e.currentTarget)}
              placeholder="Écrire un message"
              className="textarea"
              style={{flex:1, resize:"none", minHeight:44, maxHeight:200, overflowY:"hidden"}}
              onKeyDown={(e)=>{
                if(e.key!=="Enter"){ lastEnterTs.current=0; return; }
                if(e.altKey){ e.preventDefault(); onSend(); lastEnterTs.current=0; return; }
                if(e.shiftKey || e.ctrlKey || e.metaKey) return; // Enter = newline
                const now = performance.now();
                if(now - lastEnterTs.current <= DOUBLE_MS){
                  e.preventDefault(); onSend(); lastEnterTs.current=0; return;
                }
                lastEnterTs.current = now; // 1er Enter: ne pas empêcher -> ajoute une ligne
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
              }}
            />
            <button className="linkbtn" onClick={onSend}>Envoyer</button>
          </div>
<<<<<<< HEAD
          <div className="hint">Entrée ajoute une ligne. Alt+Entrée ou Entrée×2 envoie. Raccourci: Ctrl+B pour basculer la sidebar.</div>
=======
          <div className="small muted" style={{marginTop:6}}>
            Entrée = nouvelle ligne · Entrée×2 ou Alt+Entrée = envoyer
          </div>
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
        </div>
      </main>
    </div>
  );
}
<<<<<<< HEAD

=======
>>>>>>> 8b0e35b (chore: release v0.0.3-alpha)
