/**
 * Telegram Dual-Channel Alert Skill
 * Posts to #replies (all messages) and #qualified-leads (qualified only)
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

class TelegramAlerts {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.repliesChatId = process.env.TELEGRAM_REPLIES_CHAT_ID;
    this.leadsChatId = process.env.TELEGRAM_LEADS_CHAT_ID;
    this.baseUrl = `${TELEGRAM_API_BASE}${this.token}`;
  }

  /**
   * Notify #replies group of any inbound message
   */
  async notifyReply(contactName, message, channel, sentiment = 'neutral') {
    const emoji = this.getSentimentEmoji(sentiment);
    const text = `${emoji} **[${channel.toUpperCase()}]** from *${contactName}*\n\n${message}\n\n_Sentiment: ${sentiment}_`;

    return this.sendMessage(this.repliesChatId, text, 'Markdown');
  }

  /**
   * Notify #qualified-leads group of hot lead
   */
  async notifyQualifiedLead(contactName, phone, reason, shouldCreateInvite = false) {
    let text = `🔥 **QUALIFIED LEAD**\n\n`;
    text += `**Name:** ${contactName}\n`;
    text += `**Phone:** ${phone || 'N/A'}\n`;
    text += `**Reason:** ${reason}`;

    if (shouldCreateInvite) {
      try {
        const inviteLink = await this.createChatInviteLink(this.leadsChatId);
        text += `\n\n📎 **Invite:** ${inviteLink}`;
      } catch (err) {
        console.error('Failed to create invite link:', err.message);
      }
    }

    return this.sendMessage(this.leadsChatId, text, 'Markdown');
  }

  /**
   * Send daily summary to #replies
   */
  async sendDailySummary(stats) {
    const { totalMessages, qualifiedCount, pendingFollowups } = stats;
    
    let text = `📊 **Daily Summary**\n\n`;
    text += `Messages received: ${totalMessages}\n`;
    text += `Qualified leads: ${qualifiedCount}\n`;
    text += `Pending follow-ups: ${pendingFollowups}`;

    return this.sendMessage(this.repliesChatId, text, 'Markdown');
  }

  /**
   * Send message to any chat
   */
  async sendMessage(chatId, text, parseMode = null) {
    const url = `${this.baseUrl}/sendMessage`;
    
    const body = {
      chat_id: chatId,
      text: text,
    };

    if (parseMode) {
      body.parse_mode = parseMode;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Telegram API error: ${error.description}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Telegram sendMessage failed:', err.message);
      throw err;
    }
  }

  /**
   * Create single-use invite link
   */
  async createChatInviteLink(chatId) {
    const url = `${this.baseUrl}/createChatInviteLink`;
    
    const body = {
      chat_id: chatId,
      member_limit: 1,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Telegram API error: ${error.description}`);
      }

      const data = await response.json();
      return data.result.invite_link;
    } catch (err) {
      console.error('Failed to create invite link:', err.message);
      throw err;
    }
  }

  /**
   * Get emoji for sentiment
   */
  getSentimentEmoji(sentiment) {
    const emojis = {
      positive: '😊',
      neutral: '😐',
      negative: '😞',
      urgent: '🚨',
    };
    return emojis[sentiment] || emojis.neutral;
  }
}

// Export singleton
module.exports = new TelegramAlerts();
