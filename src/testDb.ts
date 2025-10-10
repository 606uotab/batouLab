import Database from "@tauri-apps/plugin-sql";

export async function testDb() {
  const db = await Database.load("sqlite:conversations.db");
  const res = await db.execute("SELECT 1 as ok");
  console.log("DB ok:", res);
}
