import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { callOpenClaw } from "@/lib/openclaw-client";
import { searchSupermemory } from "@/lib/supermemory";

const AGENT_LEARNINGS_TAG = `agent:${process.env.AGENT_SLUG || "[REDACTED]"}:learnings`;

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
          c.status,
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
          status: "active" | "archived";
          manychat_subscriber_id: string | null;
          case_type: string | null;
          lead_status: string | null;
          lead_notes: string | null;
        }
      | undefined;

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (conversation.status === "archived") {
      return NextResponse.json(
        { error: "Conversation is archived. Unarchive before generating a draft." },
        { status: 409 }
      );
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
      .map((m) => `[${m.sender === "contact" ? conversation.contact_name : m.sender === "human" ? "Tu" : "Agente"}]: ${m.content}`)
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
      // Supermemory context is best-effort for draft quality.
    }

    const prompt = context?.trim()
      ? `[BORRADOR CON INSTRUCCION] Contexto del operador: "${context.trim()}"\n\nHistorial:\n${messageHistory}${memoryContext}${learningsContext}${opportunityContext}\n\nGenera una respuesta para ${conversation.contact_name} siguiendo las instrucciones de SOUL.md y considerando el contexto del operador.`
      : `[BORRADOR] Historial de conversacion con ${conversation.contact_name}:\n${messageHistory}${memoryContext}${learningsContext}${opportunityContext}\n\nGenera la siguiente respuesta sugerida siguiendo las instrucciones de SOUL.md.`;

    const result = await callOpenClaw<{
      content?: string;
      message?: string;
      response?: string;
    }>("/api/message", {
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
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: "openclaw_unavailable",
          message: "Draft generation temporarily unavailable. You can still send a manual reply.",
          retryable: result.error?.retryable ?? true,
        },
        { status: 502 }
      );
    }

    const draft = result.data.content || result.data.message || result.data.response;
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
