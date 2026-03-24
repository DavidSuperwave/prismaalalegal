import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";
import { storeMemory, TAGS } from "@/lib/supermemory";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const db = getDb();
  const rows = db.prepare("SELECT id, content, category, created_at FROM guidance ORDER BY created_at DESC").all();
  return NextResponse.json({ guidance: rows });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const body = (await request.json()) as { content?: string; category?: string };
  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const category = body.category?.trim() || null;
  const db = getDb();

  // Store in Supermemory
  let supermemoryCustomId: string | null = null;
  try {
    const smResult = await storeMemory(
      content,
      TAGS.SHARED,
      {
        type: "operator_guidance",
        category: category || "general",
        stored_at: nowIsoString(),
      }
    );
    supermemoryCustomId = smResult?.id || smResult?.documentId || null;
  } catch (error) {
    console.error("[Guidance] Supermemory write failed:", error);
  }

  // Store in SQLite
  const result = db.prepare(
    "INSERT INTO guidance (content, category, supermemory_custom_id) VALUES (?, ?, ?)"
  ).run(content, category, supermemoryCustomId);

  const id = db.prepare(
    "SELECT id FROM guidance WHERE rowid = ?"
  ).get(result.lastInsertRowid) as { id: string };

  return NextResponse.json({
    id: id.id,
    content,
    category,
    supermemory_custom_id: supermemoryCustomId,
    created: true,
  });
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare("SELECT supermemory_custom_id FROM guidance WHERE id = ?").get(id) as
    | { supermemory_custom_id: string | null }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Guidance not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM guidance WHERE id = ?").run(id);

  return NextResponse.json({ deleted: true, id });
}
