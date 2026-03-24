import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";

const VALID_SETTINGS: Record<string, string[]> = {
  reply_mode: ["manual", "auto"],
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const db = getDb();

  if (key) {
    const row = db.prepare("SELECT key, value, updated_at FROM settings WHERE key = ?").get(key) as
      | { key: string; value: string; updated_at: string }
      | undefined;
    if (!row) return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  const rows = db.prepare("SELECT key, value, updated_at FROM settings").all();
  return NextResponse.json({ settings: rows });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const body = (await request.json()) as { key?: string; value?: string };
  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const allowed = VALID_SETTINGS[key];
  if (allowed && !allowed.includes(value)) {
    return NextResponse.json(
      { error: `Invalid value for ${key}. Allowed: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).run(key, value);

  return NextResponse.json({ key, value, updated: true });
}
