#!/usr/bin/env node
/**
 * Alalegal Agent Bridge
 * Polls SQLite DB for new messages and notifies agents via Telegram
 */

const Database = require('better-sqlite3');

// Dynamic import for node-fetch v3
let fetch;
import('node-fetch').then(mod => { fetch = mod.default; });

// Config
const DB_PATH = process.env.DB_PATH || '/app/data/template.db';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_LEADS || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID;
const POLL_INTERVAL_MS = 5000;

// State tracking
let lastProcessedMessageId = null;
let processedMessageIds = new Set();

function getDb() {
  return new Database(DB_PATH);
}

function escapeMarkdown(text) {
  if (!text) return '';
  // Escape special Markdown characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/[_*\[\]()~`>#+=|{}.!]/g, '\\$1');
}

async function notifyTelegram(contactName, messageText, conversationId, subscriberId, leadStatus) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_REPLIES_CHAT_ID) {
    console.error('[Bridge] Telegram credentials not configured');
    return false;
  }

  const preview = messageText.length > 200 ? `${messageText.slice(0, 200)}...` : messageText;
  const status = leadStatus || 'new';
  
  // Determine which agent should handle based on status
  const agentMention = (status === 'qualified') ? '@qualified-leads-agent' : '@leads-inbox-agent';
  
  // Use plain text instead of Markdown to avoid parsing issues
  const text =
    `📩 New Inbound Message ${agentMention}\n\n` +
    `👤 Contact: ${contactName}\n` +
    `💬 Message: ${preview}\n` +
    `🆔 Conversation: ${conversationId}\n` +
    `📊 Status: ${status}\n\n` +
    `Agent Instructions:\n` +
    `1. Use web_fetch to get conversation:\n` +
    `   GET http://web:3000/api/inbox/conversations/${conversationId}/details\n` +
    `   Header: x-service-token: ${process.env.INTERNAL_SERVICE_TOKEN || 'YOUR_TOKEN'}\n\n` +
    `2. Draft reply in Spanish\n` +
    `3. Use your skills to send/approve`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_REPLIES_CHAT_ID,
        text,
        // No parse_mode to avoid Markdown issues
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[Bridge] Telegram notification failed:`, error);
      return false;
    }
    
    const result = await response.json();
    if (!result.ok) {
      console.error(`[Bridge] Telegram API error:`, result.description);
      return false;
    }
    
    console.log(`[Bridge] Telegram notification sent for ${contactName}`);
    return true;
  } catch (error) {
    console.error('[Bridge] Telegram send failed:', error.message);
    return false;
  }
}

async function checkNewMessages() {
  const db = getDb();
  
  try {
    // Get latest pending messages from contacts
    let query = `
      SELECT m.id, m.conversation_id, m.content, m.sender, m.timestamp,
             c.contact_name, c.contact_phone, l.id as lead_id, l.status as lead_status,
             c.manychat_subscriber_id
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN leads l ON l.id = c.lead_id
      WHERE m.sender = 'contact'
      ORDER BY datetime(m.timestamp) DESC
      LIMIT 20
    `;
    
    const messages = db.prepare(query).all();
    
    for (const msg of messages) {
      // Skip already processed messages
      if (processedMessageIds.has(msg.id)) {
        continue;
      }
      
      // Add to processed set (keep last 1000 to prevent memory leak)
      processedMessageIds.add(msg.id);
      if (processedMessageIds.size > 1000) {
        const firstKey = processedMessageIds.values().next().value;
        processedMessageIds.delete(firstKey);
      }
      
      console.log(`[Bridge] New message from ${msg.contact_name}: ${msg.content.slice(0, 50)}...`);
      
      // Send Telegram notification
      await notifyTelegram(
        msg.contact_name,
        msg.content,
        msg.conversation_id,
        msg.manychat_subscriber_id,
        msg.lead_status
      );
      
      lastProcessedMessageId = msg.id;
    }
  } catch (error) {
    console.error('[Bridge] Error checking messages:', error.message);
  } finally {
    db.close();
  }
}

// Main loop
console.log('[Bridge] Alalegal Agent Bridge starting...');
console.log(`[Bridge] DB: ${DB_PATH}`);
console.log(`[Bridge] Telegram Chat: ${TELEGRAM_REPLIES_CHAT_ID}`);
console.log(`[Bridge] Polling every ${POLL_INTERVAL_MS}ms`);

// Initial check
setTimeout(checkNewMessages, 1000);

// Poll loop
setInterval(checkNewMessages, POLL_INTERVAL_MS);

// Keep alive
setInterval(() => {
  console.log('[Bridge] Heartbeat - still polling');
}, 60000);
