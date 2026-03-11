-- Import leads formatted to match ManyChat webhook structure
-- Run: sqlite3 data/template.db < import-all-leads-to-web-crm.sql

-- Clear existing leads (optional - remove if you want to keep existing)
DELETE FROM leads;
DELETE FROM conversations;
DELETE FROM messages;

-- Lead 1: Vanguardia Zuly (subscriber_id: 26395695743355724)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Vanguardia Zuly', NULL, NULL, 'manychat_facebook', 'in_review', 'insurer_denial', 'Agent recommended CONDUSEF', '{"qualitas_case":"true","incident_date":"2015-10","has_evidence":"whatsapp_screenshots"}', '["qualitas","condusef","2015"]', '26395695743355724', datetime('now'), datetime('now'));

-- Lead 2: Victor Esquivel (subscriber_id: 26024487400512699)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Victor Esquivel', NULL, '6643708644', 'manychat_facebook', 'qualified', 'insurer_denial', 'Follow-up scheduled', '{"location":"Tijuana","policy_type":"sin_docs"}', '["tijuana","callback"]', '26024487400512699', datetime('now'), datetime('now'));

-- Lead 3: Jorge Luis Gongora Sequera (subscriber_id: 26093576043614856)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Jorge Luis Gongora Sequera', NULL, NULL, 'manychat_facebook', 'out_of_scope', 'commercial_property', 'DECLINED', '{"location":"Álamo Veracruz","out_of_scope_reason":"comercial"}', '["declined","out_of_scope"]', '26093576043614856', datetime('now'), datetime('now'));

-- Lead 4: Elia Soriano Jn (subscriber_id: 34160822006897450)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Elia Soriano Jn', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Greeting only', '{"follow_up_needed":"true"}', '["greeting_only"]', '34160822006897450', datetime('now'), datetime('now'));

-- Lead 5: Packo Donatary (subscriber_id: 26755949787345504)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Packo Donatary', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Angry message', '{"sentiment":"negative"}', '["angry"]', '26755949787345504', datetime('now'), datetime('now'));

-- Lead 6: Estrella luna URGENT (subscriber_id: 965948082)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Estrella luna', NULL, NULL, 'manychat_instagram', 'urgent', 'vehicle_accident_death', 'NO RESPONSE IN 6 DAYS', '{"location":"Mérida-Progreso","instagram":"@estrella_martz1","priority":"CRITICAL"}', '["urgent","merida","hijo","instagram"]', '965948082', datetime('now'), datetime('now'));

-- Lead 7: Cary Daniel Campos (subscriber_id: 26027889133540488)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Cary Daniel Campos', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Asked location', '{}', '["location_question"]', '26027889133540488', datetime('now'), datetime('now'));

-- Lead 8: Arturo Bustos (subscriber_id: 662827525)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Arturo Bustos', NULL, NULL, 'manychat_instagram', 'out_of_scope', 'property_damage', 'DECLINED', '{"instagram":"@arturobustosg"}', '["declined","instagram"]', '662827525', datetime('now'), datetime('now'));

-- Lead 9: Eduardo Ali Carrillo (subscriber_id: 25991442190507720)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Eduardo Ali Carrillo', NULL, NULL, 'manychat_facebook', 'in_review', 'commercial_vehicle', 'Needs clarification', '{"vehicle_type":"tractocamion"}', '["tractocamion"]', '25991442190507720', datetime('now'), datetime('now'));

-- Lead 10: Beatríz Saldaña QUALIFIED (subscriber_id: 26071979929129808)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Beatríz Saldaña', NULL, '8112491200', 'manychat_facebook', 'qualified', 'wrongful_death', 'Documents ready', '{"insurer":"AXXA","documents_complete":"true"}', '["qualified","axxa","fallecimiento"]', '26071979929129808', datetime('now'), datetime('now'));

-- Lead 11: Marcelo M Ortiz QUALIFIED (subscriber_id: 25421817217496411)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Marcelo M Ortiz', NULL, NULL, 'manychat_facebook', 'qualified', 'insurer_denial', 'Needs attorney escalation', '{"insurer":"Chubb","location":"Tijuana","lesiones":"true"}', '["qualified","chubb","lesiones","tijuana"]', '25421817217496411', datetime('now'), datetime('now'));

-- Lead 12: Zacarías Piedras del Río (subscriber_id: 1229910000)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Zacarías Piedras del Río', NULL, NULL, 'manychat_facebook', 'in_review', 'criminal_injury', 'REVIEW for criminal referral', '{"incident_type":"balacera","weapon":"38super"}', '["review","baleado","ciclista","penal"]', '1229910000', datetime('now'), datetime('now'));

-- Lead 13: L-na Charo POTENTIAL (subscriber_id: 652930127)
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'L-na Charo', NULL, NULL, 'manychat_facebook', 'in_review', 'bicycle_accident', 'Evaluate shared liability', '{"location":"Michoacán","payment":"9000_MXN"}', '["potential","bicicleta","michoacan"]', '652930127', datetime('now'), datetime('now'));

-- Verify
SELECT 'Leads imported:' as status, COUNT(*) as total FROM leads;
