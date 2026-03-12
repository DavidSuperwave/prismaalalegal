#!/usr/bin/env node
/**
 * Import ManyChat conversations from markdown export files
 * Usage: node scripts/import-manychat-conversations.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || './web/data/app.db';
const WORKSPACE_DIR = './workspace';

// Parse markdown export file
function parseExportFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const conversations = [];
  
  // Split by conversation headers
  const conversationBlocks = content.split(/## Conversation \d+:/);
  
  for (const block of conversationBlocks.slice(1)) {
    const conversation = {
      subscriberId: null,
      name: null,
      phone: null,
      email: null,
      location: null,
      channel: 'facebook',
      messages: [],
      priority: 'normal',
      notes: ''
    };
    
    // Extract name from first line
    const nameMatch = block.match(/^\s*([^\n]+)/);
    if (nameMatch) conversation.name = nameMatch[1].trim();
    
    // Extract subscriber ID
    const subscriberMatch = block.match(/\*\*Subscriber ID:\*\*\s*(\d+)/);
    if (subscriberMatch) conversation.subscriberId = subscriberMatch[1];
    
    // Extract phone
    const phoneMatch = block.match(/\*\*Phone:\*\*\s*([^\n]+)/);
    if (phoneMatch) conversation.phone = phoneMatch[1].trim();
    
    // Extract location
    const locationMatch = block.match(/\*\*Location:\*\*\s*([^\n]+)/);
    if (locationMatch) conversation.location = locationMatch[1].trim();
    
    // Check for Instagram
    if (block.includes('Instagram:') || block.includes('**Channel:** Instagram')) {
      conversation.channel = 'instagram';
    }
    
    // Check priority
    if (block.includes('⭐ QUALIFIED LEAD') || block.includes('🔥 HIGH') || block.includes('🔥 URGENT')) {
      conversation.priority = 'high';
    }
    
    // Extract messages
    const messageMatches = block.matchAll(/(\d+)\.\s*\*\*([^*]+)\*\*\s*\(?(User|Agent|Bot)\)?:?\s*\n?\s*"([^"]+)"/g);
    for (const match of messageMatches) {
      conversation.messages.push({
        sender: match[3]?.toLowerCase() === 'user' ? 'contact' : 
                match[3]?.toLowerCase() === 'agent' ? 'agent' : 'agent',
        content: match[4].trim(),
        timestamp: new Date().toISOString() // Will use import time as fallback
      });
    }
    
    // Extract notes
    const notesMatch = block.match(/\*\*Notes:\*\*\s*([^]+?)(?=---|$)/);
    if (notesMatch) conversation.notes = notesMatch[1].trim();
    
    if (conversation.subscriberId && conversation.name) {
      conversations.push(conversation);
    }
  }
  
  return conversations;
}

// Import conversations to database
function importConversations(conversations) {
  const db = new Database(DB_PATH);
  const now = new Date().toISOString();
  
  let imported = 0;
  let skipped = 0;
  
  for (const conv of conversations) {
    // Check if already exists
    const existing = db.prepare('SELECT id FROM conversations WHERE manychat_subscriber_id = ?').get(conv.subscriberId);
    if (existing) {
      console.log(`Skipping ${conv.name} - already imported`);
      skipped++;
      continue;
    }
    
    // Insert lead
    const leadResult = db.prepare(`
      INSERT INTO leads (name, phone, source, status, manychat_subscriber_id, notes, created_at, updated_at)
      VALUES (?, ?, ?, 'new', ?, ?, ?, ?)
    `).run(
      conv.name,
      conv.phone,
      conv.channel,
      conv.subscriberId,
      conv.notes,
      now,
      now
    );
    
    const leadId = leadResult.lastInsertRowid;
    
    // Get last message for conversation summary
    const lastMessage = conv.messages.length > 0 
      ? conv.messages[conv.messages.length - 1].content 
      : 'No messages';
    
    // Insert conversation
    const convResult = db.prepare(`
      INSERT INTO conversations 
      (contact_name, contact_phone, source, last_message, last_message_at, unread_count, status, manychat_subscriber_id, lead_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      conv.name,
      conv.phone,
      conv.channel,
      lastMessage,
      now,
      conv.messages.filter(m => m.sender === 'contact').length,
      conv.subscriberId,
      leadId,
      now
    );
    
    const conversationId = convResult.lastInsertRowid;
    
    // Insert messages
    const insertMessage = db.prepare(`
      INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const msg of conv.messages) {
      insertMessage.run(
        conversationId,
        msg.sender,
        msg.content,
        conv.channel,
        now, // Using import time for all messages (timestamps not parsed from export)
        JSON.stringify({ imported: true, original_timestamp: 'unknown' })
      );
    }
    
    console.log(`Imported: ${conv.name} (${conv.messages.length} messages)`);
    imported++;
  }
  
  db.close();
  
  console.log(`\nImport complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${imported + skipped}`);
}

// Main
function main() {
  console.log('Importing ManyChat conversations...\n');
  
  const exportFiles = [
    path.join(WORKSPACE_DIR, 'MANYCHAT_EXPORT.md'),
    path.join(WORKSPACE_DIR, 'MANYCHAT_EXPORT_BATCH2.md'),
    path.join(WORKSPACE_DIR, 'MANYCHAT_EXPORT_BATCH3.md')
  ].filter(f => fs.existsSync(f));
  
  if (exportFiles.length === 0) {
    console.error('No export files found in', WORKSPACE_DIR);
    process.exit(1);
  }
  
  console.log('Found export files:', exportFiles.map(f => path.basename(f)).join(', '));
  
  let allConversations = [];
  for (const file of exportFiles) {
    console.log(`\nParsing ${path.basename(file)}...`);
    const conversations = parseExportFile(file);
    console.log(`  Found ${conversations.length} conversations`);
    allConversations = allConversations.concat(conversations);
  }
  
  console.log(`\nTotal conversations to import: ${allConversations.length}`);
  console.log('Starting import...\n');
  
  importConversations(allConversations);
}

main();
