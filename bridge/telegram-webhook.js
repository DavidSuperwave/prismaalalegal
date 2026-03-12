/**
 * Telegram Webhook Handler
 * Receives updates from Telegram (commands, messages and callbacks)
 * Endpoint: POST /telegram/webhook
 */

const fetch = require('node-fetch');
const telegramCommands = require('../workspace/skills/telegram-commands');

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const token = process.env.TELEGRAM_BOT_TOKEN;
const manychatKey = process.env.MANYCHAT_API_KEY;
const openclawUrl = process.env.OPENCLAW_GATEWAY_URL;
const botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace('@', '').toLowerCase();
const baseUrl = `${TELEGRAM_API_BASE}${token}`;

const draftCache = new Map();

function isGroupChat(chatType) {
  return chatType === 'group' || chatType === 'supergroup';
}

function messageMentionsBot(message) {
  if (!message?.text || !Array.isArray(message.entities)) return false;

  return message.entities.some((entity) => {
    if (entity.type === 'text_mention' && entity.user?.is_bot) {
      return true;
    }

    if (entity.type !== 'mention') return false;
    const mention = message.text.slice(entity.offset, entity.offset + entity.length).replace('@', '').toLowerCase();
    return Boolean(botUsername) && mention === botUsername;
  });
}

function shouldHandleGroupConversation(message) {
  if (!isGroupChat(message?.chat?.type)) return false;
  if (!message?.text || message.text.startsWith('/')) return false;
  if (message.reply_to_message?.from?.is_bot) return true;
  return messageMentionsBot(message);
}

async function sendTelegramMessage(chatId, text, replyToMessageId, replyMarkup) {
  await fetch(`${baseUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function answerCallbackQuery(callbackQueryId, text) {
  await fetch(`${baseUrl}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    }),
  });
}

async function handleGroupConversation(message) {
  const { text, chat, from } = message;

  try {
    const response = await fetch(`${openclawUrl}/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        channel: 'telegram_group',
        content: `[TELEGRAM_ADMIN] ${from.first_name}: ${text}`,
        metadata: {
          chat_id: chat.id,
          user_name: from.first_name,
          query_type: 'group_conversation',
        },
      }),
    });

    const data = await response.json();
    const reply = data.content || data.message || 'No pude procesar eso.';

    await sendTelegramMessage(chat.id, reply, message.message_id);
  } catch (err) {
    console.error('Group conversation error:', err);
    await sendTelegramMessage(chat.id, 'Ocurrió un error al consultar al agente.', message.message_id);
  }
}

async function getDraftReply(subscriberId, from) {
  const response = await fetch(`${openclawUrl}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'user',
      channel: 'telegram_admin',
      content:
        `[TELEGRAM_ADMIN] ${from.first_name} solicitó borrador para lead ${subscriberId}. ` +
        'Redacta una respuesta breve, empática y accionable en español para seguimiento legal.',
      metadata: {
        query_type: 'draft_reply',
        subscriber_id: subscriberId,
        user_name: from.first_name,
      },
    }),
  });

  const data = await response.json();
  return data.content || data.message || 'Hola, gracias por escribirnos. ¿Podemos agendar una llamada para revisar tu caso?';
}

async function sendManyChatReply(subscriberId, message) {
  const response = await fetch('https://api.manychat.com/fb/sending/sendContent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${manychatKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscriber_id: subscriberId,
      data: {
        version: 'v2',
        content: {
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
      },
      message_tag: 'HUMAN_AGENT',
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`ManyChat error: ${response.status} ${errorPayload}`);
  }
}

async function getManyChatSubscriberInfo(subscriberId) {
  const response = await fetch(`https://api.manychat.com/fb/subscriber/getInfo?subscriber_id=${subscriberId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${manychatKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`ManyChat getInfo error: ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data || payload?.result || null;
}

async function handleCallback(callbackQuery) {
  const data = callbackQuery?.data || '';
  const chatId = callbackQuery?.message?.chat?.id;
  const callbackId = callbackQuery?.id;
  const from = callbackQuery?.from || { first_name: 'Equipo' };

  if (!chatId || !callbackId) return;

  if (data.startsWith('status:')) {
    const subscriberId = data.split(':')[1];
    await answerCallbackQuery(callbackId, 'Consultando estado...');
    try {
      const info = await getManyChatSubscriberInfo(subscriberId);
      const statusText =
        `📋 Estado del lead ${subscriberId}\n` +
        `👤 Nombre: ${info?.first_name || info?.name || 'N/A'}\n` +
        `📱 Teléfono: ${info?.phone || 'N/A'}\n` +
        `📧 Email: ${info?.email || 'N/A'}\n` +
        `🟢 Suscrito: ${info?.status || 'activo'}`;
      await sendTelegramMessage(chatId, statusText);
    } catch {
      await sendTelegramMessage(
        chatId,
        `No pude obtener el estado del lead ${subscriberId}. Verifica permisos de ManyChat API.`
      );
    }
    return;
  }

  if (data.startsWith('draft_reply:')) {
    const subscriberId = data.split(':')[1];
    await answerCallbackQuery(callbackId, 'Generando borrador...');
    const draftText = await getDraftReply(subscriberId, from);
    const draftId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    draftCache.set(draftId, { subscriberId, draftText, from: from.first_name });

    await sendTelegramMessage(
      chatId,
      `🤖 Respuesta sugerida:\n\n"${draftText}"`,
      callbackQuery.message?.message_id,
      {
        inline_keyboard: [
          [
            { text: '✅ Enviar', callback_data: `send_draft:${draftId}` },
            { text: '❌ Cancelar', callback_data: `cancel_draft:${draftId}` },
          ],
        ],
      }
    );
    return;
  }

  if (data.startsWith('send_draft:')) {
    const draftId = data.split(':')[1];
    const draft = draftCache.get(draftId);
    await answerCallbackQuery(callbackId, 'Enviando respuesta...');

    if (!draft) {
      await sendTelegramMessage(chatId, 'El borrador ya no está disponible.');
      return;
    }

    await sendManyChatReply(draft.subscriberId, draft.draftText);
    await telegramCommands.storeReplyInMemory(draft.subscriberId, draft.draftText, draft.from);
    draftCache.delete(draftId);
    await sendTelegramMessage(chatId, `✅ Respuesta enviada al lead ${draft.subscriberId}.`);
    return;
  }

  if (data.startsWith('cancel_draft:')) {
    const draftId = data.split(':')[1];
    draftCache.delete(draftId);
    await answerCallbackQuery(callbackId, 'Borrador cancelado');
    return;
  }

  await answerCallbackQuery(callbackId);
}

// Handle incoming Telegram update
async function handleTelegramUpdate(req, res) {
  const update = req.body;

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return res.json({ ok: true, processed: true });
    }

    if (update.message) {
      const { message } = update;

      if (message.text && message.text.startsWith('/')) {
        const result = await telegramCommands.processMessage(message);
        if (result) {
          return res.json({ ok: true, processed: true });
        }
      }

      if (shouldHandleGroupConversation(message)) {
        await handleGroupConversation(message);
        return res.json({ ok: true, processed: true });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  handleTelegramUpdate,
};
