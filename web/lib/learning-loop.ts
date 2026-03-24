import "server-only";

import { getDb } from "@/lib/db";

/**
 * Learning Loop — Supermemory Feedback System
 *
 * Called from reply endpoints to store resolved conversations
 * back into Supermemory. Compatible with:
 *   - Next.js standalone build (static imports only)
 *   - Supermemory v3 (documents) and v4 (conversations) APIs
 *   - Same container tag as injection + conversation handler
 */

const SUPERMEMORY_URL = "https://api.supermemory.ai";
const CONTAINER_TAG =
  process.env.SUPERMEMORY_CONTAINER_TAG || "prismaalalegal_shared";

function getHeaders() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// ============================================================
// 1. STORE CONVERSATION TURN (v4/conversations)
// ============================================================

export async function learnFromConversationTurn(params: {
  conversationId: string;
  contactName: string;
  customerMessage: string;
  replyText: string;
  channel: string;
  wasAutoReply: boolean;
  wasEdited: boolean;
  category?: string;
}) {
  const headers = getHeaders();
  if (!headers) return;

  try {
    await fetch(`${SUPERMEMORY_URL}/v4/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        conversationId: `live_${params.conversationId}`,
        messages: [
          { role: "user", content: params.customerMessage, name: params.contactName },
          { role: "assistant", content: params.replyText },
        ],
        containerTags: [CONTAINER_TAG],
        metadata: {
          type: params.wasAutoReply ? "auto_reply" : "human_reply",
          was_edited: params.wasEdited,
          channel: params.channel,
          contact_name: params.contactName,
          category: params.category || "unknown",
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    console.error("[Learning] Failed to store conversation turn:", error);
  }
}

// ============================================================
// 2. STORE DRAFT CORRECTION (v3/documents)
// ============================================================

export async function learnFromDraftCorrection(params: {
  conversationId: string;
  contactName: string;
  customerMessage: string;
  originalDraft: string;
  editedReply: string;
  channel: string;
  category?: string;
}) {
  const headers = getHeaders();
  if (!headers) return;

  const content = [
    `CORRECCIÓN DE BORRADOR`,
    ``,
    `MENSAJE DEL CLIENTE: "${params.customerMessage}"`,
    ``,
    `BORRADOR DEL AGENTE (INCORRECTO):`,
    `"${params.originalDraft}"`,
    ``,
    `RESPUESTA CORREGIDA POR OPERADOR (USAR ESTA):`,
    `"${params.editedReply}"`,
  ].join("\n");

  try {
    // Store as correction document
    await fetch(`${SUPERMEMORY_URL}/v3/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
        containerTag: CONTAINER_TAG,
        customId: `correction_${params.conversationId}_${Date.now()}`,
        metadata: {
          type: "draft_correction",
          category: params.category || "unknown",
          contact_name: params.contactName,
          channel: params.channel,
          confidence: "high",
          corrected_at: new Date().toISOString(),
        },
      }),
    });

    // Also store corrected version as approved reply pattern
    const patternContent = [
      `SITUACIÓN DEL CLIENTE: Corrección de producción`,
      `EJEMPLO DE MENSAJE: "${params.customerMessage}"`,
      `RESPUESTA APROBADA: "${params.editedReply}"`,
      `NOTAS: Corrección del operador en conversación real. Alta confianza.`,
    ].join("\n");

    await fetch(`${SUPERMEMORY_URL}/v3/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: patternContent,
        containerTag: CONTAINER_TAG,
        customId: `approved_correction_${params.conversationId}_${Date.now()}`,
        metadata: {
          type: "approved_reply",
          category: params.category || "unknown",
          confidence: "high",
          source: "production_correction",
          channel: "all",
          corrected_at: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    console.error("[Learning] Failed to store draft correction:", error);
  }
}

// ============================================================
// 3. STORE APPROVED REPLY (v3/documents)
// ============================================================

export async function learnFromApprovedReply(params: {
  conversationId: string;
  contactName: string;
  customerMessage: string;
  replyText: string;
  channel: string;
  wasFromDraft: boolean;
  category?: string;
}) {
  const headers = getHeaders();
  if (!headers) return;

  const source = params.wasFromDraft ? "draft_approved_unchanged" : "manual_human_reply";
  const confidence = params.wasFromDraft ? "medium" : "high";

  const content = [
    `SITUACIÓN DEL CLIENTE: Respuesta de producción (${source})`,
    `EJEMPLO DE MENSAJE: "${params.customerMessage}"`,
    `RESPUESTA APROBADA: "${params.replyText}"`,
    `NOTAS: ${params.wasFromDraft ? "Borrador aprobado sin cambios." : "Respuesta manual del operador."}`,
  ].join("\n");

  try {
    await fetch(`${SUPERMEMORY_URL}/v3/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
        containerTag: CONTAINER_TAG,
        customId: `approved_${params.conversationId}_${Date.now()}`,
        metadata: {
          type: "approved_reply",
          category: params.category || "unknown",
          confidence,
          source,
          channel: "all",
          approved_at: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    console.error("[Learning] Failed to store approved reply:", error);
  }
}

// ============================================================
// HELPERS
// ============================================================

export function wasReplyEdited(originalDraft: string | null, finalText: string): boolean {
  if (!originalDraft) return false;
  const normalize = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  return normalize(originalDraft) !== normalize(finalText);
}

export function getLastCustomerMessage(conversationId: string): string | null {
  const db = getDb();
  const msg = db
    .prepare(
      `SELECT content FROM messages WHERE conversation_id = ? AND sender = 'contact'
       ORDER BY datetime(timestamp) DESC LIMIT 1`
    )
    .get(conversationId) as { content: string } | undefined;
  return msg?.content || null;
}
