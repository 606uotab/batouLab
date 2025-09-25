import { useEffect, useState } from "react";
import { setPassphrase, clearPassphrase, hasPassphrase } from "../storage/crypto";

export default function PassphraseManager() {
  // ✅ boolean, pas Promise<boolean>
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");

  // Au démarrage, on vérifie si une passphrase est déjà définie
  useEffect(() => {
    (async () => {
      const ok = await hasPassphrase();
      setUnlocked(ok);
    })();
  }, []);

  const onUnlock = async () => {
    if (!input.trim()) return;
    await setPassphrase(input.trim());
    setInput("");
    setUnlocked(true);
  };

  const onLock = async () => {
    await clearPassphrase();
    setUnlocked(false);
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {unlocked ? (
        <>
          <span>🔓 Déverrouillé</span>
          <button onClick={onLock}>Verrouiller</button>
        </>
      ) : (
        <>
          <input
            type="password"
            placeholder="Passphrase…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ padding: "6px 8px" }}
          />
          <button onClick={onUnlock} disabled={!input.trim()}>
            Déverrouiller
          </button>
        </>
      )}
    </div>
  );
}
