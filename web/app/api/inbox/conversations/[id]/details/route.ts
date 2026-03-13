import { NextResponse } from "next/server";

import { getDb, parseJsonArray, parseJsonObject } from "@/lib/db";

type ConversationWithLeadRow = {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  source: "manychat" | "telegram";
  sentiment: "positive" | "neutral" | "negative" | null;
  status: "active" | "archived";
  lead_id: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_source: "manychat" | "telegram" | "manual" | "web" | null;
  lead_status: "new" | "contacted" | "qualified" | "consultation" | "retained" | "closed" | null;
  lead_case_type: string | null;
  lead_last_action: string | null;
  lead_last_action_at: string | null;
  lead_notes: string | null;
  lead_assigned_to: string | null;
  lead_tags: string | null;
  lead_opportunity_value: number | null;
};

type MessageRow = {
  id: string;
  sender: "contact" | "agent" | "human";
  content: string;
  channel: "manychat" | "telegram" | "web";
  timestamp: string;
  metadata: string;
};

type ActivityItem =
  | {
      type: "message";
      id: string;
      sender: MessageRow["sender"];
      channel: MessageRow["channel"];
      timestamp: string;
      contentPreview: string;
      metadata: Record<string, unknown>;
    }
  | {
      type: "lead_action";
      id: string;
      action: string;
      timestamp: string;
    };

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();

  const row = db
    .prepare(
      `SELECT
        c.id, c.contact_name, c.contact_phone, c.source, c.sentiment, c.status, c.lead_id,
        l.name as lead_name, l.email as lead_email, l.phone as lead_phone, l.source as lead_source,
        l.status as lead_status, l.case_type as lead_case_type, l.last_action as lead_last_action,
        l.last_action_at as lead_last_action_at, l.notes as lead_notes, l.assigned_to as lead_assigned_to,
        l.tags as lead_tags, l.opportunity_value as lead_opportunity_value
      FROM conversations c
      LEFT JOIN leads l ON l.id = c.lead_id
      WHERE c.id = ?`
    )
    .get(params.id) as ConversationWithLeadRow | undefined;

  if (!row) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = db
    .prepare(
      `SELECT id, sender, content, channel, timestamp, metadata
      FROM messages
      WHERE conversation_id = ?
      ORDER BY datetime(timestamp) DESC`
    )
    .all(params.id) as MessageRow[];

  const activity: ActivityItem[] = messages.map((message) => ({
    type: "message",
    id: message.id,
    sender: message.sender,
    channel: message.channel,
    timestamp: message.timestamp,
    contentPreview:
      message.content.length > 180 ? `${message.content.slice(0, 180).trimEnd()}...` : message.content,
    metadata: parseJsonObject<Record<string, unknown>>(message.metadata),
  }));

  if (row.lead_last_action && row.lead_last_action_at) {
    activity.push({
      type: "lead_action",
      id: `lead-action-${row.id}`,
      action: row.lead_last_action,
      timestamp: row.lead_last_action_at,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    conversation: {
      id: row.id,
      contactName: row.contact_name,
      contactPhone: row.contact_phone || undefined,
      source: row.source,
      sentiment: row.sentiment || "neutral",
      status: row.status,
      leadId: row.lead_id || undefined,
    },
    lead: row.lead_id
      ? {
          id: row.lead_id,
          name: row.lead_name || row.contact_name,
          email: row.lead_email || "",
          phone: row.lead_phone || undefined,
          source: row.lead_source || row.source,
          status: row.lead_status || "new",
          caseType: row.lead_case_type || undefined,
          lastAction: row.lead_last_action || "Lead created",
          lastActionAt: row.lead_last_action_at || undefined,
          notes: row.lead_notes || "",
          assignedTo: row.lead_assigned_to || undefined,
          tags: parseJsonArray(row.lead_tags),
          opportunityValue: row.lead_opportunity_value ?? 0,
        }
      : null,
    activity,
  });
}
