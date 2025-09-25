import { invoke } from "@tauri-apps/api/core";

export async function createSnapshot(sessionId: string, json: string): Promise<string> {
  return await invoke<string>("create_snapshot", { id: sessionId, json });
}
export async function listSnapshots(sessionId: string): Promise<string[]> {
  return await invoke<string[]>("list_snapshots", { id: sessionId });
}
export async function loadSnapshot(sessionId: string, name: string): Promise<string> {
  return await invoke<string>("load_snapshot", { id: sessionId, name });
}
