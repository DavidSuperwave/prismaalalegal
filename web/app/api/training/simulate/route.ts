import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";

type MessageRow = {
  sender: string;
  content: string;
  timestamp: string;
};

type ConversationRow = {
  id: string;
  contact_name: string;
  lead_id: string | null;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const body = (await request.json()) as {
    contact_name?: string;
    conversation_id?: string;
  };

  const db = getDb();
  const now = nowIsoString();
  let conversation: ConversationRow | undefined;

  if (body.conversation_id) {
    conversation = db.prepare(
      "SELECT id, contact_name, lead_id FROM conversations WHERE id = ?"
    ).get(body.conversation_id) as ConversationRow | undefined;

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else if (body.contact_name) {
    const searchTerm = `%${body.contact_name.trim()}%`;
    const matches = db.prepare(
      "SELECT id, contact_name, lead_id FROM conversations WHERE contact_name LIKE ? ORDER BY datetime(last_message_at) DESC LIMIT 5"
    ).all(searchTerm) as ConversationRow[];

    if (matches.length === 0) {
      return NextResponse.json({ error: "No conversations found matching that name" }, { status: 404 });
    }

    if (matches.length > 1) {
      return NextResponse.json({
        disambiguation: true,
        candidates: matches.map((m) => ({ id: m.id, contact_name: m.contact_name })),
        message: `Found ${matches.length} matches. Please specify which one.`,
      });
    }

    conversation = matches[0];
  } else {
    return NextResponse.json(
      { error: "contact_name or conversation_id is required" },
      { status: 400 }
    );
  }

  // Load last 20 messages
  const messages = db.prepare(
    `SELECT sender, content, timestamp FROM messages
     WHERE conversation_id = ? ORDER BY datetime(timestamp) DESC LIMIT 20`
  ).all(conversation.id) as MessageRow[];

  messages.reverse();

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages found in this conversation" }, { status: 404 });
  }

  // Infer category from conversation content
  const allContent = messages.map((m) => m.content).join(" ").toLowerCase();
  let inferredCategory = "general";
  if (allContent.includes("fallec") || allContent.includes("muerte")) inferredCategory = "accidente_mortal";
  else if (allContent.includes("lesion") || allContent.includes("herida")) inferredCategory = "lesiones_graves";
  else if (allContent.includes("seguro") || allContent.includes("póliza") || allContent.includes("poliza") || allContent.includes("negativa")) inferredCategory = "negativa_aseguradora";
  else if (allContent.includes("fuga") || allContent.includes("huir")) inferredCategory = "fuga_conductor";
  else if (allContent.includes("trabajo") || allContent.includes("laboral")) inferredCategory = "accidente_laboral";

  // Convert to training exchange format
  const exchanges: Array<{ customer_message: string; agent_reply: string }> = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].sender === "contact" && messages[i + 1].sender !== "contact") {
      exchanges.push({
        customer_message: messages[i].content,
        agent_reply: messages[i + 1].content,
      });
    }
  }

  // Create training session
  const sessionData = {
    category: inferredCategory,
    exchanges,
    corrections: [] as Array<{ index: number; original: string; corrected: string }>,
    started_at: now,
    source_conversation_id: conversation.id,
    source_contact_name: conversation.contact_name,
  };

  db.prepare(
    `INSERT INTO training_sessions (status, data, created_at, updated_at)
     VALUES ('active', ?, ?, ?)`
  ).run(JSON.stringify(sessionData), now, now);

  const session = db.prepare(
    "SELECT id FROM training_sessions WHERE status = 'active' ORDER BY datetime(created_at) DESC LIMIT 1"
  ).get() as { id: string | number };

  return NextResponse.json({
    session_id: String(session.id),
    contact_name: conversation.contact_name,
    messages_loaded: messages.length,
    exchanges_found: exchanges.length,
    inferred_category: inferredCategory,
    messages: messages.map((m) => ({
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
    })),
  });
}
