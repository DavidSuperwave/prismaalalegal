import "server-only";

import { getDb, nowIsoString, parseJsonObject } from "@/lib/db";
import { TAGS, searchMemory } from "@/lib/supermemory";
import { callOpenClaw } from "@/lib/openclaw-client";
import { notifyOperator } from "@/lib/notifier";

// ============================================================
// TYPES
// ============================================================

export type IntakeStage =
  | "new"
  | "greeting"
  | "exploring"
  | "collecting"
  | "requesting_contact"
  | "briefing"
  | "handed_off"
  | "rejected"
  | "closed";

export type IntakeData = {
  incident_type?: string;
  incident_date?: string;
  injury_severity?: string;
  injury_description?: string;
  insurer_name?: string;
  insurer_status?: string;
  has_police_report?: boolean;
  has_medical_records?: boolean;
  contact_phone?: string;
  contact_name?: string;
  location?: string;
  case_summary?: string;
  rejection_reason?: string;
};

type AgentResponse = {
  extracted_data: Partial<IntakeData>;
  next_stage: IntakeStage;
  response_text: string;
  rejection_reason?: string;
};

type SearchResult = {
  results?: Array<{
    score: number;
    content?: string;
    chunks?: Array<{ content: string; score: number; isRelevant: boolean }>;
    metadata?: Record<string, unknown>;
  }>;
};

export type IntakeResult = {
  replyText: string;
  nextStage: IntakeStage;
  isTerminal: boolean;
};

// ============================================================
// CONSTANTS
// ============================================================

const ALLOWED_TRANSITIONS: Record<string, IntakeStage[]> = {
  new: ["greeting", "exploring"],
  greeting: ["exploring"],
  exploring: ["collecting", "rejected"],
  collecting: ["requesting_contact"],
  requesting_contact: ["briefing"],
  briefing: ["handed_off"],
};

const TERMINAL_STAGES: IntakeStage[] = ["handed_off", "rejected", "closed"];

const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY;

// ============================================================
// HELPERS
// ============================================================

export function getIntakeState(conversationId: string): { stage: IntakeStage; data: IntakeData } {
  const db = getDb();
  const row = db.prepare(
    "SELECT intake_stage, intake_data FROM conversations WHERE id = ?"
  ).get(conversationId) as { intake_stage: string; intake_data: string } | undefined;

  return {
    stage: (row?.intake_stage || "new") as IntakeStage,
    data: parseJsonObject<IntakeData>(row?.intake_data),
  };
}

export function isActiveIntake(stage: IntakeStage): boolean {
  return !TERMINAL_STAGES.includes(stage);
}

// ============================================================
// STAGE PROMPTS
// ============================================================

