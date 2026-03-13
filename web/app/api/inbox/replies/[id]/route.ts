import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { storeApprovedReply } from "@/lib/supermemory";

type ReplyRow = {
  id: string;
  conversation_id: string;
  message_id: string | null;
  agent_draft: string | null;
  operator_edit: string | null;
  final_text: string;
  status: "pending" | "approved" | "sent" | "failed";
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  contact_phone: string | null;
  source: string;
};

function selectReply(id: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         r.id, r.conversation_id, r.message_id, r.agent_draft, r.operator_edit, r.final_text,
         r.status, r.approved_at, r.sent_at, r.created_at, r.updated_at, c.contact_phone, c.source
       FROM replies r
       JOIN conversations c ON c.id = r.conversation_id
       WHERE r.id = ?
       LIMIT 1`
    )
    .get(id) as ReplyRow | undefined;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const reply = selectReply(params.id);
  if (!reply) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }
  return NextResponse.json({ reply });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as {
    status?: "pending" | "approved" | "sent" | "failed";
    operator_edit?: string | null;
  };

  const allowed = new Set(["pending", "approved", "sent", "failed"]);
  if (body.status && !allowed.has(body.status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const current = selectReply(params.id);
  if (!current) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  const now = nowIsoString();
  const db = getDb();
  const nextStatus = body.status || current.status;
  db.prepare(
    `UPDATE replies
      SET status = ?,
          operator_edit = CASE WHEN ? = 1 THEN ? ELSE operator_edit END,
          approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
          sent_at = CASE WHEN ? = 'sent' THEN ? ELSE sent_at END,
          updated_at = ?
      WHERE id = ?`
  ).run(
    nextStatus,
    body.operator_edit !== undefined ? 1 : 0,
    body.operator_edit ?? null,
    nextStatus,
    now,
    nextStatus,
    now,
    now,
    params.id
  );

  const updated = selectReply(params.id);

  if (updated && nextStatus === "sent") {
    try {
      await storeApprovedReply({
        clientMessage: "",
        agentDraft: updated.agent_draft || updated.final_text,
        sentReply: updated.final_text,
        leadPhone: updated.contact_phone || "",
        channel: updated.source || "manychat",
        topic: "general",
      });
    } catch (error) {
      console.error("Reply learning write failed (non-blocking):", error);
    }
  }

  return NextResponse.json({ success: true, reply: updated });
}
