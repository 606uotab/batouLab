export const MISTRAL_MODELS = [
  "mistral-small-latest","mistral-medium-latest","magistral-medium-latest",
  "codestral-latest","devstral-medium-latest","pixtral-large-latest",
  "mistral-ocr-latest","mistral-moderation-latest",
  "magistral-small-latest","devstral-small-latest",
  "mistral-large-latest","ministral-8b-latest","ministral-3b-latest",
  "voxtral-small-latest","voxtral-mini-latest","open-mistral-nemo","mistral-saba-latest",
];
export function isMistralModel(id: string){ return MISTRAL_MODELS.includes(id); }
