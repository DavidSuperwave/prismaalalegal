/**
 * Telegram Command Handler Skill
 * Processes commands from Telegram group chats
 * Commands: /reply, /status, /update, /note, /help
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MANYCHAT_API_BASE = 'https://api.manychat.com/v2';

class TelegramCommands {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.manychatKey = process.env.MANYCHAT_API_KEY;
    this.baseUrl = `${TELEGRAM_API_BASE}${this.token}`;
    this.allowedGroups = [
      process.env.TELEGRAM_REPLIES_CHAT_ID,
      process.env.TELEGRAM_LEADS_CHAT_ID
    ];
  }

  /**
   * Process incoming Telegram message
   */
  async processMessage(message) {
    const { text, chat, from, message_id } = message;
    
    // Only process commands in allowed groups
    if (!this.allowedGroups.includes(String(chat.id))) {
      return null;
    }

    // Check if it's a command
    if (!text || !text.startsWith('/')) {
      return null;
    }

    const [command, ...args] = text.split(' ');
    const commandClean = command.toLowerCase();

    switch (commandClean) {
      case '/reply':
      case '/responder':
        return this.handleReply(chat.id, from, args, message_id);
      
      case '/status':
      case '/estado':
        return this.handleStatus(chat.id, args);
      
      case '/update':
      case '/actualizar':
        return this.handleUpdate(chat.id, from, args);
      
      case '/note':
      case '/nota':
        return this.handleNote(chat.id, from, args);
      
      case '/help':
      case '/ayuda':
        return this.handleHelp(chat.id);
      
      case '/agent':
      case '/agente':
        return this.handleAgentQuery(chat.id, from, args);
      
      default:
        return this.sendMessage(chat.id, `❓ Comando no reconocido. Usa /help para ver opciones.`);
    }
  }

  /**
   * /reply [subscriber_id] [message]
   * Send reply back to lead through ManyChat
   */
  async handleReply(chatId, from, args, replyToMessageId) {
    if (args.length < 2) {
      return this.sendMessage(chatId, 
        `⚠️ Uso: /reply [ID_DEL_LEAD] [MENSAJE]\n` +
        `Ejemplo: /reply 123456 "Hola, vi tu caso del accidente..."`
      );
    }

    const subscriberId = args[0];
    const messageText = args.slice(1).join(' ').replace(/^"|"$/g, '');

    try {
      // Send message through ManyChat API
      const response = await fetch(`${MANYCHAT_API_BASE}/fb/sending/sendMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.manychatKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          message: {
            type: 'text',
            text: messageText,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`ManyChat API error: ${response.status}`);
      }

      // Confirm in Telegram
      await this.sendMessage(chatId, 
        `✅ **Mensaje enviado al lead ${subscriberId}**\n\n` +
        `💬 "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"\n\n` +
        `👤 Enviado por: ${from.first_name}`,
        'Markdown'
      );

      // Store in Supermemory for context
      await this.storeReplyInMemory(subscriberId, messageText, from.first_name);

      return { success: true };
    } catch (err) {
      console.error('Reply error:', err);
      return this.sendMessage(chatId, 
        `❌ Error enviando mensaje: ${err.message}\n` +
        `Verifica que el ID del lead sea correcto.`
      );
    }
  }

  /**
   * /status [lead_id]
   * Get lead status from CRM
   */
  async handleStatus(chatId, args) {
    if (args.length < 1) {
      return this.sendMessage(chatId, 
        `⚠️ Uso: /status [ID_DEL_LEAD]\n` +
        `Ejemplo: /status abc123`
      );
    }

    const leadId = args[0];

    try {
      // Query local SQLite CRM
      const db = require('./db').getDb();
      const lead = db.prepare('SELECT * FROM leads WHERE id = ? OR manychat_subscriber_id = ?').get(leadId, leadId);

      if (!lead) {
        return this.sendMessage(chatId, `❌ Lead no encontrado: ${leadId}`);
      }

      const statusEmoji = {
        'new': '🆕',
        'urgent': '🚨',
        'qualified': '✅',
        'in_review': '👀',
        'converted': '💰',
        'inactive': '⏸️'
      };

      const message = 
        `📋 **ESTADO DEL LEAD**\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 **Nombre:** ${lead.name}\n` +
        `📱 **Teléfono:** ${lead.phone || 'N/A'}\n` +
        `${statusEmoji[lead.status] || '🔹'} **Estado:** ${lead.status}\n` +
        `📊 **Case Type:** ${lead.case_type || 'N/A'}\n` +
        `🏷️ **Tags:** ${lead.tags || '[]'}\n` +
        `📝 **Notas:** ${lead.notes ? lead.notes.substring(0, 100) + '...' : 'N/A'}\n` +
        `📅 **Creado:** ${lead.created_at}\n` +
        `🔄 **Actualizado:** ${lead.updated_at}`;

      return this.sendMessage(chatId, message, 'Markdown');
    } catch (err) {
      console.error('Status error:', err);
      return this.sendMessage(chatId, `❌ Error obteniendo estado: ${err.message}`);
    }
  }

  /**
   * /update [lead_id] [field] [value]
   * Update lead field
   */
  async handleUpdate(chatId, from, args) {
    if (args.length < 3) {
      return this.sendMessage(chatId, 
        `⚠️ Uso: /update [ID_DEL_LEAD] [CAMPO] [VALOR]\n` +
        `Campos: status, case_type, notes, phone, assigned_to\n` +
        `Ejemplo: /update abc123 status qualified`
      );
    }

    const [leadId, field, ...valueParts] = args;
    const value = valueParts.join(' ');

    const allowedFields = ['status', 'case_type', 'notes', 'phone', 'assigned_to'];
    if (!allowedFields.includes(field)) {
      return this.sendMessage(chatId, 
        `❌ Campo no válido. Permitidos: ${allowedFields.join(', ')}`
      );
    }

    try {
      const db = require('./db').getDb();
      db.prepare(`UPDATE leads SET ${field} = ?, updated_at = datetime('now') WHERE id = ? OR manychat_subscriber_id = ?`)
        .run(value, leadId, leadId);

      return this.sendMessage(chatId, 
        `✅ **Lead actualizado**\n` +
        `👤 ID: ${leadId}\n` +
        `📝 ${field}: ${value}\n` +
        `👤 Por: ${from.first_name}`
      );
    } catch (err) {
      console.error('Update error:', err);
      return this.sendMessage(chatId, `❌ Error actualizando: ${err.message}`);
    }
  }

  /**
   * /note [lead_id] [note_text]
   * Add note to lead
   */
  async handleNote(chatId, from, args) {
    if (args.length < 2) {
      return this.sendMessage(chatId, 
        `⚠️ Uso: /note [ID_DEL_LEAD] [NOTA]\n` +
        `Ejemplo: /note abc123 "Cliente prefiere llamada después de 6pm"`
      );
    }

    const leadId = args[0];
    const noteText = args.slice(1).join(' ').replace(/^"|"$/g, '');

    try {
      const db = require('./db').getDb();
      const lead = db.prepare('SELECT notes FROM leads WHERE id = ? OR manychat_subscriber_id = ?').get(leadId, leadId);

      if (!lead) {
        return this.sendMessage(chatId, `❌ Lead no encontrado: ${leadId}`);
      }

      const existingNotes = lead.notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `${existingNotes}\n[${timestamp}] ${from.first_name}: ${noteText}`;

      db.prepare('UPDATE leads SET notes = ?, updated_at = datetime("now") WHERE id = ? OR manychat_subscriber_id = ?')
        .run(newNote.trim(), leadId, leadId);

      return this.sendMessage(chatId, 
        `📝 **Nota agregada**\n` +
        `👤 Lead: ${leadId}\n` +
        `💬 ${noteText}\n` +
        `👤 Por: ${from.first_name}`
      );
    } catch (err) {
      console.error('Note error:', err);
      return this.sendMessage(chatId, `❌ Error agregando nota: ${err.message}`);
    }
  }

  /**
   * /agent [query]
   * Query the AI agent for info
   */
  async handleAgentQuery(chatId, from, args) {
    if (args.length < 1) {
      return this.sendMessage(chatId, 
        `⚠️ Uso: /agent [PREGUNTA]\n` +
        `Ejemplos:\n` +
        `- /agent Cuál es el promedio de indemnización por fallecimiento?\n` +
        `- /agent Cuántos leads urgentes tenemos?\n` +
        `- /agent Resume el caso de Estrella luna`
      );
    }

    const query = args.join(' ');

    // Send "thinking" message
    const thinkingMsg = await this.sendMessage(chatId, 
      `🤔 *${from.first_name}* pregunta:\n` +
      `"${query}"\n\n` +
      `⏳ Consultando...`,
      'Markdown'
    );

    try {
      // Forward to OpenClaw for AI response
      const response = await fetch(`${process.env.OPENCLAW_GATEWAY_URL}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: `[TELEGRAM_ADMIN] ${from.first_name}: ${query}`,
          channel: 'telegram_admin',
          metadata: {
            chat_id: chatId,
            user_name: from.first_name,
            query_type: 'admin_query'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('OpenClaw error');
      }

      const aiResponse = await response.json();
      const answer = aiResponse.content || aiResponse.message || 'Lo siento, no pude procesar tu consulta.';

      // Delete thinking message and send response
      await this.deleteMessage(chatId, thinkingMsg.result.message_id);
      
      return this.sendMessage(chatId, 
        `🤖 **Respuesta del Agente**\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *${from.first_name}* preguntó:\n` +
        `"${query}"\n\n` +
        `💬 ${answer}`,
        'Markdown'
      );
    } catch (err) {
      console.error('Agent query error:', err);
      return this.editMessage(chatId, thinkingMsg.result.message_id,
        `❌ Error consultando al agente. Intenta de nuevo.`
      );
    }
  }

  /**
   * /help
   * Show available commands
   */
  async handleHelp(chatId) {
    const helpText = 
      `🤖 **COMANDOS DISPONIBLES**\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📨 **Responder a Leads**\n` +
      `/reply [ID] [mensaje] - Enviar mensaje al lead\n` +
      `Ej: /reply 123456 "Hola, vi tu caso..."\n\n` +
      `📋 **Gestionar Leads**\n` +
      `/status [ID] - Ver estado del lead\n` +
      `/update [ID] [campo] [valor] - Actualizar campo\n` +
      `/note [ID] [nota] - Agregar nota\n\n` +
      `🤖 **Hablar con el Agente**\n` +
      `/agent [pregunta] - Consultar información\n` +
      `Ej: /agent Cuántos leads urgentes tenemos?\n\n` +
      `❓ **Ayuda**\n` +
      `/help - Mostrar este mensaje`;

    return this.sendMessage(chatId, helpText, 'Markdown');
  }

  /**
   * Send message to Telegram
   */
  async sendMessage(chatId, text, parseMode = null) {
    const url = `${this.baseUrl}/sendMessage`;
    const body = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * Edit message in Telegram
   */
  async editMessage(chatId, messageId, text) {
    const url = `${this.baseUrl}/editMessageText`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
      }),
    });

    return response.json();
  }

  /**
   * Delete message in Telegram
   */
  async deleteMessage(chatId, messageId) {
    const url = `${this.baseUrl}/deleteMessage`;
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
  }

  /**
   * Store reply in Supermemory for context
   */
  async storeReplyInMemory(subscriberId, message, senderName) {
    try {
      await fetch('https://api.supermemory.ai/v3/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `[ADMIN REPLY from ${senderName}]: ${message}`,
          containerTags: [`client:prismaalalegal:conversations`],
          metadata: {
            type: 'admin_reply',
            subscriber_id: subscriberId,
            sender: senderName,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (err) {
      console.error('Supermemory store error:', err);
    }
  }
}

// Export singleton
module.exports = new TelegramCommands();
