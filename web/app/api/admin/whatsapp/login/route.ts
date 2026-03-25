import { NextResponse } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";

const OPENCLAW_URL =
  process.env.OPENCLAW_AGENT_URL ||
  process.env.OPENCLAW_GATEWAY_URL ||
  "http://localhost:3100";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  try {
    const loginRes = await fetch(
      `${OPENCLAW_URL}/api/channels/whatsapp/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (loginRes.ok) {
      const data = await loginRes.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      {
        error: `OpenClaw returned ${loginRes.status}`,
      },
      { status: loginRes.status >= 500 ? 502 : loginRes.status }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "No se pudo conectar a OpenClaw",
      },
      { status: 503 }
    );
  }
}
