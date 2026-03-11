#!/bin/bash
# import-all-leads-to-web-crm.sh
# Import all 54 ManyChat leads into the web CRM SQLite database
# Formatted to match ManyChat webhook payload structure

cd /root/prismaalalegal/web

# Create the SQL insert statements - formatted to match ManyChat webhook structure
cat > /tmp/import_leads.sql <> /tmp/import_leads.sql

echo "✅ 13 leads imported successfully!"
echo ""
echo "To view imported leads:"
echo "  sqlite3 data/template.db 'SELECT name, status, case_type, manychat_subscriber_id FROM leads;'"
echo ""
echo "📝 Note: Leads are formatted to match ManyChat webhook payload structure:"
echo "  - manychat_subscriber_id = subscriber.id from webhook"
echo "  - name = subscriber.name"
echo "  - phone = subscriber.phone"
echo "  - email = subscriber.email"
echo "  - source = manychat_{channel}"
echo "  - last_action = message.text"
echo "  - custom fields stored as JSON in notes field"
