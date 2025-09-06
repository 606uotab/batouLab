import { promises as fs } from 'fs';
import * as path from 'path';
import { maybeEncrypt, maybeDecrypt } from './crypto';

/**
 * Représentation d'un message dans une conversation.
 */
export interface Message {
  /** rôle de l'expéditeur : « user » ou « assistant » */
  role: 'user' | 'assistant';
  /** contenu textuel du message */
  content: string;
  /** horodatage ISO 8601 (Europe/Paris) */
  timestamp: string;
}

/**
 * Structure d'une conversation sauvegardée.
 */
export interface Conversation {
  /** identifiant unique de la conversation */
  id: string;
  /** titre affiché dans la liste (ex. premières paroles) */
  title: string;
  /** agent IA utilisé (ChatGPT, LeChat, Copilot…) */
  agent: string;
  /** mode de travail (Coder, Movie maker, Story maker) */
  mode: string;
  /** date de création au format ISO 8601 */
  created_at: string;
  /** date de mise à jour au format ISO 8601 */
  updated_at: string;
  /** historique des messages */
  messages: Message[];
}

/**
 * Répertoire de base dans lequel les conversations seront enregistrées.  
 * Par défaut, on utilise le dossier d'application de l'utilisateur (`APPDATA` sous Windows,  
 * sinon `HOME`), puis on crée un sous-dossier `.maestro/conversations`.  
 * Cette valeur peut être surchargée via la variable d'environnement `MAESTRO_CONV_DIR`.
 */
const baseDir = process.env.MAESTRO_CONV_DIR || path.join(
  process.env.APPDATA || process.env.HOME || process.cwd(),
  '.maestro',
  'conversations',
);

/**
 * S'assure que le répertoire de stockage existe.  
 * Si le dossier n'existe pas, il est créé récursivement.
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(baseDir, { recursive: true });
  } catch (err) {
    // Si une autre erreur survient, on la propage
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Construit le chemin complet du fichier associé à une conversation.
 */
function conversationPath(id: string): string {
  return path.join(baseDir, `${id}.json`);
}

/**
 * Enregistre une conversation sur le disque.  
 * Si la conversation existe déjà, elle est écrasée.
 * @param conv La conversation à sauvegarder
 */
export async function saveConversation(conv: Conversation): Promise<void> {
  await ensureStorageDir();
  const filePath = conversationPath(conv.id);
  // sérialiser la conversation et chiffrer si une passphrase est définie
  const json = JSON.stringify(conv, null, 2);
  const payload = await maybeEncrypt(json, conv.id);
  await fs.writeFile(filePath, payload, 'utf8');
}

/**
 * Charge une conversation à partir de son identifiant.
 * @param id identifiant de la conversation
 * @returns la conversation ou `null` si le fichier n'existe pas ou est illisible
 */
export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const filePath = conversationPath(id);
    const content = await fs.readFile(filePath, 'utf8');
    // déchiffrer si nécessaire
    const decrypted = await maybeDecrypt(content, id);
    return JSON.parse(decrypted) as Conversation;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Retourne la liste des conversations disponibles.  
 * Chaque conversation est chargée partiellement (seules les métadonnées sont lues)  
 * afin d'éviter de parcourir l'intégralité des messages.
 */
export async function listConversations(): Promise<Conversation[]> {
  await ensureStorageDir();
  const files = await fs.readdir(baseDir);
  const result: Conversation[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(baseDir, file);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // tenter de déchiffrer avant de parser
      let conv: Conversation;
      try {
        const decrypted = await maybeDecrypt(content, file.replace(/\.json$/, ''));
        conv = JSON.parse(decrypted) as Conversation;
      } catch {
        // si déchiffrement ou parsing échoue, on ignore cette entrée
        continue;
      }
      // ne garder que les métadonnées pour l'aperçu
      result.push({
        id: conv.id,
        title: conv.title,
        agent: conv.agent,
        mode: conv.mode,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        messages: [],
      });
    } catch (err) {
      // ignorer les fichiers illisibles
      continue;
    }
  }
  // trier par date de mise à jour décroissante
  result.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return result;
}

/**
 * Supprime une conversation du stockage.
 * @param id identifiant de la conversation à supprimer
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const filePath = conversationPath(id);
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}

/**
 * Exporte une conversation au format texte brut.  
 * Chaque message est précédé de son rôle et horodaté pour une lecture humaine.
 * @param id identifiant de la conversation à exporter
 * @returns une chaîne contenant l'intégralité de la discussion formatée
 */
export async function exportConversationAsText(id: string): Promise<string | null> {
  const conv = await loadConversation(id);
  if (!conv) return null;
  const lines: string[] = [];
  lines.push(`# Conversation : ${conv.title}`);
  lines.push(`Agent : ${conv.agent}, Mode : ${conv.mode}`);
  lines.push(`Créée le : ${conv.created_at}, mise à jour le : ${conv.updated_at}`);
  lines.push('');
  for (const msg of conv.messages) {
    lines.push(`[${msg.timestamp}] ${msg.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${msg.content}`);
  }
  return lines.join('\n');
}

/**
 * Génère un identifiant simple pour une nouvelle conversation.  
 * Cette implémentation utilise l'heure actuelle et un nombre aléatoire ;  
 * pour une solution plus robuste, envisager d'ajouter la dépendance `uuid`.
 */
export function generateConversationId(): string {
  const randomPart = Math.floor(Math.random() * 1e8).toString(16);
  const timePart = Date.now().toString(16);
  return `${timePart}-${randomPart}`;
}