import { NextResponse } from "next/server";

import { getOpenClawUrl } from "@/lib/api";
import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

function detectSentiment(text: string): "positive" | "neutral" | "negative" {
  const normalized = text.toLowerCase();
  if (/(help|interested|ready|yes|consulta|consultation|need)/.test(normalized)) {
    return "positive";
  }
  if (/(angry|upset|no|stop|bad)/.test(normalized)) {
    return "negative";
  }
  return "neutral";
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  const configuredSecret = process.env.MANYCHAT_WEBHOOK_SECRET;

  if (configuredSecret && secret !== configuredSecret) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const { subscriber, message } = (await request.json()) as {
    subscriber?: {
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
    };
    message?: {
      text?: string;
    };
  };

  if (!subscriber || !message?.text?.trim()) {
    return NextResponse.json({ error: "Missing subscriber or message" }, { status: 400 });
  }

  const db = getDb();
  const now = nowIsoString();
  const contactName = subscriber.name?.trim() || "Unknown Contact";
  const messageText = message.text.trim();
  const sentiment = detectSentiment(messageText);

  let lead = db
    .prepare(
      `SELECT id, tags
      FROM leads
      WHERE manychat_subscriber_id = ?
         OR phone = ?
         OR email = ?
      LIMIT 1`
    )
    .get(subscriber.id || null, subscriber.phone || null, subscriber.email || null) as
    | { id: string; tags: string }
    | undefined;

  if (!lead) {
    db.prepare(
      `INSERT INTO leads (
        name, email, phone, source, status, case_type, last_action, last_action_at, notes,
        assigned_to, tags, manychat_subscriber_id, created_at, updated_at
      ) VALUES (
        @name, @email, @phone, 'manychat', 'new', NULL, @last_action, @last_action_at, '', NULL, @tags,
        @manychat_subscriber_id, @created_at, @updated_at
      )`
    ).run({
      name: contactName,
      email: subscriber.email || null,
      phone: subscriber.phone || null,
      last_action: "Inbound ManyChat message received",
      last_action_at: now,
      tags: JSON.stringify(["manychat", sentiment]),
      manychat_subscriber_id: subscriber.id || null,
      created_at: now,
      updated_at: now,
    });

    lead = db
      .prepare(
        `SELECT id, tags
        FROM leads
        WHERE manychat_subscriber_id = ?
           OR phone = ?
           OR email = ?
        LIMIT 1`
      )
      .get(subscriber.id || null, subscriber.phone || null, subscriber.email || null) as {
      id: string;
      tags: string;
    };
  } else {
    db.prepare(
      `UPDATE leads
        SET name = @name,
            email = COALESCE(@email, email),
            phone = COALESCE(@phone, phone),
            source = 'manychat',
            last_action = 'Inbound ManyChat message received',
            last_action_at = @last_action_at,
            updated_at = @updated_at
        WHERE id = @id`
    ).run({
      id: lead.id,
      name: contactName,
      email: subscriber.email || null,
      phone: subscriber.phone || null,
      last_action_at: now,
      updated_at: now,
    });
  }

  let conversation = db
    .prepare(
      `SELECT id
      FROM conversations
      WHERE manychat_subscriber_id = ?
         OR contact_phone = ?
      LIMIT 1`
    )
    .get(subscriber.id || null, subscriber.phone || null) as { id: string } | undefined;

  if (!conversation) {
    db.prepare(
      `INSERT INTO conversations (
        contact_name, contact_phone, source, last_message, last_message_at, unread_count, sentiment,
        lead_id, status, manychat_subscriber_id, created_at
      ) VALUES (
        @contact_name, @contact_phone, 'manychat', @last_message, @last_message_at, 1, @sentiment,
        @lead_id, 'active', @manychat_subscriber_id, @created_at
      )`
    ).run({
      contact_name: contactName,
      contact_phone: subscriber.phone || null,
      last_message: messageText,
      last_message_at: now,
      sentiment,
      lead_id: lead.id,
      manychat_subscriber_id: subscriber.id || null,
      created_at: now,
    });

    conversation = db
      .prepare(
        `SELECT id
        FROM conversations
        WHERE manychat_subscriber_id = ?
           OR contact_phone = ?
        LIMIT 1`
      )
      .get(subscriber.id || null, subscriber.phone || null) as { id: string };
  } else {
    db.prepare(
      `UPDATE conversations
        SET contact_name = @contact_name,
            contact_phone = COALESCE(@contact_phone, contact_phone),
            last_message = @last_message,
            last_message_at = @last_message_at,
            unread_count = unread_count + 1,
            sentiment = @sentiment,
            lead_id = @lead_id
        WHERE id = @id`
    ).run({
      id: conversation.id,
      contact_name: contactName,
      contact_phone: subscriber.phone || null,
      last_message: messageText,
      last_message_at: now,
      sentiment,
      lead_id: lead.id,
    });
  }

  db.prepare(
    `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
    VALUES (@conversation_id, 'contact', @content, 'manychat', @timestamp, @metadata)`
  ).run({
    conversation_id: conversation.id,
    content: messageText,
    timestamp: now,
    metadata: JSON.stringify({
      subscriberId: subscriber.id,
      email: subscriber.email,
      phone: subscriber.phone,
    }),
  });

  void addSupermemoryDocument({
    content: `[manychat] ${contactName}: ${messageText}`,
    containerSuffix: `conversations:${subscriber.id || lead.id}`,
    metadata: {
      contact_name: contactName,
      channel: "manychat",
      timestamp: now,
      subscriber_id: subscriber.id,
    },
  }).catch(() => undefined);

  let responseText =
    "Thank you for reaching out. Our team has received your message and will follow up shortly.";

  try {
    const openClawResponse = await fetch(`${getOpenClawUrl()}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        channel: "manychat",
        content: `[ManyChat] ${contactName}: ${messageText}`,
        metadata: {
          contact_name: contactName,
          contact_phone: subscriber.phone,
          contact_email: subscriber.email,
          subscriber_id: subscriber.id,
          lead_id: lead.id,
          conversation_id: conversation.id,
        },
      }),
    });

    if (openClawResponse.ok) {
      const data = (await openClawResponse.json()) as {
        content?: string;
        message?: string;
        response?: string;
      };
      responseText = data.content || data.message || data.response || responseText;
    }
  } catch {
    // Keep the fallback reply if OpenClaw is unavailable.
  }

  const agentTimestamp = nowIsoString();
  db.prepare(
    `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
    VALUES (@conversation_id, 'agent', @content, 'manychat', @timestamp, @metadata)`
  ).run({
    conversation_id: conversation.id,
    content: responseText,
    timestamp: agentTimestamp,
    metadata: JSON.stringify({ automated: true }),
  });

  db.prepare(
    `UPDATE conversations
      SET last_message = @last_message,
          last_message_at = @last_message_at,
          sentiment = @sentiment,
          lead_id = @lead_id
      WHERE id = @id`
  ).run({
    id: conversation.id,
    last_message: responseText,
    last_message_at: agentTimestamp,
    sentiment,
    lead_id: lead.id,
  });

  void addSupermemoryDocument({
    content: `[agent] ${responseText}`,
    containerSuffix: `conversations:${subscriber.id || lead.id}`,
    metadata: {
      contact_name: contactName,
      channel: "manychat",
      sender: "agent",
      timestamp: agentTimestamp,
      subscriber_id: subscriber.id,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    version: "v2",
    content: {
      messages: [
        {
          type: "text",
          text: responseText,
        },
      ],
    },
  });
}
