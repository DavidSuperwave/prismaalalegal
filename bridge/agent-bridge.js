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

// Bot tokens
const LEADS_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_LEADS || process.env.TELEGRAM_BOT_TOKEN;
const QUALIFIED_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_QUALIFIED;
const OPERATOR_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_OPERATOR || process.env.TELEGRAM_BOT_TOKEN;

// Chat IDs for different lead types
const LEADS_CHAT_ID = process.env.TELEGRAM_LEADS_CHAT_ID || '-5107802002';
const QUALIFIED_CHAT_ID = process.env.TELEGRAM_QUALIFIED_CHAT_ID || '-5107802002';
const REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID || '-5052838020';

const POLL_INTERVAL_MS = 5000;

// State tracking
let processedMessageIds = new Set();

function getDb() {
  return new Database(DB_PATH);
}

async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) {
    console.error('[Bridge] Missing bot token or chat ID');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // No parse_mode to avoid Markdown issues
      }),
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error(`[Bridge] Telegram failed:`, result.description);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Bridge] Telegram error:', error.message);
    return false;
  }
}

async function notifyAgents(contactName, messageText, conversationId, leadStatus) {
  const status = leadStatus || 'new';
  const preview = messageText.length > 200 ? `${messageText.slice(0, 200)}...` : messageText;
  
  // Determine which bot and chat to use based on lead status
  let botToken, chatId, agentMention, groupName;
  
  if (status === 'qualified') {
    // Qualified leads → qualified-leads bot → qualified group
    botToken = QUALIFIED_BOT_TOKEN || LEADS_BOT_TOKEN;
    chatId = QUALIFIED_CHAT_ID;
    agentMention = '@qualified-leads-agent';
    groupName = '#qualified-leads';
  } else {
    // New/contacted leads → leads-inbox bot → leads group
    botToken = LEADS_BOT_TOKEN;
    chatId = LEADS_CHAT_ID;
    agentMention = '@leads-inbox-agent';
    groupName = '#replies';
  }
  
  const text =
    `📩 New Inbound Message - ${agentMention}\n\n` +
    `👤 Contact: ${contactName}\n` +
    `💬 Message: ${preview}\n` +
    `🆔 Conversation: ${conversationId}\n` +
    `📊 Status: ${status}\n\n` +
    `Agent Instructions:\n` +
    `1. Get conversation details:\n` +
    `   GET http://web:3000/api/inbox/conversations/${conversationId}/details\n` +
    `   Header: x-service-token: YOUR_TOKEN\n\n` +
    `2. Draft reply in Spanish\n` +
    `3. Use skills to approve/send`;

  console.log(`[Bridge] Sending to ${groupName} (${chatId}) for ${contactName}`);
  const success = await sendTelegramMessage(botToken, chatId, text);
  
  if (success) {
    console.log(`[Bridge] ✓ Notification sent to ${groupName} for ${contactName}`);
  } else {
    console.log(`[Bridge] ✗ Failed to send to ${groupName}`);
  }
  
  return success;
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
      
      console.log(`[Bridge] Processing message from ${msg.contact_name}`);
      
      // Send Telegram notification to appropriate group
      await notifyAgents(
        msg.contact_name,
        msg.content,
        msg.conversation_id,
        msg.lead_status
      );
    }
  } catch (error) {
    console.error('[Bridge] Error:', error.message);
  } finally {
    db.close();
  }
}

// Main loop
console.log('[Bridge] Starting Alalegal Agent Bridge...');
console.log(`[Bridge] DB: ${DB_PATH}`);
console.log(`[Bridge] Leads Chat: ${LEADS_CHAT_ID}`);
console.log(`[Bridge] Qualified Chat: ${QUALIFIED_CHAT_ID}`);
console.log(`[Bridge] Polling every ${POLL_INTERVAL_MS}ms`);

// Initial check
setTimeout(checkNewMessages, 1000);

// Poll loop
setInterval(checkNewMessages, POLL_INTERVAL_MS);

// Keep alive
setInterval(() => {
  console.log('[Bridge] Heartbeat - still polling');
}, 60000);
