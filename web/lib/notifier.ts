/**
 * Unified operator notification module.
 * Sends to both Telegram and WhatsApp in parallel.
 * Each channel is independent — if one fails or is unconfigured, the other still works.
 */

const TELEGRAM_BOT_TOKEN_LEADS =
  process.env.TELEGRAM_BOT_TOKEN_LEADS || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_LEADS_CHAT_ID = process.env.TELEGRAM_LEADS_CHAT_ID;
const WHATSAPP_OPERATOR_PHONE = process.env.WHATSAPP_OPERATOR_PHONE;
const OPENCLAW_URL = process.env.OPENCLAW_URL || "http://openclaw:18789";

type NotifyOptions = {
  parseMode?: "Markdown" | "HTML";
};

async function sendTelegram(
  text: string,
  options: NotifyOptions = {}
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN_LEADS || !TELEGRAM_LEADS_CHAT_ID) return;

  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_LEADS}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_LEADS_CHAT_ID,
          text,
          ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
        }),
      }
    );
  } catch (error) {
    console.error("[Notifier] Telegram send failed:", error);
  }
}

async function sendWhatsApp(text: string): Promise<void> {
  if (!WHATSAPP_OPERATOR_PHONE) return;

  try {
    await fetch(`${OPENCLAW_URL}/api/sessions/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "operator",
        channel: "whatsapp",
        peer: WHATSAPP_OPERATOR_PHONE,
        message: text,
      }),
    });
  } catch (error) {
    console.error("[Notifier] WhatsApp send failed:", error);
  }
}

/** Strip Markdown formatting for WhatsApp plain-text delivery */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/**
 * Send a notification to the operator on all configured channels.
 * Telegram and WhatsApp are sent in parallel; failures are independent.
 */
export async function notifyOperator(
  text: string,
  options: NotifyOptions = {}
): Promise<void> {
  const whatsAppText =
    options.parseMode === "Markdown" ? stripMarkdown(text) : text;

  await Promise.allSettled([
    sendTelegram(text, options),
    sendWhatsApp(whatsAppText),
  ]);
}
