#!/usr/bin/env node
/**
 * Alalegal Agent Bridge
 * Polls SQLite DB for new messages and routes to OpenClaw agents
 */

const Database = require('better-sqlite3');

// Dynamic import for node-fetch v3
let fetch;
import('node-fetch').then(mod => { fetch = mod.default; });

// Config
const DB_PATH = process.env.DB_PATH || '/app/data/template.db';
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://openclaw:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_AUTH_TOKEN || '';
const POLL_INTERVAL_MS = 5000;

// State tracking
let lastProcessedMessageId = null;

function getDb() {
  return new Database(DB_PATH);
}

async function sendToAgent(agentId, message, metadata = {}) {
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/sessions/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        agentId,
        message,
        metadata,
      }),
    });
    
    if (!response.ok) {
      console.error(`[Bridge] Failed to send to ${agentId}:`, response.status);
      return false;
    }
    
    console.log(`[Bridge] Message sent to ${agentId}`);
    return true;
  } catch (error) {
    console.error(`[Bridge] Error sending to ${agentId}:`, error.message);
    return false;
  }
}

async function checkNewMessages() {
  const db = getDb();
  
  try {
    // Get latest pending messages from contacts
    let query = `
      SELECT m.id, m.conversation_id, m.content, m.sender, m.timestamp,
             c.contact_name, c.contact_phone, l.id as lead_id, l.status as lead_status
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN leads l ON l.id = c.lead_id
      WHERE m.sender = 'contact'
      ORDER BY m.timestamp DESC
      LIMIT 10
    `;
    
    const messages = db.prepare(query).all();
    
    for (const msg of messages) {
      // Skip already processed
      if (lastProcessedMessageId && msg.id === lastProcessedMessageId) {
        continue;
      }
      
      console.log(`[Bridge] New message from ${msg.contact_name}: ${msg.content.slice(0, 50)}...`);
      
      // Determine which agent should handle this
      const agentMessage = formatAgentMessage(msg);
      
      if (msg.lead_status === 'new' || msg.lead_status === 'contacted') {
        // New leads go to leads-inbox for reply drafting
        await sendToAgent('leads-inbox', agentMessage, {
          conversationId: msg.conversation_id,
          leadId: msg.lead_id,
          contactName: msg.contact_name,
          contactPhone: msg.contact_phone,
        });
      } else if (msg.lead_status === 'qualified') {
        // Qualified leads go to qualified-leads for case review
        await sendToAgent('qualified-leads', agentMessage, {
          conversationId: msg.conversation_id,
          leadId: msg.lead_id,
          contactName: msg.contact_name,
          contactPhone: msg.contact_phone,
        });
      }
      
      lastProcessedMessageId = msg.id;
    }
  } catch (error) {
    console.error('[Bridge] Error checking messages:', error.message);
  } finally {
    db.close();
  }
}

function formatAgentMessage(msg) {
  return `📩 New inbound message from ${msg.contact_name} (${msg.contact_phone || 'no phone'})

💬 Message: "${msg.content}"

🆔 Conversation: ${msg.conversation_id}
📊 Lead Status: ${msg.lead_status || 'new'}

Your task:
1. Check conversation history if needed
2. Draft a professional reply in Spanish
3. Use /replyapprove when ready to send`;
}

// Main loop
console.log('[Bridge] Alalegal Agent Bridge starting...');
console.log(`[Bridge] OpenClaw: ${OPENCLAW_URL}`);
console.log(`[Bridge] DB: ${DB_PATH}`);
console.log(`[Bridge] Polling every ${POLL_INTERVAL_MS}ms`);

// Initial check
setTimeout(checkNewMessages, 1000);

// Poll loop
setInterval(checkNewMessages, POLL_INTERVAL_MS);

// Keep alive
setInterval(() => {
  console.log('[Bridge] Heartbeat - still polling');
}, 60000);
