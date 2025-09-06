import { useState } from "react";
import ApiKeysPage from "./components/ApiKeysPage";
import ChatLite from "./components/ChatLite";
export default function App() {
  const [tab, setTab] = useState<"chat"|"keys">("chat");
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <div style={{ display:"flex", gap:8, padding:8, background:"#f5f5f5", borderBottom:"1px solid #e5e5e5" }}>
        <button onClick={()=>setTab("chat")}>💬 Chat</button>
        <button onClick={()=>setTab("keys")}>🔑 Clés API</button>
      </div>
      {tab==="chat" ? <ChatLite/> : <ApiKeysPage/>}
    </div>
  );
}
