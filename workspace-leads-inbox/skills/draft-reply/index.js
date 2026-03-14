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

module.exports = async function execute({ identifier, text }) {
  if (!identifier || !text) {
    return '❌ Uso: /draft [telefono o nombre] [mensaje]';
  }

  try {
    // Find lead by searching conversations
    const convData = await getJson(`${BASE_URL}/api/inbox/conversations`);
    const conversations = convData.conversations || [];
    
    const conversation = conversations.find(c => 
      (c.contactPhone && c.contactPhone.includes(identifier)) ||
      (c.contactName && c.contactName.toLowerCase().includes(identifier.toLowerCase()))
    );

    if (!conversation) {
      return `❌ No encontré conversación con: ${identifier}`;
    }

    // Create draft reply
    const result = await getJson(`${BASE_URL}/api/inbox/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversation.id,
        final_text: text,
        agent_draft: text,
        status: 'pending',
      }),
    });

    return `✅ Borrador guardado para *${conversation.contactName}*\n\n📝 Texto:\n${text.slice(0, 200)}${text.length > 200 ? '...' : ''}\n\n👉 Enviar con: /sendreply ${identifier}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
};
