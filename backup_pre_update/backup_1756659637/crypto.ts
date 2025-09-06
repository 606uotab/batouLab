import { randomBytes, scrypt as _scrypt, createCipheriv, createDecipheriv, randomFillSync } from 'crypto';

/**
 * Paramètres utilisés pour la dérivation de clé. Bien que la feuille de route
 * spécifie Argon2id, ce module utilise scrypt comme alternative intégrée à
 * Node.js afin d’éviter de dépendre d’un module natif supplémentaire. Les
 * paramètres peuvent être ajustés pour augmenter le coût de calcul.
 */
const KDF_PARAMS = {
  N: 2 ** 15, // coût (16384)
  r: 8,       // bloc mémoire
  p: 1,       // parallélisation
  keyLength: 32 as const,
  saltLength: 16 as const,
};

/** Taille du vecteur d'initialisation (nonce) pour AES-256-GCM. */
const IV_LENGTH = 12;

/**
 * Structure de l'enveloppe chiffrée. La propriété `ct` contient le
 * ciphertext concaténé à l’authTag. Les champs `salt` et `nonce` sont des
 * chaînes encodées en base64. `kdf` décrit les paramètres utilisés pour la
 * dérivation de la clé.
 */
export interface EncryptedEnvelope {
  v: number;
  kdf: {
    method: 'scrypt';
    params: { N: number; r: number; p: number; keyLength: number };
    salt: string;
  };
  nonce: string;
  ct: string;
}

/**
 * Dérive une clé symétrique à partir d’une passphrase et d’un sel à l’aide de
 * scrypt. Le sel doit provenir de `randomBytes` et être unique pour chaque
 * chiffrement. Les paramètres de scrypt sont définis dans `KDF_PARAMS`.
 */
function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    _scrypt(passphrase, salt, KDF_PARAMS.keyLength, { N: KDF_PARAMS.N, r: KDF_PARAMS.r, p: KDF_PARAMS.p }, (err, derivedKey) => {
      if (err || !derivedKey) return reject(err);
      resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Chiffre une chaîne de caractères avec la passphrase donnée. Le résultat est
 * encapsulé dans une enveloppe contenant la version, les paramètres KDF, le
 * sel, le nonce et le ciphertext concaténé avec le tag GCM. Le `aad` peut
 * être utilisé pour intégrer des métadonnées (ex. id ou version) dans
 * l’authentification.
 */
export async function encryptString(data: string, passphrase: string, aad?: Buffer): Promise<EncryptedEnvelope> {
  const salt = randomBytes(KDF_PARAMS.saltLength);
  const key = await deriveKey(passphrase, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // concaténer ciphertext et tag pour simplifier la sérialisation
  const ct = Buffer.concat([ciphertext, tag]).toString('base64');
  return {
    v: 1,
    kdf: { method: 'scrypt', params: { N: KDF_PARAMS.N, r: KDF_PARAMS.r, p: KDF_PARAMS.p, keyLength: KDF_PARAMS.keyLength }, salt: salt.toString('base64') },
    nonce: iv.toString('base64'),
    ct,
  };
}

/**
 * Déchiffre une enveloppe avec la passphrase fournie. Si l'enveloppe ou la
 * passphrase sont invalides, la fonction lève une exception. Le `aad` doit
 * être identique à celui passé à `encryptString`.
 */
export async function decryptString(env: EncryptedEnvelope, passphrase: string, aad?: Buffer): Promise<string> {
  const salt = Buffer.from(env.kdf.salt, 'base64');
  const key = await deriveKey(passphrase, salt);
  const iv = Buffer.from(env.nonce, 'base64');
  const data = Buffer.from(env.ct, 'base64');
  // séparer ciphertext et tag (16 octets pour AES-GCM)
  const tag = data.slice(data.length - 16);
  const ciphertext = data.slice(0, data.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  if (aad) decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Enregistre en mémoire la passphrase courante. Si aucune passphrase n'est
 * définie, les sauvegardes resteront en clair. Ce module ne stocke jamais
 * la clé dérivée sur disque : elle est conservée uniquement en mémoire.
 */
let _passphrase: string | null = null;

export function setPassphrase(passphrase: string): void {
  _passphrase = passphrase;
}

export function clearPassphrase(): void {
  _passphrase = null;
}

export function hasPassphrase(): boolean {
  return _passphrase !== null;
}

/**
 * Chiffre une représentation JSON si une passphrase a été définie, sinon
 * retourne simplement la chaîne. Le champ `aad` peut être utilisé pour
 * authentifier l'identifiant de la conversation.
 */
export async function maybeEncrypt(data: string, id?: string): Promise<string> {
  if (!_passphrase) return data;
  const aad = id ? Buffer.from(id, 'utf8') : undefined;
  const envelope = await encryptString(data, _passphrase, aad);
  return JSON.stringify(envelope);
}

/**
 * Tente de déchiffrer une chaîne JSON. Si elle représente une enveloppe
 * chiffrée et qu'une passphrase est connue, elle est déchiffrée. Sinon, la
 * chaîne est retournée telle quelle.
 */
export async function maybeDecrypt(data: string, id?: string): Promise<string> {
  try {
    const parsed = JSON.parse(data);
    if (parsed && parsed.v === 1 && parsed.kdf) {
      if (!_passphrase) {
        throw new Error('Passphrase requise pour déchiffrer ce contenu');
      }
      const aad = id ? Buffer.from(id, 'utf8') : undefined;
      return await decryptString(parsed as EncryptedEnvelope, _passphrase!, aad);
    }
    // ce n'est pas une enveloppe chiffrée
    return data;
  } catch (err) {
    // si le JSON est invalide, on renvoie tel quel
    return data;
  }
}