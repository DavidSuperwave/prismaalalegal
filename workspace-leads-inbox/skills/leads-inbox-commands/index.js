const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL || "http://web:3000";
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY || "";

// Supermemory tracking for all actions
async function trackAction(action, context, result) {
  if (!SUPERMEMORY_API_KEY) return;
  
  try {
    await fetch('https://api.supermemory.ai/v3/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: JSON.stringify({
          type: 'agent_action',
          action,
          context,
          result,
          timestamp: new Date().toISOString(),
        }),
        containerTags: ['prismaalalegal:actions', 'prismaalalegal:leads-inbox'],
        metadata: {
          type: 'agent_action',
          action,
          agent: 'leads-inbox',
        },
      }),
    });
  } catch (error) {
    console.error('[trackAction] Failed:', error.message);
  }
}

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "x-service-token": SERVICE_TOKEN,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

// Get pending replies (filtered by phone/name if provided)
async function getPendingReplies(filter = null) {
  const query = new URLSearchParams({
    status: "pending",
    limit: "20",
  });
  
  if (filter) {
    query.append("search", filter);
  }
  
  const payload = await getJson(`${WEB_APP_URL}/api/inbox/replies?${query.toString()}`);
  return payload.replies || [];
}

// Get all leads (filtered by phone/name if provided)
async function getLeads(filter = null) {
  const url = filter 
    ? `${WEB_APP_URL}/api/crm/leads?search=${encodeURIComponent(filter)}`
    : `${WEB_APP_URL}/api/crm/leads`;
  
  const payload = await getJson(url);
  return payload.leads || [];
}

// Get conversation details
async function getConversation(conversationId) {
  return getJson(`${WEB_APP_URL}/api/inbox/conversations/${conversationId}/details`);
}

// Create draft reply
async function createDraft(conversationId, text, agentDraft = null) {
  return getJson(`${WEB_APP_URL}/api/inbox/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      final_text: text,
      agent_draft: agentDraft || text,
      status: "pending",
    }),
  });
}

// Update draft
async function updateDraft(replyId, text) {
  return getJson(`${WEB_APP_URL}/api/inbox/replies/${replyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      final_text: text,
      operator_edit: text,
    }),
  });
}

// Send reply to ManyChat
async function sendReply(replyId) {
  // Get reply details first
  const reply = await getJson(`${WEB_APP_URL}/api/inbox/replies/${replyId}`);
  
  // Mark as sent
  await getJson(`${WEB_APP_URL}/api/inbox/replies/${replyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "sent" }),
  });
  
  // Send to ManyChat via bridge
  await getJson(`${WEB_APP_URL}/api/inbox/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: reply.conversation_id,
      message: reply.final_text,
    }),
  });
  
  return reply;
}

// Format lead for display
function formatLead(lead) {
  return `👤 ${lead.name}\n   📱 ${lead.phone || 'N/A'}\n   📊 ${lead.status}\n   🆔 ${lead.id.slice(0, 8)}...`;
}

// Format reply for display
function formatReply(reply) {
  return `📝 Reply for conversation ${reply.conversation_id.slice(0, 8)}...\n   Status: ${reply.status}\n   Text: ${reply.final_text.slice(0, 100)}...`;
}

