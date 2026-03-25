import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";
const STAGES = ["new", "contacted", "qualified", "consultation", "retained", "closed"] as const;

type Stage = (typeof STAGES)[number];

type LeadRow = {
  id: string;
  name: string;
  notes: string | null;
  status: Stage;
};

type ConversationRow = {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  source: "manychat" | "telegram";
  lead_id: string | null;
};

type ActionBody =
  | {
      action: "create_and_link";
      conversationId: string;
      name?: string;
      email?: string;
      phone?: string;
      stage?: string;
      note?: string;
    }
  | {
      action: "set_stage";
      leadId?: string;
      conversationId?: string;
      stage: string;
    }
  | {
      action: "append_note" | "replace_note";
      leadId?: string;
      conversationId?: string;
      note: string;
    };

function isStage(value: string): value is Stage {
  return STAGES.includes(value as Stage);
}

function getConversation(id: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, contact_name, contact_phone, source, lead_id
      FROM conversations
      WHERE id = ?`
    )
    .get(id) as ConversationRow | undefined;
}

function getLead(id: string) {
  const db = getDb();
  return db
    .prepare("SELECT id, name, notes, status FROM leads WHERE id = ?")
    .get(id) as LeadRow | undefined;
}

function resolveLeadId({
  leadId,
  conversationId,
}: {
  leadId?: string;
  conversationId?: string;
}) {
  if (leadId?.trim()) return leadId.trim();
  if (!conversationId?.trim()) return null;

  const conversation = getConversation(conversationId.trim());
  return conversation?.lead_id || null;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const body = (await request.json()) as ActionBody;
  const db = getDb();
  const now = nowIsoString();

  if (body.action === "create_and_link") {
    if (!body.conversationId?.trim()) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const conversation = getConversation(body.conversationId.trim());
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.lead_id) {
      return NextResponse.json(
        { error: "Conversation already linked to a lead", leadId: conversation.lead_id },
        { status: 409 }
      );
    }

    const stage = body.stage?.trim() || "new";
    if (!isStage(stage)) {
      return NextResponse.json(
        { error: `stage must be one of: ${STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const leadName = body.name?.trim() || conversation.contact_name;
    if (!leadName) {
      return NextResponse.json({ error: "Lead name is required" }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO leads (
          name, email, phone, source, status, case_type, last_action, last_action_at, notes,
          assigned_to, tags, manychat_subscriber_id, telegram_chat_id, supermemory_id, created_at, updated_at
        ) VALUES (
          @name, @email, @phone, @source, @status, NULL, @last_action, @last_action_at, @notes,
          NULL, @tags, NULL, NULL, NULL, @created_at, @updated_at
        )`
      )
      .run({
        name: leadName,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || conversation.contact_phone || null,
        source: "manual",
        status: stage,
        last_action: "Created by agent and linked from inbox conversation",
        last_action_at: now,
        notes: body.note?.trim() || "",
        tags: "[]",
        created_at: now,
        updated_at: now,
      });

    const lead = db
      .prepare("SELECT id FROM leads WHERE rowid = ?")
      .get(result.lastInsertRowid) as { id: string } | undefined;
    if (!lead) {
      return NextResponse.json({ error: "Failed to load created lead" }, { status: 500 });
    }

    db.prepare("UPDATE conversations SET lead_id = ? WHERE id = ?").run(lead.id, conversation.id);

    return NextResponse.json({
      success: true,
      action: body.action,
      leadId: lead.id,
      conversationId: conversation.id,
      stage,
    });
  }

  if (body.action === "set_stage") {
    if (!isStage(body.stage?.trim())) {
      return NextResponse.json(
        { error: `stage must be one of: ${STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const leadId = resolveLeadId({
      leadId: body.leadId,
      conversationId: body.conversationId,
    });
    if (!leadId) {
      return NextResponse.json(
        { error: "leadId or conversationId with linked lead is required" },
        { status: 400 }
      );
    }

    const lead = getLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE leads
        SET status = ?, last_action = ?, last_action_at = ?, updated_at = ?
      WHERE id = ?`
    ).run(body.stage, `Agent set stage to ${body.stage}`, now, now, lead.id);

    return NextResponse.json({
      success: true,
      action: body.action,
      leadId: lead.id,
      stage: body.stage,
    });
  }

  if (body.action === "append_note" || body.action === "replace_note") {
    const note = body.note?.trim();
    if (!note) {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }

    const leadId = resolveLeadId({
      leadId: body.leadId,
      conversationId: body.conversationId,
    });
    if (!leadId) {
      return NextResponse.json(
        { error: "leadId or conversationId with linked lead is required" },
        { status: 400 }
      );
    }

    const lead = getLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updatedNotes =
      body.action === "replace_note"
        ? note
        : `${lead.notes?.trim() ? `${lead.notes.trim()}\n\n` : ""}${note}`;

    db.prepare(
      `UPDATE leads
        SET notes = ?, last_action = ?, last_action_at = ?, updated_at = ?
      WHERE id = ?`
    ).run(
      updatedNotes,
      body.action === "replace_note" ? "Agent replaced notes" : "Agent appended note",
      now,
      now,
      lead.id
    );

    return NextResponse.json({
      success: true,
      action: body.action,
      leadId: lead.id,
    });
  }

  return NextResponse.json(
    {
      error:
        "Unsupported action. Use one of: create_and_link, set_stage, append_note, replace_note",
    },
    { status: 400 }
  );
}
