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
  opportunity_value: number | null;
  manychat_subscriber_id: string | null;
  telegram_chat_id: string | null;
  supermemory_id: string | null;
};

function parseOpportunityValue(
  value: unknown,
  fallback: number | null
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: fallback };
  }
  if (value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return { ok: false, error: "opportunityValue must be a non-negative integer (cents) or null" };
  }
  return { ok: true, value };
}

function mapLead(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || undefined,
    source: row.source,
    status: row.status,
    caseType: row.case_type || undefined,
    lastAction: row.last_action || "Lead created",
    lastActionAt: row.last_action_at,
    notes: row.notes || "",
    assignedTo: row.assigned_to || undefined,
    tags: parseJsonArray(row.tags),
    opportunityValue: row.opportunity_value ?? null,
    manychatSubscriberId: row.manychat_subscriber_id || undefined,
    telegramChatId: row.telegram_chat_id || undefined,
    supermemoryId: row.supermemory_id || undefined,
  };
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
        id, name, email, phone, source, status, case_type, last_action, last_action_at, notes,
        assigned_to, tags, opportunity_value, manychat_subscriber_id, telegram_chat_id, supermemory_id
      FROM leads
      ORDER BY datetime(updated_at) DESC`
    )
    .all() as LeadRow[];

  return NextResponse.json({
    leads: rows.map(mapLead),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    source?: "manychat" | "telegram" | "manual" | "web";
    status?: LeadRow["status"];
    caseType?: string;
    lastAction?: string;
    notes?: string;
    assignedTo?: string;
    tags?: string[];
    opportunityValue?: number | null;
    manychatSubscriberId?: string;
    telegramChatId?: string;
    supermemoryId?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Lead name is required" }, { status: 400 });
  }
  const parsedOpportunityValue = parseOpportunityValue(body.opportunityValue, null);
  if (!parsedOpportunityValue.ok) {
    return NextResponse.json({ error: parsedOpportunityValue.error }, { status: 400 });
  }

  const db = getDb();
  const now = nowIsoString();
  const result = db
    .prepare(
      `INSERT INTO leads (
        name, email, phone, source, status, case_type, last_action, last_action_at, notes,
        assigned_to, tags, opportunity_value, manychat_subscriber_id, telegram_chat_id, supermemory_id, created_at, updated_at
      ) VALUES (
        @name, @email, @phone, @source, @status, @case_type, @last_action, @last_action_at, @notes,
        @assigned_to, @tags, @opportunity_value, @manychat_subscriber_id, @telegram_chat_id, @supermemory_id, @created_at, @updated_at
      )`
    )
    .run({
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      source: body.source || "manual",
      status: body.status || "new",
      case_type: body.caseType || null,
      last_action: body.lastAction || "Lead created",
      last_action_at: now,
      notes: body.notes || "",
      assigned_to: body.assignedTo || null,
      tags: JSON.stringify(body.tags || []),
      opportunity_value: parsedOpportunityValue.value,
      manychat_subscriber_id: body.manychatSubscriberId || null,
      telegram_chat_id: body.telegramChatId || null,
      supermemory_id: body.supermemoryId || null,
      created_at: now,
      updated_at: now,
    });

  const row = db
    .prepare(
      `SELECT
        id, name, email, phone, source, status, case_type, last_action, last_action_at, notes,
        assigned_to, tags, opportunity_value, manychat_subscriber_id, telegram_chat_id, supermemory_id
      FROM leads
      WHERE rowid = ?`
    )
    .get(result.lastInsertRowid) as LeadRow;

  return NextResponse.json({ lead: mapLead(row) }, { status: 201 });
}
