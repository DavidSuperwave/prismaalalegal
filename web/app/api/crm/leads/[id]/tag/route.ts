import { NextResponse } from "next/server";

import { getDb, nowIsoString, parseJsonArray } from "@/lib/db";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { tag } = (await request.json()) as { tag?: string };

  if (!tag?.trim()) {
    return NextResponse.json({ error: "tag es obligatorio" }, { status: 400 });
  }

  const db = getDb();
  const lead = db.prepare("SELECT tags FROM leads WHERE id = ?").get(params.id) as { tags: string } | undefined;

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const nextTags = Array.from(new Set([...parseJsonArray(lead.tags), tag.trim()]));
  const now = nowIsoString();

  db.prepare("UPDATE leads SET tags = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(nextTags),
    now,
    params.id
  );

  return NextResponse.json({ ok: true, tags: nextTags });
}
