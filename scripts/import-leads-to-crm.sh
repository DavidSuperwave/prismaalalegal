#!/bin/bash
# import-leads-to-crm.sh - Import ManyChat qualified leads to SQLite CRM

cd /root/prismaalalegal/web

# Create SQL commands
sqlite3 data/template.db << 'EOF'
-- Lead 1: Estrella luna (URGENT)
INSERT INTO leads (name, source, status, case_type, notes, tags, created_at, updated_at) 
VALUES (
  'Estrella luna', 
  'manychat_export', 
  'urgent', 
  'vehicle_accident', 
  'Son hit by vehicle on Mérida-Progreso highway near university. Driver claiming victim at fault. NO RESPONSE IN 6 DAYS! Instagram: @estrella_martz1', 
  '["urgent","vehicle","highway","merida","no_response"]',
  datetime('now'),
  datetime('now')
);

-- Lead 2: Beatríz Saldaña (HIGH)
INSERT INTO leads (name, phone, source, status, case_type, notes, tags, created_at, updated_at) 
VALUES (
  'Beatríz Saldaña', 
  '8112491200',
  'manychat_export', 
  'qualified', 
  'wrongful_death', 
  'Wrongful death case with AXXA insurance. Has all documents: policy, marriage/birth/death certificates, income proof. Investigation file needed. CONDUSEF complaint pending.',
  '["qualified","wrongful_death","axxa","insurance","documents_ready"]',
  datetime('now'),
  datetime('now')
);

-- Lead 3: Marcelo M Ortiz (HIGH)
INSERT INTO leads (name, source, status, case_type, notes, tags, created_at, updated_at) 
VALUES (
  'Marcelo M Ortiz', 
  'manychat_export', 
  'qualified', 
  'insurance_denial', 
  'Chubb Insurance denying claim. Accident Dec 24, policy started Dec 22. Injuries: airbag deployed, neck pain, face injuries. Car declared total loss. 30+ days investigating with no response. Tijuana.',
  '["qualified","chubb","insurance_denial","injuries","total_loss","tijuana"]',
  datetime('now'),
  datetime('now')
);

-- Lead 4: Zacarías Piedras (REVIEW)
INSERT INTO leads (name, source, status, case_type, notes, tags, created_at, updated_at) 
VALUES (
  'Zacarías Piedras del Río', 
  'manychat_export', 
  'new', 
  'criminal_injury', 
  'Son shot by cyclist with 38 super revolver at traffic light. Cyclist fled. May need criminal law referral.',
  '["review","shooting","criminal","38super","cyclist"]',
  datetime('now'),
  datetime('now')
);

-- Lead 5: L-na Charo (POTENTIAL)
INSERT INTO leads (name, source, status, case_type, notes, tags, created_at, updated_at) 
VALUES (
  'L-na Charo', 
  'manychat_export', 
  'new', 
  'bicycle_accident', 
  'Daughter had bicycle accident, was blamed and paid 9000 for car damages. From Michoacán. May have been wrongly blamed - needs review.',
  '["potential","bicycle","wrongly_blamed","michoacan","9000"]',
  datetime('now'),
  datetime('now')
);

-- Verify insertion
SELECT id, name, status, case_type, created_at FROM leads ORDER BY created_at DESC LIMIT 5;
EOF

echo "✅ 5 qualified leads imported to CRM"
