import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { searchSupermemory } from "@/lib/supermemory";

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "[REDACTED]";
const AGENT_LEARNINGS_TAG = `agent:${process.env.AGENT_SLUG || "prismaalalegal"}:learnings`;

type SupermemoryRecord = { content?: string };

export async function POST(request: Request) {
  try {
    const { conversationId, context } = (await request.json()) as {
      conversationId?: string;
      context?: string;
    };

    if (!conversationId?.trim()) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const db = getDb();
    const conversation = db
      .prepare(
        `SELECT
          c.id,
          c.contact_name,
          c.manychat_subscriber_id,
          l.case_type,
          l.status as lead_status,
          l.notes as lead_notes
        FROM conversations c
        LEFT JOIN leads l ON l.id = c.lead_id
        WHERE c.id = ?`
      )
      .get(conversationId) as
      | {
          id: string;
          contact_name: string;
          manychat_subscriber_id: string | null;
          case_type: string | null;
          lead_status: string | null;
          lead_notes: string | null;
        }
      | undefined;

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const recentMessages = db
      .prepare(
        `SELECT sender, content, timestamp
        FROM messages
        WHERE conversation_id = ?
        ORDER BY datetime(timestamp) DESC
        LIMIT 10`
      )
      .all(conversationId) as { sender: string; content: string; timestamp: string }[];

    const messageHistory = recentMessages
      .reverse()
      .map((m) => `[${m.sender === "contact" ? conversation.contact_name : m.sender === "human" ? "Tú" : "Agente"}]: ${m.content}`)
      .join("\n");

    let memoryContext = "";
    let learningsContext = "";
    const opportunityContext = conversation.lead_status
      ? `\n\nContexto CRM de oportunidad:\n- Etapa actual: ${conversation.lead_status}\n- Notas del lead: ${conversation.lead_notes?.trim() || "Sin notas"}`
      : "";
    try {
      const memories = await searchSupermemory({
        query: recentMessages[0]?.content || conversation.contact_name,
        containerSuffix: `conversations:${conversationId}`,
        limit: 5,
      });

      const memoryList: SupermemoryRecord[] = Array.isArray(memories)
        ? memories
        : Array.isArray((memories as { results?: SupermemoryRecord[] })?.results)
          ? (memories as { results: SupermemoryRecord[] }).results
          : [];

      if (memoryList.length > 0) {
        memoryContext =
          "\n\nContexto adicional de conversaciones previas:\n" +
          memoryList
            .map((m) => m.content || "")
            .filter(Boolean)
            .join("\n");
      }

      const learnings = await searchSupermemory({
        query: `${conversation.contact_name}\n${recentMessages[0]?.content || ""}`,
        containerTag: AGENT_LEARNINGS_TAG,
        limit: 5,
      });

      const learningList: SupermemoryRecord[] = Array.isArray(learnings)
        ? learnings
        : Array.isArray((learnings as { results?: SupermemoryRecord[] })?.results)
          ? (learnings as { results: SupermemoryRecord[] }).results
          : [];

      if (learningList.length > 0) {
        learningsContext =
          "\n\nAprendizajes previos del operador (aplicar cuando sea relevante):\n" +
          learningList
            .map((m) => m.content || "")
            .filter(Boolean)
            .join("\n");
      }
    } catch {
      // Supermemory search is optional.
    }

    const prompt = context?.trim()
      ? `[BORRADOR CON INSTRUCCIÓN] Contexto del operador: "${context.trim()}"\n\nHistorial:\n${messageHistory}${memoryContext}${learningsContext}${opportunityContext}\n\nGenera una respuesta para ${conversation.contact_name} siguiendo las instrucciones de SOUL.md y considerando el contexto del operador.`
      : `[BORRADOR] Historial de conversación con ${conversation.contact_name}:\n${messageHistory}${memoryContext}${learningsContext}${opportunityContext}\n\nGenera la siguiente respuesta sugerida siguiendo las instrucciones de SOUL.md.`;

    let response: Response;
    try {
      response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          channel: "manychat",
          content: prompt,
          metadata: {
            is_draft: true,
            contact_name: conversation.contact_name,
            conversation_id: conversationId,
            case_type: conversation.case_type,
            lead_status: conversation.lead_status,
            lead_notes: conversation.lead_notes || undefined,
          },
        }),
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to generate draft — OpenClaw may be unavailable" },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to generate draft — OpenClaw may be unavailable" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      content?: string;
      message?: string;
      response?: string;
    };
    const draft = data.content || data.message || data.response;

    if (!draft) {
      return NextResponse.json({ error: "OpenClaw returned empty response" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      draft,
      context: {
        contact_name: conversation.contact_name,
        case_type: conversation.case_type,
        messages_used: recentMessages.length,
      },
    });
  } catch (error) {
    console.error("Draft API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
