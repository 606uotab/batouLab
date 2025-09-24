export const OPENAI_MODELS = [
  "gpt-5","gpt-5-mini","gpt-5-nano",
  "gpt-4.1-o3-deep-research","o4-mini-deep-research",
  "gpt-oss-120b","gpt-oss-20b",
  "computer-use-preview",
];
export function isOpenAIModel(id: string){
  const m = id.toLowerCase();
  return OPENAI_MODELS.includes(id) || m.startsWith("gpt-") || m.startsWith("o3") || m.startsWith("o4");
}
export function prefersResponsesAPI(id: string){
  const m = id.toLowerCase();
  return m.startsWith("gpt-5") || m.includes("deep-research") || m==="computer-use-preview";
}
