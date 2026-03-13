import "server-only";

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

let db: Database.Database | null = null;

function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH || "./data/template.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function ensureDatabaseDirectory(filePath: string) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'new',
      case_type TEXT,
      last_action TEXT,
      last_action_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      assigned_to TEXT,
      tags TEXT DEFAULT '[]',
      opportunity_value REAL DEFAULT 0,
      manychat_subscriber_id TEXT,
      telegram_chat_id TEXT,
      supermemory_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      contact_name TEXT NOT NULL,
      contact_phone TEXT,
      source TEXT DEFAULT 'manychat',
      last_message TEXT,
      last_message_at TEXT DEFAULT (datetime('now')),
      unread_count INTEGER DEFAULT 0,
      sentiment TEXT DEFAULT 'neutral',
      lead_id TEXT REFERENCES leads(id),
      status TEXT DEFAULT 'active',
      manychat_subscriber_id TEXT,
      telegram_chat_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      channel TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_subscriber ON leads(manychat_subscriber_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_subscriber ON conversations(manychat_subscriber_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, timestamp ASC);
  `);

  try {
    database.exec("ALTER TABLE leads ADD COLUMN opportunity_value REAL DEFAULT 0");
  } catch {
    // Column already exists; ignore for idempotent startup.
  }
}

export function getDb() {
  if (db) {
    return db;
  }

  const databasePath = resolveDatabasePath();
  ensureDatabaseDirectory(databasePath);
  db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  initializeSchema(db);
  return db;
}

export function parseJsonArray(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T extends Record<string, unknown>>(value: string | null | undefined) {
  if (!value) return {} as T;

  try {
    const parsed = JSON.parse(value);
    return (parsed && typeof parsed === "object" ? parsed : {}) as T;
  } catch {
    return {} as T;
  }
}

export function nowIsoString() {
  return new Date().toISOString();
}
