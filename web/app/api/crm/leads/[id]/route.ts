import { NextResponse } from "next/server";

import { getDb, nowIsoString, parseJsonArray } from "@/lib/db";

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: "manychat" | "telegram" | "manual" | "web";
  status: "new" | "contacted" | "qualified" | "consultation" | "retained" | "closed";
  case_type: string | null;
  last_action: string | null;
  last_action_at: string;
  notes: string | null;
  assigned_to: string | null;
  tags: string;
  manychat_subscriber_id: string | null;
  telegram_chat_id: string | null;
  supermemory_id: string | null;
};

function mapLead(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || undefined,
    source: row.source,
    status: row.status,
    caseType: row.case_type || undefined,
    lastAction: row.last_action || "Lead creado",
    lastActionAt: row.last_action_at,
    notes: row.notes || "",
    assignedTo: row.assigned_to || undefined,
    tags: parseJsonArray(row.tags),
    manychatSubscriberId: row.manychat_subscriber_id || undefined,
    telegramChatId: row.telegram_chat_id || undefined,
    supermemoryId: row.supermemory_id || undefined,
  };
}

function getLeadRow(id: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT
        id, name, email, phone, source, status, case_type, last_action, last_action_at, notes,
        assigned_to, tags, manychat_subscriber_id, telegram_chat_id, supermemory_id
      FROM leads
      WHERE id = ?`
    )
    .get(id) as LeadRow | undefined;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const row = getLeadRow(params.id);

  if (!row) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ lead: mapLead(row) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const currentRow = getLeadRow(params.id);

  if (!currentRow) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    source?: LeadRow["source"];
    status?: LeadRow["status"];
    caseType?: string;
    lastAction?: string;
    notes?: string;
    assignedTo?: string;
    tags?: string[];
    manychatSubscriberId?: string;
    telegramChatId?: string;
    supermemoryId?: string;
  };

  const db = getDb();
  const now = nowIsoString();

  db.prepare(
    `UPDATE leads
      SET name = @name,
          email = @email,
          phone = @phone,
          source = @source,
          status = @status,
          case_type = @case_type,
          last_action = @last_action,
          last_action_at = @last_action_at,
          notes = @notes,
          assigned_to = @assigned_to,
          tags = @tags,
          manychat_subscriber_id = @manychat_subscriber_id,
          telegram_chat_id = @telegram_chat_id,
          supermemory_id = @supermemory_id,
          updated_at = @updated_at
      WHERE id = @id`
  ).run({
    id: params.id,
    name: body.name ?? currentRow.name,
    email: body.email ?? currentRow.email,
    phone: body.phone ?? currentRow.phone,
    source: body.source ?? currentRow.source,
    status: body.status ?? currentRow.status,
    case_type: body.caseType ?? currentRow.case_type,
    last_action: body.lastAction ?? currentRow.last_action,
    last_action_at: body.lastAction ? now : currentRow.last_action_at,
    notes: body.notes ?? currentRow.notes,
    assigned_to: body.assignedTo ?? currentRow.assigned_to,
    tags: JSON.stringify(body.tags ?? parseJsonArray(currentRow.tags)),
    manychat_subscriber_id: body.manychatSubscriberId ?? currentRow.manychat_subscriber_id,
    telegram_chat_id: body.telegramChatId ?? currentRow.telegram_chat_id,
    supermemory_id: body.supermemoryId ?? currentRow.supermemory_id,
    updated_at: now,
  });

  const updatedRow = getLeadRow(params.id);
  return NextResponse.json({ lead: updatedRow ? mapLead(updatedRow) : null });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare("DELETE FROM leads WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
