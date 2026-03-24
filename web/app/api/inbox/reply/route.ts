import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";
import {
  learnFromConversationTurn,
  learnFromDraftCorrection,
  learnFromApprovedReply,
  wasReplyEdited,
  getLastCustomerMessage,
} from "@/lib/learning-loop";

const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_OPERATOR || process.env.TELEGRAM_BOT_TOKEN;

// Universal endpoint that routes to subscriber's last active channel
const MANYCHAT_UNIVERSAL_ENDPOINT = 'https://api.manychat.com/sending/sendContent';

function normalizeForComparison(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Check if conversation was from imported/manual lead (no proper ManyChat history)
 */
function isImportedLead(conversation: { last_message_at: string | null }): boolean {
  if (!conversation.last_message_at) return true;
  
  const lastMessage = new Date(conversation.last_message_at).getTime();
  const now = Date.now();
  const hoursDiff = (now - lastMessage) / (1000 * 60 * 60);
  
  return hoursDiff > 48;
}

/**
 * Calculate hours since the last customer message
 */
function hoursSinceLastMessage(lastMessageAt: string | null): number {
  if (!lastMessageAt) return 999;
  const lastMessage = new Date(lastMessageAt).getTime();
  const now = Date.now();
  return (now - lastMessage) / (1000 * 60 * 60);
}

async function sendManyChatMessage(
  subscriberId: string,
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _channel: string = 'fb',
  lastMessageAt?: string | null,
  forceAccountUpdate: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!MANYCHAT_API_KEY) {
    return { success: false, error: "ManyChat API key not configured" };
  }

  try {
    const hoursSince = hoursSinceLastMessage(lastMessageAt || null);
    const messageTag = (hoursSince > 23 || forceAccountUpdate) ? "ACCOUNT_UPDATE" : undefined;
    
    console.log(`[ManyChat] Sending to ${subscriberId}. Hours since: ${hoursSince.toFixed(1)}. Tag: ${messageTag || 'none'}. Force: ${forceAccountUpdate}`);

    const payload: Record<string, unknown> = {
      subscriber_id: subscriberId,
      data: {
        version: "v2",
        content: {
          messages: [{ type: "text", text: message }],
        },
      },
    };

    if (messageTag) {
      payload.message_tag = messageTag;
    }

    const response = await fetch(MANYCHAT_UNIVERSAL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANYCHAT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ManyChat] Error ${response.status}:`, errorText);
      
      if (response.status === 403 && errorText.includes('24')) {
        return { success: false, error: `24-hour window expired. Try importing lead first via ManyChat dashboard.` };
      }
      if (response.status === 404) {
        return { success: false, error: `Subscriber not found. Lead may need to be imported to ManyChat first.` };
      }
      
      return { success: false, error: `ManyChat API error (${response.status}): ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[ManyChat] Exception:", error);
    return { success: false, error: `Failed to send via ManyChat: ${String(error)}` };
  }
}

