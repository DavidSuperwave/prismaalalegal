/**
 * Telegram Webhook Handler
 * Receives updates from Telegram (commands, messages)
 * Endpoint: POST /telegram/webhook
 */

const telegramCommands = require('../workspace/skills/telegram-commands');

// Handle incoming Telegram update
async function handleTelegramUpdate(req, res) {
  const update = req.body;
  
  console.log('Telegram update received:', JSON.stringify(update, null, 2));

  try {
    // Handle different update types
    if (update.message) {
      const { message } = update;
      
      // Check if it's a command
      if (message.text && message.text.startsWith('/')) {
        const result = await telegramCommands.processMessage(message);
        
        if (result) {
          return res.json({ ok: true, processed: true });
        }
      }
      
      // Handle regular messages in group (if needed for conversation)
      if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
        // Check if message mentions the bot or replies to bot messages
        if (message.reply_to_message && message.reply_to_message.from.is_bot) {
          // User is replying to a bot message - could be conversational
          await handleGroupConversation(message);
          return res.json({ ok: true, processed: true });
        }
      }
    }

    // Acknowledge the update
    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Handle conversational messages in group
async function handleGroupConversation(message) {
  const { text, chat, from } = message;
  
  // Simple responses for common questions
  const responses = {
    'hola': `¡Hola ${from.first_name}! 👋 Soy el asistente de ALA Legal. Usa /help para ver comandos disponibles.`,
    'help': 'Usa /help para ver todos los comandos disponibles.',
    'gracias': '¡De nada! 😊 Estoy aquí para ayudar.',
  };

  const lowerText = text.toLowerCase().trim();
  
  if (responses[lowerText]) {
    await telegramCommands.sendMessage(chat.id, responses[lowerText]);
  }
}

module.exports = {
  handleTelegramUpdate,
};
