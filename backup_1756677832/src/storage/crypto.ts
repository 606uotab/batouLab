// Stub temporaire côté renderer (pas d'API Node ici).
let memPassphrase: string | null = null;

export function setPassphrase(p: string) { memPassphrase = p || null; }
export function clearPassphrase() { memPassphrase = null; }
export async function hasPassphrase(): Promise<boolean> { return !!memPassphrase; }

// Exposé provisoire tant que le chiffrement Rust n'est pas branché.
export function _getPassphraseUnsafe(): string | null { return memPassphrase; }
