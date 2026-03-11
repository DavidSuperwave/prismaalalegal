/**
 * Inbox Reply API
 * Routes replies from web app inbox back to ManyChat
 * Uses ManyChat API: POST /fb/sending/sendContent
 */

import { getDb } from '@/lib/db';

const MANYCHAT_API_BASE = 'https://api.manychat.com';
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;

export async function POST(request: Request) {
  try {
    const { subscriber_id, message, conversation_id } = await request.json();

    if (!subscriber_id || !message) {
      return Response.json(
        { error: 'Missing subscriber_id or message' },
        { status: 400 }
      );
    }

    // Send reply via ManyChat API
    const manychatResponse = await fetch(`${MANYCHAT_API_BASE}/fb/sending/sendContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriber_id,
        data: {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: message,
              }
            ]
          }
        }
      }),
    });

    if (!manychatResponse.ok) {
      const errorData = await manychatResponse.json();
      console.error('ManyChat API error:', errorData);
      return Response.json(
        { error: 'Failed to send message via ManyChat', details: errorData },
        { status: 500 }
      );
    }

    const result = await manychatResponse.json();

    // Store reply in local database for thread continuity
    const db = getDb();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, content, sender_type, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, 'agent', datetime('now'))
    `).run(
      conversation_id,
      message
    );

    // Update conversation last_message_at
    db.prepare(`
      UPDATE conversations 
      SET last_message_at = datetime('now'), status = 'active'
      WHERE id = ?
    `).run(conversation_id);

    return Response.json({
      success: true,
      manychat_response: result,
      message: 'Reply sent successfully'
    });

  } catch (error) {
    console.error('Inbox reply error:', error);
    return Response.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
