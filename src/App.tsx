import "./styles.css";
import { useState } from "react";
import ApiKeysPage from "./components/ApiKeysPage";
import ChatWithHistory from "./components/ChatWithHistory";

export default function App() {
  const [tab, setTab] = useState<"chat" | "keys">("chat");

  return (
    <div className="app-root">
    <nav className="topbar">
    <button className={tab==="chat"?"tab tab--active":"tab"} onClick={()=>setTab("chat")}>Chat</button>
    <button className={tab==="keys"?"tab tab--active":"tab"} onClick={()=>setTab("keys")}>🔑 Clés API</button>
    </nav>
    <main>
    {tab === "chat" ? <ChatWithHistory /> : <ApiKeysPage />}
    </main>
    </div>
  );
}
