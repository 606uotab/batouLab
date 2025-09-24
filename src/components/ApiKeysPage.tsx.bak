import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const providerLabels: Record<string, string> = {
  openai: "OpenAI (ChatGPT)",
  mistral: "Mistral (LeChat)",
};

type Provider = "openai" | "mistral";

export default function ApiKeysPage() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [keyInput, setKeyInput] = useState("");
  const [mask, setMask] = useState(true);
  const [status, setStatus] = useState<Record<Provider, boolean>>({ openai: false, mistral: false });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // écouter les changements d'état envoyés par le back au démarrage
    const un = listen("provider_status", (e: any) => {
      const p = (e as any).payload.provider as Provider;
      const ok = !!(e as any).payload.ok;
      setStatus((s) => ({ ...s, [p]: ok }));
    });
    // demander un refresh initial
    invoke("emit_current_status");
    return () => { (un as any).then((f: any) => f()); };
  }, []);

  const looksLikeKey = (p: Provider, k: string) =>
    p === "openai" ? /^sk-[A-Za-z0-9_-]{20,}$/.test(k) : /^mistral-[A-Za-z0-9_-]{20,}$/.test(k);

  async function onTest() {
    setBusy(true); setMsg("");
    try {
      const ok = await invoke<boolean>("validate_api_key", { provider, key: keyInput.trim() });
      setMsg(ok ? "Clé valide." : "Clé invalide.");
    } catch (e: any) {
      setMsg(e?.toString() ?? "Erreur inconnue");
    } finally { setBusy(false); }
  }

  async function onSave() {
    setBusy(true); setMsg("");
    try {
      await invoke("save_api_key", { provider, key: keyInput.trim() });
      // revalider côté back et mettre à jour le statut
      await invoke("refresh_provider_status", { provider });
      setKeyInput("");
      setMsg("Clé enregistrée de façon sécurisée.");
    } catch (e: any) {
      setMsg(e?.toString() ?? "Erreur inconnue");
    } finally { setBusy(false); }
  }

  async function onRemove() {
    setBusy(true); setMsg("");
    try {
      await invoke("remove_api_key", { provider });
      await invoke("refresh_provider_status", { provider });
      setMsg("Clé supprimée localement.");
    } catch (e: any) {
      setMsg(e?.toString() ?? "Erreur inconnue");
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clés API</h1>
        <div className="flex items-center gap-3 text-sm">
          {/** pastilles d'état **/}
          {(["openai","mistral"] as Provider[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status[p] ? "bg-black" : "bg-gray-300"}`} />
              {providerLabels[p]}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-3">
        <label className="text-sm">Fournisseur</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="border border-gray-300 rounded-xl p-2 focus:outline-none"
        >
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="mistral">Mistral (LeChat)</option>
        </select>
      </div>

      <div className="grid gap-3">
        <label className="text-sm">Clé API</label>
        <div className="flex gap-2">
          <input
            className="border border-gray-300 rounded-xl p-2 flex-1 focus:outline-none"
            type={mask ? "password" : "text"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={provider === "openai" ? "sk-..." : "mistral-..."}
          />
          <button
            onClick={() => setMask((m) => !m)}
            className="rounded-xl border border-gray-300 px-3"
            title={mask ? "Afficher" : "Masquer"}
          >{mask ? "👁️" : "🙈"}</button>
        </div>
        <div className="flex gap-2">
          <button
            disabled={!looksLikeKey(provider, keyInput) || busy}
            onClick={onTest}
            className="rounded-xl border border-gray-900 px-4 py-2 disabled:opacity-50"
          >Tester</button>
          <button
            disabled={busy}
            onClick={onSave}
            className="rounded-xl border border-gray-900 px-4 py-2 disabled:opacity-50"
          >Enregistrer</button>
          <button
            disabled={busy}
            onClick={onRemove}
            className="rounded-xl border border-gray-300 px-4 py-2 disabled:opacity-50"
          >Supprimer</button>
        </div>
        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </div>
    </div>
  );
}
