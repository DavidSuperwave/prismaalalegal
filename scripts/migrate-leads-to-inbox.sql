-- Create conversations for leads that do not have one yet.
INSERT INTO conversations (
  contact_name,
  contact_phone,
  source,
  last_message,
  last_message_at,
  unread_count,
  sentiment,
  lead_id,
  status,
  manychat_subscriber_id,
  created_at
)
SELECT
  l.name,
  l.phone,
  'manychat',
  COALESCE(l.last_action, 'Mensaje importado de ManyChat'),
  COALESCE(l.updated_at, l.created_at, datetime('now')),
  0,
  'neutral',
  l.id,
  'active',
  l.manychat_subscriber_id,
  COALESCE(l.created_at, datetime('now'))
FROM leads l
WHERE l.id NOT IN (
  SELECT COALESCE(lead_id, '')
  FROM conversations
);

-- Seed first message for conversations that have no message rows.
INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
SELECT
  c.id,
  'contact',
  COALESCE(l.last_action, 'Mensaje importado de ManyChat'),
  'manychat',
  COALESCE(c.created_at, datetime('now')),
  json_object(
    'imported', true,
    'subscriber_id', l.manychat_subscriber_id,
    'notes', COALESCE(l.notes, '')
  )
FROM conversations c
JOIN leads l ON l.id = c.lead_id
WHERE c.id NOT IN (
  SELECT DISTINCT conversation_id
  FROM messages
);
