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
function normalizeCommand(command) {
  return command.replace(/^@\S+\s*/, '').trim();
}

module.exports = async function execute({ command = '' } = {}) {
  try {
    // Handle group mentions: "@bot /get all" -> "/get all"
    const normalizedCmd = normalizeCommand(command);
    
    // Parse the command
    const parts = normalizedCmd.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    
    // Handle /get all or just /get
    let filter = null;
    if (cmd === '/get' && parts[1]) {
      filter = parts.slice(1).join(' ').trim();
    }
    
    // Get conversations
    const convData = await getJson(`${BASE_URL}/api/inbox/conversations`);
    const conversations = convData.conversations || [];
    
    if (!conversations.length) {
      return '📭 No hay conversaciones pendientes.';
    }

    // Format output
    const lines = conversations.slice(0, 10).map((c, i) => {
      const unread = c.unreadCount > 0 ? `🔴 ${c.unreadCount} nuevo(s)` : '✓';
      const phone = c.contactPhone ? `📱 ${c.contactPhone}` : '';
      const msg = c.lastMessage ? c.lastMessage.slice(0, 60) + '...' : '';
      return `${i+1}. *${c.contactName}* ${phone}\n   ${unread} | ${msg}`;
    });

    return `📋 *${conversations.length} conversaciones:*\n\n` + lines.join('\n\n');
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
};