module.exports = {
  name: "leads-inbox-commands",
  description: "Enhanced slash commands for leads inbox management with Supermemory tracking",

  async execute({ command, context }) {
    const normalized = String(command || "").trim();
    const cmdParts = normalized.split(/\s+/);
    const cmd = cmdParts[0].toLowerCase();
    const args = cmdParts.slice(1);
    
    // /get [filter] - Get pending replies or leads
    if (cmd === "/get") {
      const filter = args.join(" ").trim() || null;
      
      try {
        // If filter looks like a phone or name, search leads
        if (filter && (filter.match(/^\d/) || filter.length > 3)) {
          const leads = await getLeads(filter);
          
          await trackAction("/get leads", { filter, count: leads.length }, "success");
          
          if (!leads.length) {
            return `No leads found matching "${filter}".`;
          }
          
          return `Found ${leads.length} lead(s):\n\n${leads.map(formatLead).join("\n\n")}`;
        }
        
        // Otherwise get pending replies
        const replies = await getPendingReplies(filter);
        
        await trackAction("/get replies", { filter, count: replies.length }, "success");
        
        if (!replies.length) {
          return filter 
            ? `No pending replies found matching "${filter}".`
            : "No pending replies. All caught up! ✓";
        }
        
        return `Found ${replies.length} pending reply(ies):\n\n${replies.map(formatReply).join("\n\n")}`;
        
      } catch (error) {
        await trackAction("/get", { filter }, `error: ${error.message}`);
        return `Error fetching data: ${error.message}`;
      }
    }
    
    // /get all - Get all pending replies
    if (cmd === "/get" && args[0] === "all") {
      try {
        const replies = await getPendingReplies();
        
        await trackAction("/get all", { count: replies.length }, "success");
        
        if (!replies.length) {
          return "No pending replies. All caught up! ✓";
        }
        
        return `📋 All Pending Replies (${replies.length}):\n\n${replies.map(formatReply).join("\n\n")}`;
      } catch (error) {
        await trackAction("/get all", {}, `error: ${error.message}`);
        return `Error: ${error.message}`;
      }
    }
    
    // /draft [phone/name] [text] - Create or update draft
    if (cmd === "/draft") {
      if (args.length < 2) {
        return "Usage: /draft [phone or name] [reply text]\nExample: /draft 8112345678 Hola, gracias por contactarnos...";
      }
      
      const identifier = args[0];
      const text = args.slice(1).join(" ");
      
      try {
        // Find lead by phone or name
        const leads = await getLeads(identifier);
        if (!leads.length) {
          await trackAction("/draft", { identifier }, "lead not found");
          return `No lead found with identifier: ${identifier}`;
        }
        
        const lead = leads[0];
        
        // Get conversation for this lead
        const conversations = await getJson(`${WEB_APP_URL}/api/inbox/conversations`);
        const conversation = conversations.conversations?.find(c => c.leadId === lead.id);
        
        if (!conversation) {
          await trackAction("/draft", { identifier, leadId: lead.id }, "conversation not found");
          return `No conversation found for ${lead.name}`;
        }
        
        // Check if draft already exists
        const existingReplies = await getPendingReplies();
        const existingReply = existingReplies.find(r => r.conversation_id === conversation.id);
        
        let result;
        if (existingReply) {
          // Update existing
          result = await updateDraft(existingReply.id, text);
          await trackAction("/draft update", { replyId: existingReply.id, leadId: lead.id }, "success");
          return `✓ Draft updated for ${lead.name}\n\nNew text: ${text.slice(0, 200)}...\n\nUse /sendreply ${identifier} to send.`;
        } else {
          // Create new
          result = await createDraft(conversation.id, text);
          await trackAction("/draft create", { conversationId: conversation.id, leadId: lead.id }, "success");
          return `✓ Draft created for ${lead.name}\n\nText: ${text.slice(0, 200)}...\n\nUse /sendreply ${identifier} to send.`;
        }
        
      } catch (error) {
        await trackAction("/draft", { identifier, text: text.slice(0, 50) }, `error: ${error.message}`);
        return `Error creating draft: ${error.message}`;
      }
    }
    
    // /sendreply [phone/name] - Send pending reply
    if (cmd === "/sendreply") {
      if (!args.length) {
        return "Usage: /sendreply [phone or name]\nExample: /sendreply 8112345678";
      }
      
      const identifier = args.join(" ");
      
      try {
        // Find lead
        const leads = await getLeads(identifier);
        if (!leads.length) {
          await trackAction("/sendreply", { identifier }, "lead not found");
          return `No lead found: ${identifier}`;
        }
        
        const lead = leads[0];
        
        // Get conversation
        const conversations = await getJson(`${WEB_APP_URL}/api/inbox/conversations`);
        const conversation = conversations.conversations?.find(c => c.leadId === lead.id);
        
        if (!conversation) {
          await trackAction("/sendreply", { identifier, leadId: lead.id }, "conversation not found");
          return `No conversation found for ${lead.name}`;
        }
        
        // Find pending reply
        const replies = await getPendingReplies();
        const reply = replies.find(r => r.conversation_id === conversation.id);
        
        if (!reply) {
          await trackAction("/sendreply", { identifier, leadId: lead.id }, "no pending reply");
          return `No pending reply found for ${lead.name}. Create one with /draft first.`;
        }
        
        // Send it
        await sendReply(reply.id);
        
        await trackAction("/sendreply", { replyId: reply.id, leadId: lead.id }, "sent");
        
        return `✓ Reply sent to ${lead.name} via ManyChat!\n\nMessage: ${reply.final_text.slice(0, 200)}...`;
        
      } catch (error) {
        await trackAction("/sendreply", { identifier }, `error: ${error.message}`);
        return `Error sending reply: ${error.message}`;
      }
    }
    
    // /help - Show available commands
    if (cmd === "/help") {
      return `📋 Available Commands:\n\n` +
        `/get [phone|name] - Find leads or pending replies\n` +
        `/get all - Show all pending replies\n` +
        `/draft [phone] [text] - Create/update reply draft\n` +
        `/sendreply [phone] - Send pending reply to client\n` +
        `/help - Show this help message\n\n` +
        `All actions are tracked for learning. 🧠`;
    }
    
    return `Unknown command: ${cmd}\nUse /help for available commands.`;
  },
};
