/**
 * Supermemory v3 Integration Skill
 * All persistent data lives in Supermemory with container tags
 */

const SUPERMEMORY_BASE_URL = 'https://api.supermemory.ai/v3';

class SupermemorySkill {
  constructor() {
    this.apiKey = process.env.SUPERMEMORY_API_KEY;
    this.slug = process.env.AGENT_SLUG || 'prismaalalegal';
  }

  /**
   * Store a conversation turn
   */
  async storeConversation(contactName, message, channel, metadata = {}) {
    const url = `${SUPERMEMORY_BASE_URL}/add`;
    
    const body = {
      content: `[${channel}] ${contactName}: ${message}`,
      containerTags: [`client:${this.slug}:conversations`],
      metadata: {
        type: 'conversation',
        contact_name: contactName,
        channel,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };

    return this.request(url, 'POST', body);
  }

  /**
   * Store or update a contact
   */
  async storeContact(contact) {
    const url = `${SUPERMEMORY_BASE_URL}/add`;
    
    const contactId = contact.phone || contact.email || contact.name;
    
    const body = {
      content: JSON.stringify(contact),
      containerTags: [`client:${this.slug}:contacts`],
      customId: `contact:${contactId}`,
      metadata: {
        type: 'contact',
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        status: contact.status,
        last_seen: contact.last_seen,
      },
    };

    return this.request(url, 'POST', body);
  }

  /**
   * Search memory
   */
  async searchMemory(query, containerSuffix = 'conversations', filters = {}) {
    const url = `${SUPERMEMORY_BASE_URL}/search`;
    
    const body = {
      query,
      containerTags: [`client:${this.slug}:${containerSuffix}`],
      filters,
      limit: 5,
    };

    return this.request(url, 'POST', body);
  }

  /**
   * Get contact history
   */
  async getContactHistory(contactIdentifier) {
    const url = `${SUPERMEMORY_BASE_URL}/search`;
    
    const body = {
      query: contactIdentifier,
      containerTags: [`client:${this.slug}:conversations`],
      limit: 20,
    };

    const results = await this.request(url, 'POST', body);
    
    // Sort by timestamp
    return results.sort((a, b) => {
      return new Date(a.metadata.timestamp) - new Date(b.metadata.timestamp);
    });
  }

  /**
   * Store a template
   */
  async storeTemplate(templateName, templateContent, triggers = []) {
    const url = `${SUPERMEMORY_BASE_URL}/add`;
    
    const body = {
      content: templateContent,
      containerTags: [`client:${this.slug}:templates`],
      customId: `template:${templateName}`,
      metadata: {
        type: 'template',
        name: templateName,
        triggers,
        active: true,
        created_at: new Date().toISOString(),
      },
    };

    return this.request(url, 'POST', body);
  }

  /**
   * Find matching template
   */
  async findMatchingTemplate(incomingMessage) {
    const results = await this.searchMemory(incomingMessage, 'templates', { active: true });
    
    if (!results || results.length === 0) {
      return null;
    }

    // Return best match if confidence > 0.7
    const bestMatch = results[0];
    if (bestMatch.score > 0.7) {
      return bestMatch.content;
    }

    return null;
  }

  /**
   * Get document by customId
   */
  async getDocument(customId) {
    const url = `${SUPERMEMORY_BASE_URL}/get/${customId}`;
    return this.request(url, 'GET');
  }

  /**
   * Store learning
   */
  async storeLearning(note) {
    const url = `${SUPERMEMORY_BASE_URL}/add`;
    
    const body = {
      content: note,
      containerTags: [`agent:${this.slug}:learnings`],
      metadata: {
        type: 'learning',
        timestamp: new Date().toISOString(),
      },
    };

    return this.request(url, 'POST', body);
  }

  /**
   * Make API request with retry logic
   */
  async request(url, method, body = null, retries = 3) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const options = {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`Supermemory API error: ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        console.error(`Supermemory request failed (attempt ${attempt}):`, err.message);
        
        if (attempt === retries) {
          throw err;
        }

        // Exponential backoff
        await delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }
}

// Export singleton
module.exports = new SupermemorySkill();