function buildStagePrompt(
  stage: IntakeStage,
  intakeData: IntakeData,
  history: string,
  contactName: string,
  memoryContext: { guidance: string[]; patterns: string[] }
): string {
  const guidanceBlock =
    memoryContext.guidance.length > 0
      ? `\n\nGUIA DEL OPERADOR (ALTA PRIORIDAD):\n${memoryContext.guidance.join("\n---\n")}`
      : "";

  const patternsBlock =
    memoryContext.patterns.length > 0
      ? `\n\nPATRONES APROBADOS:\n${memoryContext.patterns.join("\n---\n")}`
      : "";

  const collectedSoFar = Object.entries(intakeData)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const dataBlock = collectedSoFar
    ? `\n\nDATOS RECOPILADOS HASTA AHORA:\n${collectedSoFar}`
    : "";

  const baseRules = `
REGLAS ESTRICTAS:
- NUNCA des asesoría legal específica
- NUNCA prometas resultados
- NUNCA discutas estrategia legal
- NUNCA ofrezcas consultas
- Si preguntan sobre honorarios: "Solo cobramos si ganamos. Consulta gratis."
- Haz UNA sola pregunta por mensaje
- Responde en español, tono profesional y cálido
- Si el caso no involucra lesiones graves/muerte + seguro, rechaza amablemente
${guidanceBlock}${patternsBlock}`;

  const responseFormat = `
RESPONDE EN JSON EXACTO (sin markdown, sin backticks):
{
  "extracted_data": { /* campos nuevos extraídos del mensaje del cliente */ },
  "next_stage": "/* siguiente etapa válida */",
  "response_text": "/* tu respuesta al cliente en español */",
  "rejection_reason": "/* solo si rechazas, null si no */"
}`;

  let stageInstructions: string;

  switch (stage) {
    case "new":
    case "greeting":
      stageInstructions = `
ETAPA: SALUDO / INICIO
Saluda cálidamente a ${contactName}. Pregunta qué le pasó.
Haz UNA sola pregunta abierta: "¿Me puedes contar qué sucedió?"
next_stage debe ser "greeting" o "exploring" si ya mencionaron un incidente.`;
      break;

    case "exploring":
      stageInstructions = `
ETAPA: EXPLORACIÓN
Determina si el caso involucra: (1) lesiones graves o muerte, Y (2) seguro/aseguradora.
Haz UNA pregunta clarificadora sobre lo que falta.
- Si claramente NO hay lesiones graves ni muerte → next_stage: "rejected", rejection_reason: razón clara
- Si necesitas más info → next_stage: "exploring"
- Si confirmas lesiones graves/muerte + hay mención de seguro → next_stage: "collecting"`;
      break;

    case "collecting":
      stageInstructions = `
ETAPA: RECOPILACIÓN DE DATOS
Recopila los datos faltantes. Prioridad: lesiones → aseguradora → fecha → documentos.
Haz UNA sola pregunta sobre el dato más importante que falte.
Cuando tengas suficiente información (tipo de incidente, descripción de lesiones, aseguradora) → next_stage: "requesting_contact"`;
      break;

    case "requesting_contact":
      stageInstructions = `
ETAPA: SOLICITAR CONTACTO
Pide el número de WhatsApp con esta frase exacta:
"¿Me puedes mandar tu número de WhatsApp para ponernos en contacto?"
next_stage: "briefing" si ya proporcionaron número, "requesting_contact" si aún no.`;
      break;

    default:
      stageInstructions = `ETAPA: ${stage}\nResponde brevemente.`;
  }

  return `[INTAKE-AGENT] Eres el agente calificador de leads de Prisma/ALA Legal.

${baseRules}

${stageInstructions}
${dataBlock}

HISTORIAL:
${history}

${responseFormat}`;
}

// ============================================================
// SUPERMEMORY ENRICHMENT
// ============================================================

async function searchEnrichment(messageText: string): Promise<{ guidance: string[]; patterns: string[] }> {
  const result = { guidance: [] as string[], patterns: [] as string[] };

  try {
    const [guidanceResults, patternResults] = await Promise.all([
      searchMemory(
        messageText,
        TAGS.SHARED,
        { AND: [{ key: "type", value: "operator_guidance" }] },
        3
      ) as Promise<SearchResult>,
      searchMemory(
        messageText,
        TAGS.SHARED,
        { AND: [{ key: "type", value: "approved_reply" }] },
        5
      ) as Promise<SearchResult>,
    ]);

    const guidance = guidanceResults?.results || [];
    result.guidance = guidance
      .filter((g) => g.score >= 0.3)
      .map((g) => {
        const chunkContent = g.chunks
          ?.filter((ch) => ch.isRelevant)
          .map((ch) => ch.content)
          .join("\n");
        return chunkContent || g.content || "";
      })
      .filter(Boolean);

    const patterns = patternResults?.results || [];
    result.patterns = patterns
      .filter((p) => p.score >= 0.5)
      .map((p) => {
        const chunkContent = p.chunks
          ?.filter((c) => c.isRelevant)
          .map((c) => c.content)
          .join("\n");
        return chunkContent || p.content || "";
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[Intake] Supermemory enrichment failed:", error);
  }

  return result;
}

// ============================================================
// CONVERSATION HISTORY
// ============================================================

function getConversationHistory(conversationId: string, limit = 10): string {
  const db = getDb();
  const messages = db
    .prepare(
      `SELECT sender, content, timestamp FROM messages
       WHERE conversation_id = ? ORDER BY datetime(timestamp) DESC LIMIT ?`
    )
    .all(conversationId, limit) as Array<{ sender: string; content: string; timestamp: string }>;

  return messages
    .reverse()
    .map((m) =>
      `[${m.sender === "contact" ? "Cliente" : m.sender === "human" ? "Operador" : "Agente"}]: ${m.content}`
    )
    .join("\n");
}

// ============================================================
// PARSE LLM RESPONSE
// ============================================================

function parseLLMResponse(raw: string, currentStage: IntakeStage): AgentResponse {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    if (parsed.response_text) return parsed as AgentResponse;
  } catch { /* try fallbacks */ }

  // Try extracting JSON from markdown code blocks
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.response_text) return parsed as AgentResponse;
    } catch { /* continue */ }
  }

  // Try extracting JSON from the first { to last }
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      if (parsed.response_text) return parsed as AgentResponse;
    } catch { /* continue */ }
  }

  // Fallback: use raw text as response, stay at current stage
  return {
    extracted_data: {},
    next_stage: currentStage,
    response_text: raw.trim() || "Disculpa, ¿me puedes repetir eso?",
    rejection_reason: undefined,
  };
}

