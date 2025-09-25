import { readTextFile, writeTextFile, mkdir, remove, readDir, BaseDirectory } from "@tauri-apps/plugin-fs";
export type Role="user"|"assistant"|"system";
export type Message={role:Role;content:string;ts:number};
export type Conversation={id:string;title:string;provider:"openai"|"mistral"|"anthropic";model:string;createdAt:number;updatedAt:number;messages:Message[]};
type ConversationMeta={id:string;title:string;provider:Conversation["provider"];model:string;createdAt:number;updatedAt:number;size?:number};
export type ConversationIndex={version:1;conversations:ConversationMeta[]};
const baseDir=BaseDirectory.AppData, DIR="conversations", INDEX=`${DIR}/index.json`, fileOf=(id:string)=>`${DIR}/${id}.json`;
async function ensureDir(){try{await mkdir(DIR,{baseDir,recursive:true});}catch{}}
export async function loadIndex(){await ensureDir();try{const raw=await readTextFile(INDEX,{baseDir});const j=JSON.parse(raw);if(j?.version===1&&Array.isArray(j.conversations))return j;}catch{}return{version:1,conversations:[]};}
export async function loadConversation(id:string){try{const raw=await readTextFile(fileOf(id),{baseDir});return JSON.parse(raw);}catch{return null;}}
let t:number|undefined;function saveIndexThrottled(idx:ConversationIndex){if(t)clearTimeout(t);t=window.setTimeout(()=>{void writeTextFile(INDEX,JSON.stringify(idx,null,2),{baseDir});},250);}
export async function upsertConversation(c:Conversation){await ensureDir();await writeTextFile(fileOf(c.id),JSON.stringify(c,null,2),{baseDir});const idx=await loadIndex();const meta:ConversationMeta={id:c.id,title:c.title,provider:c.provider,model:c.model,createdAt:c.createdAt,updatedAt:c.updatedAt,size:c.messages.length};const i=idx.conversations.findIndex(x=>x.id===c.id);if(i>=0)idx.conversations[i]=meta;else idx.conversations.unshift(meta);saveIndexThrottled(idx);}
export async function deleteConversation(id:string){await remove(fileOf(id),{baseDir});const idx=await loadIndex();idx.conversations=idx.conversations.filter(x=>x.id!==id);saveIndexThrottled(idx);}
export async function renameConversation(id:string,title:string){const c=await loadConversation(id);if(!c)return;c.title=title;c.updatedAt=Date.now();await upsertConversation(c);}
export async function reconcileIndex(){await ensureDir();const entries=await readDir(DIR,{baseDir});const ids=entries.filter(e=>e.name?.endsWith(".json")).map(e=>e.name!.replace(".json",""));const convs:ConversationMeta[]=[];for(const id of ids){const c=await loadConversation(id);if(c)convs.push({id:c.id,title:c.title,provider:c.provider,model:c.model,createdAt:c.createdAt,updatedAt:c.updatedAt,size:c.messages.length});}saveIndexThrottled({version:1,conversations:convs.sort((a,b)=>b.updatedAt-a.updatedAt)});}
