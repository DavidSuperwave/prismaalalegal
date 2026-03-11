/**
 * CRM Skill — Contact Management via Supermemory
 * All data lives in client:{slug}:contacts container
 */

const supermemory = require('./supermemory');

class CRMSkill {
  constructor() {
    this.slug = process.env.AGENT_SLUG || 'prismaalalegal';
  }

  /**
   * Create or update a contact
   */
  async upsertContact({ name, phone, email, channel, tags = [], notes = [] }) {
    const contactId = phone || email || name;
    
    // Check if contact exists
    let existing = null;
    try {
      existing = await supermemory.getDocument(`contact:${contactId}`);
    } catch (err) {
      // Contact doesn't exist, will create new
    }

    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      const updated = {
        ...existing,
        name: name || existing.name,
        phone: phone || existing.phone,
        email: email || existing.email,
        last_seen: now,
        conversation_count: (existing.conversation_count || 0) + 1,
        tags: [...new Set([...existing.tags, ...tags, `source:${channel}`])],
        notes: [...existing.notes, ...notes.map(n => ({ text: n, timestamp: now }))],
      };
      return supermemory.storeContact(updated);
    } else {
      // Create new
      const contact = {
        name,
        phone,
        email,
        channel,
        status: 'new',
        tags: [...tags, `source:${channel}`],
        notes: notes.map(n => ({ text: n, timestamp: now })),
        first_seen: now,
        last_seen: now,
        conversation_count: 1,
        qualified_at: null,
        qualified_reason: null,
      };
      return supermemory.storeContact(contact);
    }
  }

  /**
   * Qualify a contact
   */
  async qualifyContact(contactId, reason) {
    const now = new Date().toISOString();
    
    try {
      const contact = await supermemory.getDocument(`contact:${contactId}`);
      
      contact.status = 'qualified';
      contact.qualified_at = now;
      contact.qualified_reason = reason;
      contact.tags = [...new Set([...contact.tags, 'qualified'])];
      contact.notes.push({ text: `Qualified: ${reason}`, timestamp: now });

      // Store in qualified namespace too
      await supermemory.request(
        'https://api.supermemory.ai/v3/add',
        'POST',
        {
          content: JSON.stringify(contact),
          containerTags: [`client:${this.slug}:qualified`],
          customId: `qualified:${contactId}`,
          metadata: { type: 'qualified', reason, timestamp: now },
        }
      );

      return supermemory.storeContact(contact);
    } catch (err) {
      console.error('Failed to qualify contact:', err.message);
      throw err;
    }
  }

  /**
   * List contacts with filters
   */
  async listContacts({ status, tag, channel, limit = 20 } = {}) {
    const filters = {};
    if (status) filters.status = status;
    if (tag) filters.tags = tag;
    if (channel) filters.channel = channel;

    const results = await supermemory.searchMemory('*', 'contacts', filters);
    return results.slice(0, limit);
  }

  /**
   * Get single contact
   */
  async getContact(identifier) {
    const contactId = identifier;
    
    try {
      const contact = await supermemory.getDocument(`contact:${contactId}`);
      const history = await supermemory.getContactHistory(identifier);
      
      return {
        ...contact,
        conversation_history: history,
      };
    } catch (err) {
      console.error('Failed to get contact:', err.message);
      return null;
    }
  }

  /**
   * Add note to contact
   */
  async addNote(contactId, note) {
    const contact = await supermemory.getDocument(`contact:${contactId}`);
    
    contact.notes.push({
      text: note,
      timestamp: new Date().toISOString(),
    });

    return supermemory.storeContact(contact);
  }

  /**
   * Update contact status
   */
  async updateStatus(contactId, newStatus) {
    const validStatuses = ['new', 'active', 'qualified', 'converted', 'inactive'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const contact = await supermemory.getDocument(`contact:${contactId}`);
    const oldStatus = contact.status;
    
    contact.status = newStatus;
    contact.notes.push({
      text: `Status changed: ${oldStatus} → ${newStatus}`,
      timestamp: new Date().toISOString(),
    });

    return supermemory.storeContact(contact);
  }
}

// Export singleton
module.exports = new CRMSkill();