async function sendTelegramMessage(chatId: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: "Telegram bot token not configured" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Telegram API error: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to send via Telegram: ${String(error)}` };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      conversation_id?: string;
      message?: string;
      originalDraft?: string;
      subscriber_id?: string;
      forceAccountUpdate?: boolean;
    };

    const conversationId = body.conversationId?.trim() || body.conversation_id?.trim();
    const message = body.message?.trim();
    const originalDraft = body.originalDraft?.trim();
    const forceAccountUpdate = body.forceAccountUpdate || false;

    if (!conversationId || !message) {
      return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
    }

    const db = getDb();
    const now = nowIsoString();
    
    const conversation = db
      .prepare(
        `SELECT 
          c.id,
          c.contact_name,
          c.manychat_subscriber_id,
          c.telegram_chat_id,
          c.source,
          c.channel,
          c.status,
          c.last_message_at,
          c.created_at,
          l.id as lead_id
        FROM conversations c
        LEFT JOIN leads l ON l.id = c.lead_id
        WHERE c.id = ?`
      )
      .get(conversationId) as
      | {
          id: string;
          contact_name: string;
          manychat_subscriber_id: string | null;
          telegram_chat_id: string | null;
          source: "manychat" | "telegram";
          channel: string | null;
          status: "active" | "archived";
          last_message_at: string | null;
          created_at: string;
          lead_id: string | null;
        }
      | undefined;

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (conversation.status === "archived") {
      return NextResponse.json(
        { error: "Conversation is archived. Unarchive before sending a reply." },
        { status: 409 }
      );
    }

    const isImported = isImportedLead(conversation);

    let sendResult: { success: boolean; error?: string } = { success: false, error: "Unsupported source" };
    
    if (conversation.source === "manychat") {
      const subscriberId = conversation.manychat_subscriber_id || body.subscriber_id;
      if (!subscriberId) {
        sendResult = { success: false, error: "Missing ManyChat subscriber id" };
      } else {
        const useForceTag = forceAccountUpdate || isImported;
        sendResult = await sendManyChatMessage(
          subscriberId, 
          message, 
          conversation.channel || 'fb', 
          conversation.last_message_at,
          useForceTag
        );
      }
    } else if (conversation.source === "telegram") {
      if (!conversation.telegram_chat_id) {
        sendResult = { success: false, error: "Missing Telegram chat id" };
      } else {
        sendResult = await sendTelegramMessage(conversation.telegram_chat_id, message);
      }
    }

    if (!sendResult.success) {
      return NextResponse.json({ 
        error: sendResult.error || "Failed to send message",
        isImported: isImported,
        hint: isImported ? "This lead was imported. Try sending via ManyChat dashboard first to establish conversation." : undefined
      }, { status: 500 });
    }

    // Save the sent message to database
    db.prepare(
      `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (?, 'human', ?, ?, ?, ?)`
    ).run(conversationId, message, conversation.source, now, JSON.stringify({ 
      sent_via: "web", 
      operator: "human",
      is_imported_lead: isImported,
      used_message_tag: isImported || forceAccountUpdate
    }));

    // Save to replies table
    db.prepare(
      `INSERT INTO replies (
        conversation_id,
        agent_draft,
        operator_edit,
        final_text,
        status,
        approved_at,
        sent_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'sent', ?, ?, ?, ?)`
    ).run(
      conversationId,
      originalDraft || null,
      originalDraft && normalizeForComparison(originalDraft) !== normalizeForComparison(message) ? message : null,
      message,
      now,
      now,
      now,
      now
    );

    // Update conversation
    db.prepare(
      `UPDATE conversations
        SET last_message = ?,
            last_message_at = ?,
            unread_count = 0,
            status = 'active'
      WHERE id = ?`
    ).run(message, now, conversationId);

    // ---- LEARNING LOOP ----
    const lastCustomerMsg = getLastCustomerMessage(conversationId);
    if (lastCustomerMsg) {
      const edited = wasReplyEdited(originalDraft || null, message);

      // Always store the conversation turn in Supermemory
      await learnFromConversationTurn({
        conversationId,
        contactName: conversation.contact_name,
        customerMessage: lastCustomerMsg,
        replyText: message,
        channel: conversation.source,
        wasAutoReply: false,
        wasEdited: edited,
      });

      // If operator edited the AI draft, store the correction (highest-value signal)
      if (edited && originalDraft) {
        await learnFromDraftCorrection({
          conversationId,
          contactName: conversation.contact_name,
          customerMessage: lastCustomerMsg,
          originalDraft,
          editedReply: message,
          channel: conversation.source,
        });
      } else {
        // Unedited draft or manual reply — store as approved pattern
        await learnFromApprovedReply({
          conversationId,
          contactName: conversation.contact_name,
          customerMessage: lastCustomerMsg,
          replyText: message,
          channel: conversation.source,
          wasFromDraft: !!originalDraft,
        });
      }
    }
    // ---- END LEARNING LOOP ----

    // Legacy Supermemory write (kept for backward compat with existing container tags)
    try {
      await addSupermemoryDocument({
        content: `[Agente]: ${message}`,
        containerSuffix: `conversations:${conversationId}`,
        metadata: {
          contact_name: conversation.contact_name,
          channel: conversation.source,
          sender: "human",
          timestamp: now,
          conversation_id: conversationId,
          lead_id: conversation.lead_id,
          sent_via: "web",
          is_imported_lead: isImported,
        },
      });
    } catch (error) {
      console.error("Supermemory write failed after sending reply:", error);
    }

    return NextResponse.json({
      success: true,
      isImported: isImported,
      message: {
        id: crypto.randomUUID(),
        sender: "human",
        content: message,
        channel: conversation.source,
        timestamp: now,
      },
    });
  } catch (error) {
    console.error("Reply API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
