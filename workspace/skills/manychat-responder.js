/**
 * ManyChat Responder Skill
 * Generates responses for ManyChat webhook
 */

const supermemory = require('./supermemory');

class ManyChatResponder {
  constructor() {
    this.slug = process.env.AGENT_SLUG || 'prismaalalegal';
  }

  /**
   * Generate response for incoming ManyChat message
   */
  async generateResponse(subscriber, message) {
    this.slug = process.env.AGENT_SLUG || 'alalegal';

    // Get conversation history
    const history = await supermemory.getContactHistory(subscriber.phone || subscriber.email || subscriber.name);
    
    // Check for matching template
    const template = await supermemory.findMatchingTemplate(message.text);
    if (template) {
      return this.formatResponse(template);
    }

    // Default response logic
    const isFirstMessage = history.length === 0;
    
    if (isFirstMessage) {
      return this.formatResponse(
        `Hola ${subscriber.name || "ahí"}! Soy el asistente de admisión de ALA Legal. ` +
        `Puedo ayudarte con dudas sobre nuestros servicios y para agendar una consulta. ` +
        `¿Qué te trae por aquí hoy?`
      );
    }

    // Let the agent handle it (return null to trigger agent processing)
    return null;
  }

  /**
   * Format response for ManyChat
   */
  formatResponse(text) {
    return {
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: text,
          },
        ],
      },
    };
  }

  /**
   * Check if message qualifies as lead
   */
  isQualifiedLead(message, sentiment) {
    const qualifiers = [
      'consulta',
      'cita',
      'agendar',
      'agenda',
      'interesado',
      'interesada',
      'ayuda',
      'urgente',
      'accidente',
      'lesión',
      'lesion',
      'fallecimiento',
      'divorcio',
      'custodia',
      'detenido',
      'arrestado',
      'inmigración',
      'inmigracion',
      'demanda',
      'consultation',
      'appointment',
      'schedule',
      'interested',
      'need help',
      'urgent',
      'accident',
      'injury',
      'divorce',
      'custody',
      'arrested',
      'visa',
      'immigration',
      'lawsuit',
    ];

    const text = message.toLowerCase();
    
    return qualifiers.some(q => text.includes(q)) || sentiment === 'urgent';
  }
}

// Export singleton
module.exports = new ManyChatResponder();
