import React,{useEffect,useState}from"react";
import{loadIndex,loadConversation,upsertConversation,deleteConversation,type Conversation,type Message}from"../storage/storage.fs";
const uuid=()=>crypto.randomUUID();
export default function PersistedChat(){
  const[index,setIndex]=useState<{version:1;conversations:any[]}>({version:1,conversations:[]});
  const[active,setActive]=useState<Conversation|null>(null);
  const[input,setInput]=useState("");
  useEffect(()=>{(async()=>{const idx=await loadIndex();setIndex(idx);const first=idx.conversations[0];if(first)setActive(await loadConversation(first.id));else await newChat();})()},[]);
  async function newChat(){const id=uuid();const c:Conversation={id,title:"Nouveau chat",provider:"mistral",model:"mistral-small-latest",createdAt:Date.now(),updatedAt:Date.now(),messages:[]};await upsertConversation(c);setIndex(await loadIndex());setActive(c);}
  async function send(){if(!active||!input.trim())return;const m:Message={role:"user",content:input.trim(),ts:Date.now()};const c={...active,updatedAt:Date.now(),messages:[...active.messages,m]};setInput("");setActive(c);await upsertConversation(c);setIndex(await loadIndex());}
  async function open(id:string){setActive(await loadConversation(id));}
  async function remove(id:string){await deleteConversation(id);const idx=await loadIndex();setIndex(idx);setActive(idx.conversations[0]?await loadConversation(idx.conversations[0].id):null);}
  return(<div className="flex h-screen"><aside className="w-64 border-r overflow-y-auto"><div className="p-2 flex gap-2"><button onClick={newChat} className="px-2 py-1 border rounded">+ Nouvelle</button></div><ul>{index.conversations.map((c:any)=>(<li key={c.id} className={"p-2 border-b cursor-pointer "+(active?.id===c.id?"bg-gray-100":"")} onClick={()=>open(c.id)}><div className="text-sm font-medium">{c.title}</div><div className="text-xs text-gray-500">{new Date(c.updatedAt).toLocaleString()}</div><button onClick={(e)=>{e.stopPropagation();void remove(c.id);}} className="text-xs text-red-600">Supprimer</button></li>))}</ul></aside><main className="flex-1 flex flex-col"><header className="p-2 border-b flex justify-between"><div>{active?.title??"Aucune conversation"}</div></header><div className="flex-1 overflow-y-auto p-4 space-y-3">{active?.messages.map((m,i)=>(<div key={i} className="p-2 border rounded"><div className="text-xs text-gray-500">{m.role} · {m.ts?new Date(m.ts).toLocaleString():""}</div><div>{m.content}</div></div>))}</div><footer className="p-2 border-t flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Écrire…"/><button onClick={send} className="px-3 py-1 border rounded">Envoyer</button></footer></main></div>);
}
