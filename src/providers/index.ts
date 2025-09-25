export type Provider = "mistral" | "anthropic" | "openai";
export function detectProvider(model: string): Provider {
  const m = (model||"").toLowerCase();
  if (m.startsWith("claude-")) return "anthropic";
  if (m.startsWith("gpt-") || m.startsWith("o3") || m.startsWith("o4") || m==="computer-use-preview") return "openai";
  return "mistral";
}
