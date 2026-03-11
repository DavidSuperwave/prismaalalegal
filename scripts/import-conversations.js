/**
 * Import ManyChat conversations to Supermemory
 * Usage: node import-conversations.js
 */

const fs = require('fs');

const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY || 'sm_NneFm4f9iFbTCtM99gt15z_azzNHMoXjBGfrKzaKZiNzUpIZRIyKeIGiuGNEDUhwAbfQBqUiBvEIJyaNodJUuZY';
const AGENT_SLUG = 'prismaalalegal';

// Parse the markdown export file
async function importConversations() {
  const content = fs.readFileSync('./workspace/MANYCHAT_EXPORT.md', 'utf8');
  
  // Split by conversation sections
  const sections = content.split('## Conversation');
  
  console.log(`Found ${sections.length - 1} conversations to import\n`);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    
    // Extract name
    const nameMatch = section.match(/^\s*\d+:\s*(.+)/);
    if (!nameMatch) continue;
    
    const contactName = nameMatch[1].trim();
    const subscriberIdMatch = section.match(/Subscriber ID:\s*(\d+)/);
    const subscriberId = subscriberIdMatch ? subscriberIdMatch[1] : 'unknown';
    
    console.log(`Importing: ${contactName} (${subscriberId})`);
    
    // Store contact
    await storeContact(contactName, subscriberId);
    
    // Extract messages and store conversation
    const messagesMatch = section.match(/### Messages:([\s\S]+?)(?=---|$)/);
    if (messagesMatch) {
      await storeConversation(contactName, messagesMatch[1].trim(), subscriberId);
    }
  }
  
  console.log('\n✅ Import complete!');
}

async function storeContact(name, subscriberId) {
  try {
    const response = await fetch('https://api.supermemory.ai/v3/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: JSON.stringify({
          name,
          subscriber_id: subscriberId,
          channel: 'manychat',
          status: 'new',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        }),
        containerTags: [`client:${AGENT_SLUG}:contacts`],
        customId: `contact:${subscriberId}`,
        metadata: {
          type: 'contact',
          name,
          channel: 'manychat',
        },
      }),
    });
    
    if (!response.ok) {
      console.error(`  ❌ Failed to store contact: ${response.status}`);
    } else {
      console.log(`  ✅ Contact stored`);
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
  }
}

async function storeConversation(contactName, messages, subscriberId) {
  try {
    const response = await fetch('https://api.supermemory.ai/v3/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: messages,
        containerTags: [`client:${AGENT_SLUG}:conversations`],
        metadata: {
          type: 'conversation',
          contact_name: contactName,
          subscriber_id: subscriberId,
          channel: 'manychat',
          timestamp: new Date().toISOString(),
          source: 'manual_export',
        },
      }),
    });
    
    if (!response.ok) {
      console.error(`  ❌ Failed to store conversation: ${response.status}`);
    } else {
      console.log(`  ✅ Conversation stored`);
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
  }
}

importConversations().catch(console.error);
