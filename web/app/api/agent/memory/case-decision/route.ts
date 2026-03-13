import { NextResponse } from "next/server";

import { storeCaseDecision } from "@/lib/supermemory";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      leadPhone?: string;
      leadName?: string;
      practiceArea?: string;
      scenario?: string;
      decision?: "accepted" | "rejected";
      reason?: string;
      keyFactors?: string;
      confidenceWas?: "high" | "medium" | "low";
    };

    if (!body.decision || (body.decision !== "accepted" && body.decision !== "rejected")) {
      return NextResponse.json({ error: "decision must be accepted or rejected" }, { status: 400 });
    }

    await storeCaseDecision({
      leadPhone: body.leadPhone || "",
      leadName: body.leadName || "",
      practiceArea: body.practiceArea || "unknown",
      scenario: body.scenario || "",
      decision: body.decision,
      reason: body.reason,
      keyFactors: body.keyFactors,
      confidenceWas: body.confidenceWas || "medium",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Case decision memory write failed:", error);
    return NextResponse.json({ error: "Failed to store case decision" }, { status: 500 });
  }
}
