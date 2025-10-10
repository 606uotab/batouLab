PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  ts              INTEGER NOT NULL,
  meta            TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conv_ts ON messages(conversation_id, ts);

-- Triggers en une seule “phrase” pour éviter les découpes naïves
CREATE TRIGGER IF NOT EXISTS trg_msg_after_insert
AFTER INSERT ON messages
BEGIN UPDATE conversations
  SET updated_at = COALESCE(NEW.ts, CAST(strftime('%s','now') AS INTEGER)),
      message_count = message_count + 1
  WHERE id = NEW.conversation_id; END;

CREATE TRIGGER IF NOT EXISTS trg_msg_after_delete
AFTER DELETE ON messages
BEGIN UPDATE conversations
  SET message_count = CASE WHEN message_count > 0 THEN message_count - 1 ELSE 0 END
  WHERE id = OLD.conversation_id; END;
