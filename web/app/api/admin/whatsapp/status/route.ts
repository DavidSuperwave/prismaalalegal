import { NextResponse } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";

const OPENCLAW_URL =
  process.env.OPENCLAW_AGENT_URL ||
  process.env.OPENCLAW_GATEWAY_URL ||
  "http://localhost:3100";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  try {
    // Try the WhatsApp status endpoint
    const statusRes = await fetch(
      `${OPENCLAW_URL}/api/channels/whatsapp/status`,
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (statusRes.ok) {
      const data = await statusRes.json();
      // Normalize response shape
      const installed = data.installed !== false;
      const linked = !!data.linked || !!data.connected || !!data.authenticated;
      const qr = data.qr || data.qrCode || data.qr_code || null;
      const phone = data.phone || data.phoneNumber || data.phone_number || null;

      let status: string;
      if (linked) {
        status = "linked";
      } else if (qr) {
        status = "qr_ready";
      } else if (!installed) {
        status = "not_installed";
      } else {
        status = "qr_ready"; // installed but not linked, need QR
      }

      return NextResponse.json({ status, installed, linked, phone, qr });
    }

    // If 404, the WhatsApp channel might not be installed
    if (statusRes.status === 404) {
      // Check if OpenClaw is alive
      const healthRes = await fetch(`${OPENCLAW_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (healthRes?.ok) {
        return NextResponse.json({
          status: "not_installed",
          installed: false,
          linked: false,
        });
      }
    }

    return NextResponse.json(
      {
        status: "error",
        error: `OpenClaw returned ${statusRes.status}`,
      },
      { status: 502 }
    );
  } catch (err) {
    // Check if OpenClaw is reachable at all
    try {
      const healthRes = await fetch(`${OPENCLAW_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        // OpenClaw is up but WhatsApp endpoint doesn't exist
        return NextResponse.json({
          status: "not_installed",
          installed: false,
          linked: false,
        });
      }
    } catch {
      // OpenClaw is completely down
    }

    return NextResponse.json(
      {
        status: "openclaw_down",
        error:
          err instanceof Error ? err.message : "No se pudo conectar a OpenClaw",
      },
      { status: 503 }
    );
  }
}