// ============================================================
// CASE BRIEF
// ============================================================

export async function sendCaseBrief(intakeData: IntakeData, contactName: string, channel: string): Promise<void> {
  const phone = intakeData.contact_phone || "No proporcionado";
  const policeReport = intakeData.has_police_report ? "Si" : "No";
  const medicalRecords = intakeData.has_medical_records ? "Si" : "No";

  const text =
    `CASO CALIFICADO\n\n` +
    `Contacto: ${contactName} -- ${phone}\n` +
    `Canal: ${channel}\n` +
    `Tipo: ${intakeData.incident_type || "No especificado"}\n` +
    `Fecha: ${intakeData.incident_date || "No especificada"}\n` +
    `Lesiones: ${intakeData.injury_description || "No especificadas"}\n` +
    `Aseguradora: ${intakeData.insurer_name || "No especificada"} -- ${intakeData.insurer_status || "Desconocido"}\n` +
    `Documentos: MP ${policeReport} | Medico ${medicalRecords}\n\n` +
    `Resumen: ${intakeData.case_summary || "Pendiente"}`;

  await notifyOperator(text);
}

// ============================================================
// LEARNING — store conversation turn in Supermemory v4
// ============================================================

async function storeConversationTurn(
  conversationId: string,
  contactName: string,
  customerMessage: string,
  agentReply: string,
  channel: string
) {
  if (!SUPERMEMORY_API_KEY) return;

  try {
    await fetch("https://api.supermemory.ai/v4/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPERMEMORY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: `live_${conversationId}`,
        messages: [
          { role: "user", content: customerMessage, name: contactName },
          { role: "assistant", content: agentReply },
        ],
        containerTags: [TAGS.SHARED[0]],
        metadata: {
          type: "intake_auto_reply",
          channel,
          contact_name: contactName,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    console.error("[Intake] Supermemory learning write failed:", error);
  }
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

export async function processIntakeMessage(
  conversationId: string,
  subscriberId: string,
  contactName: string,
  contactPhone: string | null,
  messageText: string,
  channel: string
): Promise<IntakeResult | null> {
  const db = getDb();
  const now = nowIsoString();

  // 1. Read current state
  const { stage: currentStage, data: currentData } = getIntakeState(conversationId);

  // 2. Terminal stages — don't auto-reply
  if (currentStage === "rejected" || currentStage === "closed") {
    return null;
  }

  // 3. Handed off — short acknowledgment without LLM
  if (currentStage === "handed_off") {
    const replyText = "Tu caso ya esta siendo revisado por nuestro equipo. Te contactaremos pronto.";
    saveAgentMessage(conversationId, replyText, channel, now, { intake_stage: "handed_off" });
    return { replyText, nextStage: "handed_off", isTerminal: true };
  }

  // 4. Search Supermemory for enrichment
  const memoryContext = await searchEnrichment(messageText);

  // 5. Get conversation history
  const history = getConversationHistory(conversationId);

  // 6. Build prompt and call OpenClaw
  const prompt = buildStagePrompt(currentStage, currentData, history, contactName, memoryContext);

  const result = await callOpenClaw<{
    content?: string;
    message?: string;
    response?: string;
  }>("/api/message", {
    role: "user",
    channel: "manychat",
    content: prompt,
    metadata: {
      is_intake: true,
      intake_stage: currentStage,
      contact_name: contactName,
    },
  });

  if (!result.success || !result.data) {
    console.error("[Intake] OpenClaw call failed:", result.error);
    return null;
  }

  const rawResponse = result.data.content || result.data.message || result.data.response || "";
  const agentResponse = parseLLMResponse(rawResponse, currentStage);

  // 7. Merge extracted data
  const mergedData: IntakeData = { ...currentData };
  if (agentResponse.extracted_data) {
    for (const [key, value] of Object.entries(agentResponse.extracted_data)) {
      if (value !== undefined && value !== null && value !== "") {
        (mergedData as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Store contact info if provided
  if (contactPhone && !mergedData.contact_phone) {
    mergedData.contact_phone = contactPhone;
  }
  if (contactName && !mergedData.contact_name) {
    mergedData.contact_name = contactName;
  }

  // 8. Validate stage transition
  let nextStage = agentResponse.next_stage;
  const allowed = ALLOWED_TRANSITIONS[currentStage];
  if (allowed && !allowed.includes(nextStage)) {
    // If transition not allowed, stay at current stage
    nextStage = currentStage;
  }

  // 9. Handle rejection
  if (nextStage === "rejected" && agentResponse.rejection_reason) {
    mergedData.rejection_reason = agentResponse.rejection_reason;
  }

  // 10. Update database
  db.prepare(
    "UPDATE conversations SET intake_stage = ?, intake_data = ? WHERE id = ?"
  ).run(nextStage, JSON.stringify(mergedData), conversationId);

  // 11. If briefing → send case brief and move to handed_off
  if (nextStage === "briefing") {
    // Generate case summary if not already set
    if (!mergedData.case_summary) {
      mergedData.case_summary = [
        mergedData.incident_type,
        mergedData.injury_description,
        mergedData.insurer_name ? `Aseguradora: ${mergedData.insurer_name}` : null,
      ].filter(Boolean).join(". ");
    }

    await sendCaseBrief(mergedData, contactName, channel);

    // Auto-advance to handed_off
    db.prepare(
      "UPDATE conversations SET intake_stage = 'handed_off', intake_data = ? WHERE id = ?"
    ).run(JSON.stringify(mergedData), conversationId);

    // Update lead status to qualified
    db.prepare(
      "UPDATE leads SET status = 'qualified', updated_at = ? WHERE manychat_subscriber_id = ?"
    ).run(now, subscriberId);

    nextStage = "handed_off";
  }

  // 12. If rejected → update lead
  if (nextStage === "rejected") {
    db.prepare(
      "UPDATE leads SET status = 'rejected', updated_at = ? WHERE manychat_subscriber_id = ?"
    ).run(now, subscriberId);
  }

  // 13. Save agent reply
  const replyText = agentResponse.response_text;
  saveAgentMessage(conversationId, replyText, channel, now, {
    auto_reply: true,
    intake_stage: nextStage,
    source: "intake_processor",
  });

  // 14. Store in Supermemory
  void storeConversationTurn(conversationId, contactName, messageText, replyText, channel);

  console.log(`[Intake] ${contactName} | ${currentStage} -> ${nextStage} | "${messageText.slice(0, 60)}"`);

  return {
    replyText,
    nextStage,
    isTerminal: TERMINAL_STAGES.includes(nextStage),
  };
}

// ============================================================
// SAVE AGENT MESSAGE
// ============================================================

function saveAgentMessage(
  conversationId: string,
  content: string,
  channel: string,
  now: string,
  metadata: Record<string, unknown> = {}
) {
  const db = getDb();

  db.prepare(
    `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
     VALUES (?, 'agent', ?, ?, ?, ?)`
  ).run(conversationId, content, channel, now, JSON.stringify(metadata));

  db.prepare(
    "UPDATE conversations SET last_message = ?, last_message_at = ?, unread_count = 0 WHERE id = ?"
  ).run(content, now, conversationId);
}
