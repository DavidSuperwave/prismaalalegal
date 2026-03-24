import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";

/**
 * Training Session API
 *
 * Manages training session state in SQLite. The OpenClaw leads-inbox
 * agent calls these endpoints via HTTP tools defined in openclaw-with-tools.json.
 *
 * Flow:
 *   POST /api/training { action: "start", category: "..." }
 *   POST /api/training { action: "add_exchange", customer_message, agent_reply }
 *   POST /api/training { action: "correct", index, corrected_text }
 *   POST /api/training { action: "finish" }
 *   POST /api/training { action: "cancel" }
 *   GET  /api/training  — get current session status
 */

const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY;
const CONTAINER_TAG = process.env.SUPERMEMORY_CONTAINER_TAG || "prismaalalegal_shared";

const VALID_CATEGORIES = [
  "accidente_mortal", "lesiones_graves", "negativa_aseguradora",
  "fuga_conductor", "accidente_laboral", "prescripcion",
  "culpable_propio", "sin_seguro", "penal_redireccion",
  "enojo_cliente", "solo_saludo", "recopilacion_datos", "general",
];

// Ensure training tables exist
function ensureTrainingTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      category TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      messages TEXT DEFAULT '[]',
      corrections TEXT DEFAULT '[]',
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );
  `);
}

type TrainingMessage = {
  role: "customer" | "agent";
  content: string;
  timestamp: string;
};

type TrainingCorrection = {
  index: number;
  original: string;
  corrected: string;
};

type SessionRow = {
  id: string;
  category: string;
  status: string;
  messages: string;
  corrections: string;
  started_at: string;
  finished_at: string | null;
};

function getActiveSession(): SessionRow | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM training_sessions WHERE status = 'active' LIMIT 1").get() as SessionRow) || null;
}

function parseMessages(raw: string): TrainingMessage[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function parseCorrections(raw: string): TrainingCorrection[] {
  try { return JSON.parse(raw); } catch { return []; }
}

// ============================================================
// SAVE TO SUPERMEMORY
// ============================================================

async function saveToSupermemory(session: SessionRow) {
  if (!SUPERMEMORY_API_KEY) return { conversationSaved: false, patternsSaved: 0 };

  const headers = {
    Authorization: `Bearer ${SUPERMEMORY_API_KEY}`,
    "Content-Type": "application/json",
  };

  const messages = parseMessages(session.messages);
  const corrections = parseCorrections(session.corrections);
  const conversationId = `training_${session.id}_${session.category}`;

  // Apply corrections
  const correctedMessages = [...messages];
  for (const c of corrections) {
    if (correctedMessages[c.index]) {
      correctedMessages[c.index] = { ...correctedMessages[c.index], content: c.corrected };
    }
  }

  // 1. Save full thread via v4/conversations
  const smMessages = correctedMessages.map((m) => ({
    role: m.role === "customer" ? "user" as const : "assistant" as const,
    content: m.content,
    ...(m.role === "customer" ? { name: "Cliente (simulado)" } : {}),
  }));

  let conversationSaved = false;
  try {
    const resp = await fetch("https://api.supermemory.ai/v4/conversations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        conversationId,
        messages: smMessages,
        containerTags: [CONTAINER_TAG],
        metadata: {
          type: "training_simulation",
          category: session.category,
          trained_by: "operator",
          corrections_count: corrections.length,
        },
      }),
    });
    conversationSaved = resp.ok;
  } catch (error) {
    console.error("[Training] Conversation save failed:", error);
  }

  // 2. Extract corrected exchanges as approved reply patterns
  let patternsSaved = 0;
  const correctedIndices = new Set(corrections.map((c) => c.index));

  for (let i = 0; i < correctedMessages.length; i++) {
    if (correctedMessages[i].role !== "agent") continue;
    const customerMsg = correctedMessages[i - 1];
    if (!customerMsg || customerMsg.role !== "customer") continue;

    const wasCorrected = correctedIndices.has(i);
    const content = [
      `SITUACIÓN DEL CLIENTE: Entrenamiento — ${session.category}`,
      `EJEMPLO DE MENSAJE: "${customerMsg.content}"`,
      `RESPUESTA APROBADA: "${correctedMessages[i].content}"`,
      wasCorrected
        ? `NOTAS: Corrección del operador durante entrenamiento.`
        : `NOTAS: Respuesta aceptada sin correcciones.`,
    ].join("\n");

    try {
      const resp = await fetch("https://api.supermemory.ai/v3/documents", {
        method: "POST",
        headers,
        body: JSON.stringify({
          content,
          containerTag: CONTAINER_TAG,
          customId: `training_pattern_${session.id}_${i}`,
          metadata: {
            type: "approved_reply",
            category: session.category,
            confidence: wasCorrected ? "high" : "medium",
            source: wasCorrected ? "training_correction" : "training_approved",
            channel: "all",
          },
        }),
      });
      if (resp.ok) patternsSaved++;
    } catch {
      // continue
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return { conversationSaved, patternsSaved };
}

// ============================================================
// POST — all training actions
// ============================================================

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  ensureTrainingTables();

  const body = (await request.json()) as {
    action: string;
    category?: string;
    customer_message?: string;
    agent_reply?: string;
    index?: number;
    corrected_text?: string;
  };

  const db = getDb();
  const now = nowIsoString();

  // --- START ---
  if (body.action === "start") {
    const existing = getActiveSession();
    if (existing) {
      return NextResponse.json({
        error: "Ya hay una sesión activa. Usa action=finish o action=cancel primero.",
        session_id: existing.id,
      }, { status: 409 });
    }

    const category = body.category || "general";
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: `Categoría no válida. Opciones: ${VALID_CATEGORIES.join(", ")}`,
      }, { status: 400 });
    }

    db.prepare(
      `INSERT INTO training_sessions (category, status, messages, corrections, started_at)
       VALUES (?, 'active', '[]', '[]', ?)`
    ).run(category, now);

    const session = getActiveSession();
    return NextResponse.json({
      success: true,
      session_id: session?.id,
      category,
      message: `Sesión de entrenamiento iniciada. Categoría: ${category}`,
    });
  }

  // --- ADD EXCHANGE ---
  if (body.action === "add_exchange") {
    const session = getActiveSession();
    if (!session) {
      return NextResponse.json({ error: "No hay sesión activa. Usa action=start." }, { status: 404 });
    }

    if (!body.customer_message?.trim() || !body.agent_reply?.trim()) {
      return NextResponse.json({ error: "customer_message y agent_reply son requeridos." }, { status: 400 });
    }

    const messages = parseMessages(session.messages);
    messages.push(
      { role: "customer", content: body.customer_message.trim(), timestamp: now },
      { role: "agent", content: body.agent_reply.trim(), timestamp: now }
    );

    db.prepare("UPDATE training_sessions SET messages = ? WHERE id = ?")
      .run(JSON.stringify(messages), session.id);

    return NextResponse.json({
      success: true,
      exchange_count: Math.floor(messages.length / 2),
      last_agent_index: messages.length - 1,
      message: `Intercambio ${Math.floor(messages.length / 2)} registrado.`,
    });
  }

  // --- CORRECT ---
  if (body.action === "correct") {
    const session = getActiveSession();
    if (!session) {
      return NextResponse.json({ error: "No hay sesión activa." }, { status: 404 });
    }

    const messages = parseMessages(session.messages);
    const corrections = parseCorrections(session.corrections);
    const index = body.index ?? messages.length - 1; // Default: last agent message

    if (index < 0 || index >= messages.length || messages[index].role !== "agent") {
      return NextResponse.json({ error: `Índice ${index} no es una respuesta del agente.` }, { status: 400 });
    }

    if (!body.corrected_text?.trim()) {
      return NextResponse.json({ error: "corrected_text es requerido." }, { status: 400 });
    }

    corrections.push({
      index,
      original: messages[index].content,
      corrected: body.corrected_text.trim(),
    });

    db.prepare("UPDATE training_sessions SET corrections = ? WHERE id = ?")
      .run(JSON.stringify(corrections), session.id);

    return NextResponse.json({
      success: true,
      corrections_count: corrections.length,
      corrected_index: index,
      message: `Corrección registrada para intercambio ${Math.ceil((index + 1) / 2)}.`,
    });
  }

  // --- FINISH ---
  if (body.action === "finish") {
    const session = getActiveSession();
    if (!session) {
      return NextResponse.json({ error: "No hay sesión activa." }, { status: 404 });
    }

    const messages = parseMessages(session.messages);
    if (messages.length === 0) {
      db.prepare("UPDATE training_sessions SET status = 'cancelled', finished_at = ? WHERE id = ?").run(now, session.id);
      return NextResponse.json({ success: true, message: "Sesión cancelada — sin mensajes." });
    }

    // Save to Supermemory
    const result = await saveToSupermemory(session);

    db.prepare("UPDATE training_sessions SET status = 'completed', finished_at = ? WHERE id = ?").run(now, session.id);

    const corrections = parseCorrections(session.corrections);
    return NextResponse.json({
      success: true,
      session_id: session.id,
      category: session.category,
      exchanges: Math.floor(messages.length / 2),
      corrections: corrections.length,
      supermemory: result,
      message: `Sesión guardada. ${Math.floor(messages.length / 2)} intercambios, ${corrections.length} correcciones, ${result.patternsSaved} patrones creados.`,
    });
  }

  // --- CANCEL ---
  if (body.action === "cancel") {
    const session = getActiveSession();
    if (!session) {
      return NextResponse.json({ error: "No hay sesión activa." }, { status: 404 });
    }

    db.prepare("UPDATE training_sessions SET status = 'cancelled', finished_at = ? WHERE id = ?").run(now, session.id);
    return NextResponse.json({ success: true, message: "Sesión cancelada." });
  }

  return NextResponse.json({ error: "action no válida. Usa: start, add_exchange, correct, finish, cancel" }, { status: 400 });
}

// ============================================================
// GET — current session status
// ============================================================

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  ensureTrainingTables();

  const session = getActiveSession();
  if (!session) {
    return NextResponse.json({ active: false, message: "No hay sesión activa." });
  }

  const messages = parseMessages(session.messages);
  const corrections = parseCorrections(session.corrections);

  return NextResponse.json({
    active: true,
    session_id: session.id,
    category: session.category,
    exchanges: Math.floor(messages.length / 2),
    corrections: corrections.length,
    started_at: session.started_at,
  });
}
