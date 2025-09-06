import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Conv = { id: string; title: string; model: string; messages: Msg[] };

const MODELS = ["mistral-small-latest","mistral-medium-latest","mistral-large-latest"];

export default function ChatLite() {
  const [convs, setConvs] = useState<Conv[]>([
    { id: String(Date.now()), title: "Nouveau chat", model: MODELS[0], messages: [] },
  ]);
  const [active, setActive] = useState(0);
  const [input, setInput] = useState("");

  const cur = convs[active];

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const u: Msg = { role: "user", content: text };
    const before = convs.map((c,i)=> i===active ? {...c, messages:[...c.messages, u]} : c);
    setConvs(before);

    try {
      const reply = await invoke<string>("chat_complete", {
        input: { provider: "mistral", model: cur.model, messages: [...cur.messages, u] }
      });
      const a: Msg = { role: "assistant", content: reply };
      setConvs(cs => cs.map((c,i)=> i===active ? {...c, messages:[...c.messages, a]} : c));
    } catch (e:any) {
      const a: Msg = { role: "assistant", content: `[Erreur API] ${String(e)}` };
      setConvs(cs => cs.map((c,i)=> i===active ? {...c, messages:[...c.messages, a]} : c));
    }
  }

  function nouveau() {
    setConvs(cs => [{ id: String(Date.now()), title: "Nouveau chat", model: MODELS[0], messages: [] }, ...cs]);
    setActive(0);
  }

  return (
    <div className="h-screen flex text-black bg-white">
      <aside className="w-80 border-r overflow-auto p-2 space-y-2">
        <div className="flex gap-2 mb-2">
          <button onClick={nouveau} className="px-2 py-1 border rounded">+ Nouveau</button>
          <select value={cur.model} onChange={e=>{
            const m=e.target.value; setConvs(cs=>cs.map((c,i)=> i===active?{...c,model:m}:c));
          }} className="px-2 py-1 border rounded bg-white">
            {MODELS.map(m=> <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <input placeholder="Rechercher (titre + messages)…" className="w-full px-2 py-1 border rounded"/>
        <div className="mt-2 space-y-1">
          {convs.map((c,i)=>(
            <div key={c.id}
                 onClick={()=>setActive(i)}
                 className={`p-2 border rounded cursor-pointer ${i===active?"bg-gray-100":""}`}>
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="text-xs text-gray-600">{c.model}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cur.messages.length===0 && <div className="text-gray-500">Saisis un message pour démarrer.</div>}
          {cur.messages.map((m,idx)=>(
            <div key={idx} className={`p-3 border rounded ${m.role==="user"?"bg-blue-50":"bg-gray-50"}`}>
              <div className="text-xs mb-1">{m.role==="user"?"Utilisateur":"Assistant"}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
        <form onSubmit={e=>{e.preventDefault(); send();}} className="p-3 border-t flex gap-2">
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="Écrire un message"
            className="flex-1 h-20 px-2 py-2 border rounded"
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }}
          />
          <button type="submit" className="px-3 py-2 border rounded">Envoyer</button>
        </form>
        <div className="px-4 pb-2 text-xs text-gray-600">Entrée pour envoyer. Maj+Entrée pour nouvelle ligne.</div>
      </main>
    </div>
  );
}
