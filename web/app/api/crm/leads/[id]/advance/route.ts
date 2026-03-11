import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";

const ORDER = ["new", "contacted", "qualified", "consultation", "retained", "closed"] as const;

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const lead = db
    .prepare("SELECT status FROM leads WHERE id = ?")
    .get(params.id) as { status: (typeof ORDER)[number] } | undefined;

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const currentIndex = ORDER.indexOf(lead.status);
  const nextStatus = ORDER[Math.min(currentIndex + 1, ORDER.length - 1)];
  const now = nowIsoString();

  db.prepare(
    `UPDATE leads
      SET status = ?, last_action = ?, last_action_at = ?, updated_at = ?
      WHERE id = ?`
  ).run(nextStatus, `Advanced to ${nextStatus}`, now, now, params.id);

  return NextResponse.json({ ok: true, status: nextStatus });
}
