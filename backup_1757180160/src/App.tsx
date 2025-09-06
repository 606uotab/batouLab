import { useState } from "react";
import ChatLite from "./components/ChatLite";
import ApiKeysPage from "./components/ApiKeysPage";

export default function App() {
  const [tab, setTab] = useState<"chat"|"keys">("chat");
  return (
    <div className="h-screen bg-white text-black">
      <header className="border-b p-2 flex gap-2">
        <button onClick={()=>setTab("chat")} className="px-2 py-1 border rounded">Chat</button>
        <button onClick={()=>setTab("keys")} className="px-2 py-1 border rounded">🔑 Clés API</button>
      </header>
      {tab==="chat" ? <ChatLite/> : <ApiKeysPage/>}
    </div>
  );
}
