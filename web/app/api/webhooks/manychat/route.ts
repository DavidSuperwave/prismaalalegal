import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { TAGS, addSupermemoryDocument } from "@/lib/supermemory";
import { sendToAgent } from "@/lib/openclaw-client";

const WEBHOOK_SECRET = process.env.MANYCHAT_WEBHOOK_SECRET;
const TELEGRAM_BOT_TOKEN_LEADS = process.env.TELEGRAM_BOT_TOKEN_LEADS || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID;
const MANYCHAT_AUTO_REPLY = process.env.MANYCHAT_AUTO_REPLY || "Gracias por tu mensaje. Un asesor te atendera en breve.";

type WebhookPayload = {
  subscriber?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  message?: {
    id?: string;
    text?: string;
    timestamp?: string | number;
  };
  timestamp?: string | number;
};

function idempotencyKey(payload: WebhookPayload) {
  const subscriberId = payload.subscriber?.id || "unknown";
  const messageId = payload.message?.id || "";
  const marker = String(payload.message?.timestamp || payload.timestamp || payload.message?.text || Date.now());
  return `${subscriberId}:${messageId || marker}`;
}

function ensureWebhookTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_webhooks (
      idempotency_key TEXT PRIMARY KEY,
      processed_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function markWebhookProcessed(key: string, now: string) {
  const db = getDb();
  const result = db
    .prepare("INSERT OR IGNORE INTO processed_webhooks (idempotency_key, processed_at) VALUES (?, ?)")
    .run(key, now);
  return result.changes > 0;
}

async function notifyTelegram(contactName: string, messageText: string, conversationId: string, subscriberId: string) {
  if (!TELEGRAM_BOT_TOKEN_LEADS || !TELEGRAM_REPLIES_CHAT_ID) return;

  const preview = messageText.length > 200 ? `${messageText.slice(0, 200)}...` : messageText;
  const text =
    `📩 *Inbound lead message*\n\n` +
    `👤 *Contact:* ${contactName}\n` +
    `💬 *Message:* ${preview}\n` +
    `🆔 *Conversation:* \`${conversationId}\`\n` +
    `🔑 *Subscriber:* \`${subscriberId}\``;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_LEADS}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_REPLIES_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Telegram leads notification failed:", error);
  }
}

function manyChatAck() {
  return NextResponse.json({
    version: "v2",
    content: {
      messages: [
        {
          type: "text",
          text: MANYCHAT_AUTO_REPLY,
        },
      ],
    },
  });
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-webhook-secret");
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = (await request.json()) as WebhookPayload;
    const subscriber = body.subscriber;
    const messageText = body.message?.text?.trim();
    if (!subscriber?.id || !messageText) {
      return NextResponse.json({ error: "Missing subscriber or message" }, { status: 400 });
    }

    const now = nowIsoString();
    ensureWebhookTable();
    const key = idempotencyKey(body);
    const isNewWebhook = markWebhookProcessed(key, now);
    if (!isNewWebhook) {
      return manyChatAck();
    }

    const db = getDb();
    const contactName = subscriber.name?.trim() || "Contacto";

    let lead = db
      .prepare(
        `SELECT id
         FROM leads
         WHERE manychat_subscriber_id = ? OR phone = ? OR email = ?
         LIMIT 1`
      )
      .get(subscriber.id, subscriber.phone || null, subscriber.email || null) as { id: string } | undefined;

    if (!lead) {
      db.prepare(
        `INSERT OR IGNORE INTO leads (name, email, phone, source, status, manychat_subscriber_id, created_at, updated_at)
         VALUES (?, ?, ?, 'manychat', 'new', ?, ?, ?)`
      ).run(contactName, subscriber.email || null, subscriber.phone || null, subscriber.id, now, now);

      lead = db
        .prepare(
          `SELECT id
           FROM leads
           WHERE manychat_subscriber_id = ? OR phone = ? OR email = ?
           LIMIT 1`
        )
        .get(subscriber.id, subscriber.phone || null, subscriber.email || null) as { id: string } | undefined;
    } else {
      db.prepare(
        `UPDATE leads
           SET name = COALESCE(?, name),
               email = COALESCE(?, email),
               phone = COALESCE(?, phone),
               updated_at = ?
         WHERE id = ?`
      ).run(contactName, subscriber.email || null, subscriber.phone || null, now, lead.id);
    }

    if (!lead) {
      return NextResponse.json({ error: "Failed to resolve lead" }, { status: 500 });
    }

    let conversation = db
      .prepare(
        `SELECT id
         FROM conversations
         WHERE manychat_subscriber_id = ? OR contact_phone = ?
         LIMIT 1`
      )
      .get(subscriber.id, subscriber.phone || null) as { id: string } | undefined;

    if (!conversation) {
      db.prepare(
        `INSERT INTO conversations
         (contact_name, contact_phone, source, last_message, last_message_at, unread_count, status, manychat_subscriber_id, lead_id, created_at)
         VALUES (?, ?, 'manychat', ?, ?, 1, 'active', ?, ?, ?)`
      ).run(contactName, subscriber.phone || null, messageText, now, subscriber.id, lead.id, now);

      conversation = db
        .prepare(
          `SELECT id
           FROM conversations
           WHERE manychat_subscriber_id = ? OR contact_phone = ?
           LIMIT 1`
        )
        .get(subscriber.id, subscriber.phone || null) as { id: string } | undefined;
    } else {
      db.prepare(
        `UPDATE conversations
           SET last_message = ?,
               last_message_at = ?,
               unread_count = unread_count + 1,
               contact_name = COALESCE(?, contact_name),
               lead_id = COALESCE(?, lead_id)
         WHERE id = ?`
      ).run(messageText, now, contactName, lead.id, conversation.id);
    }

    if (!conversation) {
      return NextResponse.json({ error: "Failed to resolve conversation" }, { status: 500 });
    }

    db.prepare(
      `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
       VALUES (?, 'contact', ?, 'manychat', ?, ?)`
    ).run(
      conversation.id,
      messageText,
      now,
      JSON.stringify({
        subscriber_id: subscriber.id,
        subscriber_name: subscriber.name,
        subscriber_phone: subscriber.phone,
        subscriber_email: subscriber.email,
        message_id: body.message?.id || null,
      })
    );

    try {
      await addSupermemoryDocument({
        content: `[${contactName}]: ${messageText}`,
        containerTag: TAGS.SHARED[0],
        metadata: {
          type: "conversation",
          contact_name: contactName,
          channel: "manychat",
          sender: "contact",
          timestamp: now,
          conversation_id: conversation.id,
          subscriber_id: subscriber.id,
        },
      });
    } catch (error) {
      console.error("Supermemory write failed (non-blocking):", error);
    }

    const preview = messageText.length > 180 ? `${messageText.slice(0, 180)}...` : messageText;
    const agentMessage = `New inbound from ${subscriber.phone || subscriber.id}: ${preview}`;
    const agentSend = await sendToAgent("leads-inbox", agentMessage);
    if (!agentSend.success) {
      console.error("Failed to notify leads-inbox agent:", agentSend.error);
    }

    await notifyTelegram(contactName, messageText, conversation.id, subscriber.id);

    return manyChatAck();
  } catch (error) {
    console.error("ManyChat webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "acknowledge-draft-approve",
    auto_reply: true,
    auto_reply_text: MANYCHAT_AUTO_REPLY,
    notifications: ["leads-inbox-agent", "telegram-leads-channel"],
    timestamp: new Date().toISOString(),
  });
}
