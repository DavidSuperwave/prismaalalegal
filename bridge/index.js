/**
 * ManyChat Bridge — Express server
 * Receives ManyChat webhooks and forwards to OpenClaw
 */

const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());

// Environment variables
const {
  MANYCHAT_WEBHOOK_SECRET,
  MANYCHAT_API_KEY,
  SUPERMEMORY_API_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_REPLIES_CHAT_ID,
  TELEGRAM_LEADS_CHAT_ID,
  AGENT_SLUG = 'prismaalalegal',
  OPENCLAW_GATEWAY_URL = 'http://openclaw:3100',
  WEB_APP_INTERNAL_URL = 'http://web:3000',
  PORT = 3300,
} = process.env;

// Health check
app.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Check OpenClaw
  try {
    const ocResp = await fetch(`${OPENCLAW_GATEWAY_URL}/health`);
    checks.openclaw = ocResp.ok ? 'connected' : 'disconnected';
  } catch {
    checks.openclaw = 'disconnected';
  }

  // Check Supermemory
  try {
    const smResp = await fetch('https://api.supermemory.ai/v3/health', {
      headers: { 'Authorization': `Bearer ${SUPERMEMORY_API_KEY}` },
    });
    checks.supermemory = smResp.ok ? 'connected' : 'disconnected';
  } catch {
    checks.supermemory = 'disconnected';
  }

  res.json(checks);
});

// ManyChat webhook
app.post('/manychat/webhook', async (req, res) => {
  try {
    // Validate webhook secret
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== MANYCHAT_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    // Extract data
    const { subscriber, message } = req.body;
    if (!subscriber || !message) {
      return res.status(400).json({ error: 'Missing subscriber or message' });
    }

    // Prefer the new Phase 2 web app so CRM and inbox stay in sync.
    try {
      const webResponse = await fetch(`${WEB_APP_INTERNAL_URL}/api/webhooks/manychat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret,
        },
        body: JSON.stringify(req.body),
      });

      if (webResponse.ok) {
        const payload = await webResponse.json();
        return res.json(payload);
      }
    } catch (forwardError) {
      console.warn('Web app webhook unavailable, using legacy bridge flow:', forwardError.message);
    }

    const contactName = subscriber.name || 'Unknown';
    const contactPhone = subscriber.phone;
    const contactEmail = subscriber.email;
    const subscriberId = subscriber.id;
    const messageText = message.text || '';

    // Log to console
    console.log(`[ManyChat] ${contactName}: ${messageText}`);

    // Store in Supermemory
    await storeConversation(contactName, messageText, 'manychat', {
      phone: contactPhone,
      email: contactEmail,
      subscriber_id: subscriberId,
    });

    // Notify Telegram #replies
    await notifyTelegramReply(contactName, messageText, 'manychat');

    // Forward to OpenClaw
    const openclawResp = await fetch(`${OPENCLAW_GATEWAY_URL}/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: `[ManyChat] ${contactName}: ${messageText}`,
        channel: 'manychat',
        metadata: {
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          subscriber_id: subscriberId,
        },
      }),
    });

    if (!openclawResp.ok) {
      throw new Error(`OpenClaw error: ${openclawResp.status}`);
    }

    const agentResponse = await openclawResp.json();
    const responseText = agentResponse.content || agentResponse.message || 'Thank you for your message. An attorney will review this shortly.';

    // Return ManyChat format
    res.json({
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      },
    });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Qualify lead endpoint
app.post('/manychat/qualify', async (req, res) => {
  try {
    const { subscriber_id, reason, contact_info } = req.body;
    
    // Store qualification
    await storeQualification(subscriber_id, reason, contact_info);
    
    // Notify Telegram #qualified-leads
    await notifyTelegramQualified(
      contact_info.name,
      contact_info.phone,
      reason,
      true
    );

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Qualify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper: Store conversation in Supermemory
async function storeConversation(contactName, message, channel, metadata) {
  try {
    await fetch('https://api.supermemory.ai/v3/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `[${channel}] ${contactName}: ${message}`,
        containerTags: [`client:${AGENT_SLUG}:conversations`],
        metadata: {
          type: 'conversation',
          contact_name: contactName,
          channel,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      }),
    });
  } catch (err) {
    console.error('Failed to store conversation:', err.message);
  }
}

// Helper: Store qualification
async function storeQualification(subscriberId, reason, contactInfo) {
  try {
    await fetch('https://api.supermemory.ai/v3/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: JSON.stringify({ subscriberId, reason, contactInfo }),
        containerTags: [`client:${AGENT_SLUG}:qualified`],
        metadata: {
          type: 'qualified',
          reason,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (err) {
    console.error('Failed to store qualification:', err.message);
  }
}

// Helper: Notify Telegram #replies
async function notifyTelegramReply(contactName, message, channel) {
  try {
    const text = `📨 **[${channel.toUpperCase()}]** from *${contactName}*\n\n${message}`;
    
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_REPLIES_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to notify Telegram:', err.message);
  }
}

// Helper: Notify Telegram #qualified-leads
async function notifyTelegramQualified(name, phone, reason, createInvite = false) {
  try {
    let text = `🔥 **QUALIFIED LEAD**\n\n`;
    text += `**Name:** ${name}\n`;
    text += `**Phone:** ${phone || 'N/A'}\n`;
    text += `**Reason:** ${reason}`;

    if (createInvite) {
      const inviteResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_LEADS_CHAT_ID,
          member_limit: 1,
        }),
      });
      
      const inviteData = await inviteResp.json();
      if (inviteData.ok) {
        text += `\n\n📎 **Invite:** ${inviteData.result.invite_link}`;
      }
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_LEADS_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to notify qualified lead:', err.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`ManyChat Bridge running on port ${PORT}`);
  console.log(`OpenClaw Gateway: ${OPENCLAW_GATEWAY_URL}`);
  console.log(`Agent Slug: ${AGENT_SLUG}`);
});
