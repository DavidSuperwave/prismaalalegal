/**
 * ManyChat bridge
 * - Forwards webhooks to the web app (primary path)
 * - Falls back to a minimal compatibility flow
 */

const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

const {
  MANYCHAT_WEBHOOK_SECRET,
  SUPERMEMORY_API_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_TOKEN_QUALIFIED,
  TELEGRAM_LEADS_CHAT_ID,
  OPENCLAW_GATEWAY_URL = "[REDACTED]",
  WEB_APP_INTERNAL_URL = "http://web:3000",
  PORT = 3300,
} = process.env;

const TELEGRAM_QUALIFIED_BOT_TOKEN = TELEGRAM_BOT_TOKEN_QUALIFIED || TELEGRAM_BOT_TOKEN;

app.get("/health", async (req, res) => {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  try {
    const ocResp = await fetch(`${OPENCLAW_GATEWAY_URL}/health`);
    checks.openclaw = ocResp.ok ? "connected" : "disconnected";
  } catch {
    checks.openclaw = "disconnected";
  }

  try {
    const smResp = await fetch("https://api.supermemory.ai/v3/health", {
      headers: { Authorization: `Bearer ${SUPERMEMORY_API_KEY}` },
    });
    checks.supermemory = smResp.ok ? "connected" : "disconnected";
  } catch {
    checks.supermemory = "disconnected";
  }

  res.json(checks);
});

async function notifyTelegramQualified(name, phone, reason) {
  if (!TELEGRAM_QUALIFIED_BOT_TOKEN || !TELEGRAM_LEADS_CHAT_ID) return;
  const text = `🔥 QUALIFIED LEAD\n\nName: ${name}\nPhone: ${phone || "N/A"}\nReason: ${reason}`;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_QUALIFIED_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_LEADS_CHAT_ID,
      text,
    }),
  }).catch(() => undefined);
}

app.post("/manychat/webhook", async (req, res) => {
  try {
    const webhookSecret = req.headers["x-webhook-secret"];
    if (MANYCHAT_WEBHOOK_SECRET && webhookSecret !== MANYCHAT_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Invalid webhook secret" });
    }

    // Primary path: keep business logic centralized in web app.
    try {
      const webResponse = await fetch(`${WEB_APP_INTERNAL_URL}/api/webhooks/manychat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret,
        },
        body: JSON.stringify(req.body),
      });

      if (webResponse.ok) {
        const payload = await webResponse.json();
        return res.json(payload);
      }
    } catch (error) {
      console.warn("Web app webhook path unavailable, using fallback:", error.message);
    }

    // Compatibility fallback
    const { subscriber, message } = req.body || {};
    if (!subscriber || !message?.text) {
      return res.status(400).json({ error: "Missing subscriber or message" });
    }

    return res.json({
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: process.env.MANYCHAT_AUTO_REPLY || "Gracias por tu mensaje. Un asesor te atendera en breve.",
          },
        ],
      },
    });
  } catch (error) {
    console.error("ManyChat bridge error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/manychat/qualify", async (req, res) => {
  try {
    const { reason, contact_info } = req.body || {};
    await notifyTelegramQualified(contact_info?.name || "Unknown", contact_info?.phone, reason || "Qualified");
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Qualify bridge error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ManyChat Bridge running on ${PORT}`);
  console.log(`OpenClaw Gateway: ${OPENCLAW_GATEWAY_URL}`);
});
