export const ANTHROPIC_MODELS = [
  "claude-opus-4-1-20250805",
  "claude-sonnet-4-20250514",
];
export function isAnthropicModel(id: string){ return ANTHROPIC_MODELS.includes(id) || id.startsWith("claude-"); }
