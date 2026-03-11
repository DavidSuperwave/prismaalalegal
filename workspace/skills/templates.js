/**
 * Templates Skill
 * Manage reply templates
 */

const supermemory = require('./supermemory');

class TemplatesSkill {
  constructor() {
    this.slug = process.env.AGENT_SLUG || 'prismaalalegal';
  }

  /**
   * Add a new template
   */
  async addTemplate(name, content, triggers = []) {
    return supermemory.storeTemplate(name, content, triggers);
  }

  /**
   * Get template by name
   */
  async getTemplate(name) {
    return supermemory.getDocument(`template:${name}`);
  }

  /**
   * Find template for incoming message
   */
  async findTemplate(messageText) {
    return supermemory.findMatchingTemplate(messageText);
  }

  /**
   * List all templates
   */
  async listTemplates() {
    return supermemory.searchMemory('*', 'templates');
  }

  /**
   * Seed default templates
   */
  async seedDefaults() {
    const defaults = [
      {
        name: 'greeting',
        content: `Hello! I'm the Prisma Legal intake assistant. I can help you with questions about our services or schedule a consultation. What brings you in today?`,
        triggers: ['hello', 'hi', 'hey', 'start', 'help'],
      },
      {
        name: 'personal_injury',
        content: `I'm sorry to hear about your accident. Personal injury cases are time-sensitive. Can you tell me:\n\n1. When did the incident occur?\n2. Were you injured?\n3. Have you spoken to any insurance companies?\n\nThis will help me connect you with the right attorney.`,
        triggers: ['accident', 'injured', 'hurt', 'car crash', 'fall', 'injury'],
      },
      {
        name: 'family_law',
        content: `Family law matters are deeply personal. Whether you're dealing with divorce, custody, or another issue, we're here to help.\n\nCan you share:\n1. What type of family law matter is this?\n2. Are there children involved?\n3. Is there an urgent timeline?`,
        triggers: ['divorce', 'custody', 'family', 'child support', 'marriage'],
      },
      {
        name: 'criminal_defense',
        content: `If you or a loved one is facing criminal charges, time is critical.\n\nImportant: Do NOT discuss case details over unsecured channels.\n\nPlease provide:\n1. What charges are involved?\n2. Has court been scheduled?\n3. Best number for immediate callback?`,
        triggers: ['arrested', 'charged', 'criminal', 'court', 'lawyer', 'jail'],
      },
      {
        name: 'immigration',
        content: `Immigration matters require specialized expertise. We handle visas, green cards, citizenship, and deportation defense.\n\nTo help you best:\n1. What is your current immigration status?\n2. What is your goal (visa, green card, citizenship, etc.)?\n3. Are there any deadlines?`,
        triggers: ['visa', 'green card', 'immigration', 'citizenship', 'deportation', 'asylum'],
      },
      {
        name: 'consultation_booking',
        content: `I'd be happy to schedule a consultation with one of our attorneys.\n\nOur consultations are:\n• 30 minutes\n• Confidential\n• Available Mon-Fri 8am-6pm, Sat 10am-2pm\n\nPlease provide:\n1. Your preferred day/time\n2. Best phone number\n3. Brief description of your matter`,
        triggers: ['consultation', 'appointment', 'schedule', 'meet', 'call'],
      },
      {
        name: 'pricing',
        content: `Pricing varies by practice area:\n\n• Personal Injury: Contingency (no fee unless we win)\n• Family Law: Hourly + retainer\n• Criminal Defense: Flat fee or hourly\n• Immigration: Flat fee per service\n• Business Law: Hourly or retainer\n• Estate Planning: Flat fee packages\n\nFor specific pricing, I can connect you with an attorney for a free consultation.`,
        triggers: ['price', 'cost', 'fee', 'how much', 'expensive', 'afford'],
      },
      {
        name: 'hours_location',
        content: `Prisma Legal is located in California and serves clients statewide.\n\n**Office Hours:**\nMon-Fri: 8:00 AM - 6:00 PM PST\nSat: 10:00 AM - 2:00 PM PST\nSun: Closed\n\n**Contact:**\nPhone: (555) 123-4567\nEmail: intake@prismalegal.com\n\nConsultations available in-person or via video call.`,
        triggers: ['hours', 'location', 'address', 'where', 'when', 'open'],
      },
    ];

    for (const template of defaults) {
      await this.addTemplate(template.name, template.content, template.triggers);
    }

    console.log(`Seeded ${defaults.length} default templates`);
  }
}

// Export singleton
module.exports = new TemplatesSkill();
