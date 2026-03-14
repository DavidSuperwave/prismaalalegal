const BASE_URL = process.env.WEBAPP_INTERNAL_URL || 'http://web:3000';
const TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-service-token': TOKEN,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

// Strip bot mention from group messages
function normalizeCommand(text) {
  return text.replace(/^@\S+\s*/, '').trim();
}

module.exports = async function execute({ identifier, command = '' } = {}) {
  // Handle group mentions in command
  if (command) {
    const normalized = normalizeCommand(command);
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
      identifier = parts[1];
    }
  }

  if (!identifier) {
    return '❌ Uso: /sendreply [telefono o nombre]';
  }

  try {
    // Find conversation
    const convData = await getJson(`${BASE_URL}/api/inbox/conversations`);
    const conversations = convData.conversations || [];
    
    const conversation = conversations.find(c => 
      (c.contactPhone && c.contactPhone.includes(identifier)) ||
      (c.contactName && c.contactName.toLowerCase().includes(identifier.toLowerCase()))
    );

    if (!conversation) {
      return `❌ No encontré conversación con: ${identifier}`;
    }

    // Get pending replies
    const repliesData = await getJson(`${BASE_URL}/api/inbox/replies?status=pending`);
    const replies = repliesData.replies || [];
    
    const reply = replies.find(r => r.conversation_id === conversation.id);
    
    if (!reply) {
      return `❌ No hay borrador pendiente para ${conversation.contactName}. Crea uno con /draft primero.`;
    }

    // Send reply via the reply endpoint
    await getJson(`${BASE_URL}/api/inbox/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conversation.id,
        message: reply.final_text,
      }),
    });

    return `✅ Mensaje enviado a *${conversation.contactName}* vía ManyChat!\n\n📝 Enviado:\n${reply.final_text.slice(0, 200)}${reply.final_text.length > 200 ? '...' : ''}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
};
