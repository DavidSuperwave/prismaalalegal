import { NextResponse } from "next/server";

import { getDb, parseJsonObject } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";
import type { IntakeStage, IntakeData } from "@/lib/intake-processor";

// ============================================================
// Case Criteria API
//
// GET  — Returns current criteria config
// POST — Actions: evaluate, accept, reject, simulate, review
// ============================================================

const CRITERIA = {
  required: ["serious_injury_or_death", "insurance_involved"],
  description:
    "Binary: serious injury or death + insurance/insurer involvement = accept. Everything else = reject.",
};

function getConversationWithIntake(conversationId: string) {
  const db = getDb();
  return db.prepare(
    `SELECT c.id, c.contact_name, c.contact_phone, c.intake_stage, c.intake_data, c.manychat_subscriber_id,
            l.status as lead_status, l.id as lead_id
     FROM conversations c
     LEFT JOIN leads l ON c.lead_id = l.id
     WHERE c.id = ?`
  ).get(conversationId) as {
    id: string;
    contact_name: string;
    contact_phone: string | null;
    intake_stage: string;
    intake_data: string;
    manychat_subscriber_id: string | null;
    lead_status: string | null;
    lead_id: string | null;
  } | undefined;
}

function evaluateCriteria(data: IntakeData): {
  decision: "ACCEPT" | "REJECT" | "INSUFFICIENT";
  reasoning: string;
} {
  const hasInjury =
    data.injury_severity === "grave" ||
    data.injury_severity === "muerte" ||
    data.incident_type?.toLowerCase().includes("muerte") ||
    data.incident_type?.toLowerCase().includes("mortal") ||
    data.injury_description?.toLowerCase().includes("grave") ||
    data.injury_description?.toLowerCase().includes("muerte") ||
    data.injury_description?.toLowerCase().includes("fallec");

  const hasInsurer = !!(data.insurer_name || data.insurer_status);

  if (!data.incident_type && !data.injury_description) {
    return {
      decision: "INSUFFICIENT",
      reasoning: "No hay suficiente informacion sobre el incidente o las lesiones.",
    };
  }

  if (hasInjury && hasInsurer) {
    return {
      decision: "ACCEPT",
      reasoning: `Lesiones graves/muerte confirmadas. Aseguradora: ${data.insurer_name || "mencionada"}.`,
    };
  }

  if (hasInjury && !hasInsurer) {
    return {
      decision: "INSUFFICIENT",
      reasoning: "Lesiones graves detectadas, pero falta informacion sobre aseguradora.",
    };
  }

  return {
    decision: "REJECT",
    reasoning: "No se detectan lesiones graves o muerte, o no hay aseguradora involucrada.",
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  return NextResponse.json({
    criteria: CRITERIA,
    stages: [
      "new", "greeting", "exploring", "collecting",
      "requesting_contact", "briefing", "handed_off",
      "rejected", "closed",
    ],
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const body = await request.json() as {
    action: string;
    conversation_id?: string;
    reason?: string;
    override_stage?: IntakeStage;
  };

  const { action, conversation_id } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  if (!conversation_id && action !== "list") {
    return NextResponse.json({ error: "Missing conversation_id" }, { status: 400 });
  }

  const db = getDb();

  switch (action) {
    case "evaluate": {
      const conv = getConversationWithIntake(conversation_id!);
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      const data = parseJsonObject<IntakeData>(conv.intake_data);
      const evaluation = evaluateCriteria(data);

      return NextResponse.json({
        conversation_id: conv.id,
        contact_name: conv.contact_name,
        current_stage: conv.intake_stage,
        evaluation,
        intake_data: data,
      });
    }

    case "accept": {
      const conv = getConversationWithIntake(conversation_id!);
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      const targetStage = body.override_stage || "collecting";
      db.prepare(
        "UPDATE conversations SET intake_stage = ? WHERE id = ?"
      ).run(targetStage, conversation_id);

      if (conv.lead_id) {
        db.prepare(
          "UPDATE leads SET status = 'qualified', updated_at = datetime('now') WHERE id = ?"
        ).run(conv.lead_id);
      }

      return NextResponse.json({
        conversation_id,
        action: "accepted",
        new_stage: targetStage,
      });
    }

    case "reject": {
      const conv = getConversationWithIntake(conversation_id!);
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      const reason = body.reason || "Manually rejected by operator";
      const data = parseJsonObject<IntakeData>(conv.intake_data);
      data.rejection_reason = reason;

      db.prepare(
        "UPDATE conversations SET intake_stage = 'rejected', intake_data = ? WHERE id = ?"
      ).run(JSON.stringify(data), conversation_id);

      if (conv.lead_id) {
        db.prepare(
          "UPDATE leads SET status = 'rejected', updated_at = datetime('now') WHERE id = ?"
        ).run(conv.lead_id);
      }

      return NextResponse.json({
        conversation_id,
        action: "rejected",
        reason,
      });
    }

    case "simulate": {
      const conv = getConversationWithIntake(conversation_id!);
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      const data = parseJsonObject<IntakeData>(conv.intake_data);
      const evaluation = evaluateCriteria(data);

      return NextResponse.json({
        conversation_id: conv.id,
        contact_name: conv.contact_name,
        current_stage: conv.intake_stage,
        simulation: true,
        evaluation,
        intake_data: data,
        note: "Dry-run — no state changes applied.",
      });
    }

    case "review": {
      const conv = getConversationWithIntake(conversation_id!);
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      const data = parseJsonObject<IntakeData>(conv.intake_data);
      return NextResponse.json({
        conversation_id: conv.id,
        contact_name: conv.contact_name,
        contact_phone: conv.contact_phone,
        current_stage: conv.intake_stage,
        lead_status: conv.lead_status,
        intake_data: data,
      });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
