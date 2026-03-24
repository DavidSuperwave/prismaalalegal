import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";
import { sendManyChatContent, sendManyChatFlow, hoursSinceLastMessage } from "@/lib/manychat";

const CASE_ACCEPTED_FLOW_ID = process.env.MANYCHAT_CASE_ACCEPTED_FLOW_ID || "";
const FOLLOW_UP_FLOW_ID = process.env.MANYCHAT_FOLLOW_UP_FLOW_ID || "";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const body = (await request.json()) as {
    subscriber_id?: string;
    message?: string;
    template_type?: "case_accepted" | "follow_up";
    case_summary?: string;
  };

  const subscriberId = body.subscriber_id?.trim();
  if (!subscriberId) {
    return NextResponse.json({ error: "subscriber_id is required" }, { status: 400 });
  }

  // Look up last message time for this subscriber
  const db = getDb();
  const conversation = db.prepare(
    "SELECT last_message_at FROM conversations WHERE manychat_subscriber_id = ? LIMIT 1"
  ).get(subscriberId) as { last_message_at: string | null } | undefined;

  const hoursSince = hoursSinceLastMessage(conversation?.last_message_at || null);
  const within24h = hoursSince <= 23;

  // Within 24h: send freeform content
  if (within24h && body.message) {
    const result = await sendManyChatContent(subscriberId, body.message, conversation?.last_message_at);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, method: "sendContent", hours_since: hoursSince });
  }

  // Outside 24h or no freeform message: use flow template
  if (!within24h || !body.message) {
    const templateType = body.template_type || "case_accepted";
    const flowId = templateType === "follow_up" ? FOLLOW_UP_FLOW_ID : CASE_ACCEPTED_FLOW_ID;

    if (!flowId) {
      return NextResponse.json({
        error: `ManyChat flow template for '${templateType}' is not configured. ` +
               `Set MANYCHAT_${templateType === "follow_up" ? "FOLLOW_UP" : "CASE_ACCEPTED"}_FLOW_ID in your environment. ` +
               `Templates must be approved by Meta before they can be used for outbound WhatsApp messages.`,
        setup_required: true,
        template_type: templateType,
      }, { status: 422 });
    }

    const result = await sendManyChatFlow(subscriberId, flowId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, method: "sendFlow", template_type: templateType });
  }

  return NextResponse.json({ error: "No message or template_type provided" }, { status: 400 });
}
