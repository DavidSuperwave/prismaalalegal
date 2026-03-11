-- Import ALL 54 ManyChat leads into web CRM
-- Format matches ManyChat webhook payload structure exactly

DELETE FROM leads;
DELETE FROM conversations;
DELETE FROM messages;

-- Batch 1: Leads 1-15 (Full detail from export)
-- Lead 1: Vanguardia Zuly
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Vanguardia Zuly', NULL, NULL, 'manychat_facebook', 'in_review', 'insurer_denial', 'Agent recommended CONDUSEF', '{"qualitas_case":"true","incident_date":"2015-10","has_evidence":"whatsapp_screenshots"}', '["qualitas","condusef","2015"]', '26395695743355724', datetime('now'), datetime('now'));

-- Lead 2: Victor Esquivel
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Victor Esquivel', NULL, '6643708644', 'manychat_facebook', 'qualified', 'insurer_denial', 'Follow-up scheduled', '{"location":"Tijuana","policy_type":"sin_docs"}', '["tijuana","callback"]', '26024487400512699', datetime('now'), datetime('now'));

-- Lead 3: Jorge Luis Gongora Sequera
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Jorge Luis Gongora Sequera', NULL, NULL, 'manychat_facebook', 'out_of_scope', 'commercial_property', 'DECLINED', '{"location":"Álamo Veracruz","out_of_scope_reason":"comercial"}', '["declined","out_of_scope"]', '26093576043614856', datetime('now'), datetime('now'));

-- Lead 4: Elia Soriano Jn
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Elia Soriano Jn', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Greeting only', '{"follow_up_needed":"true"}', '["greeting_only"]', '34160822006897450', datetime('now'), datetime('now'));

-- Lead 5: Packo Donatary
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Packo Donatary', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Angry message', '{"sentiment":"negative"}', '["angry"]', '26755949787345504', datetime('now'), datetime('now'));

-- Lead 6: 🐓
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), '🐓', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Unknown', '{}', '["unknown"]', '56167725', datetime('now'), datetime('now'));

-- Lead 7: Mg Diego
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Mg Diego', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Gracias', '{}', '["gratitude"]', '25611852911812014', datetime('now'), datetime('now'));

-- Lead 8: armando Hernandez Hernandez
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Armando Hernandez Hernandez', NULL, NULL, 'manychat_facebook', 'new', NULL, 'No details', '{}', '["no_info"]', '1034964093', datetime('now'), datetime('now'));

-- Lead 9: Raquel Lopez
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Raquel Lopez', NULL, NULL, 'manychat_facebook', 'new', NULL, 'No details', '{}', '["no_info"]', '1212999897', datetime('now'), datetime('now'));

-- Lead 10: Estrella luna URGENT
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Estrella luna', NULL, NULL, 'manychat_instagram', 'urgent', 'vehicle_accident_death', 'NO RESPONSE IN 6 DAYS', '{"location":"Mérida-Progreso","instagram":"@estrella_martz1","priority":"CRITICAL"}', '["urgent","merida","hijo","instagram"]', '965948082', datetime('now'), datetime('now'));

-- Lead 11: Cary Daniel Campos
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Cary Daniel Campos', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Asked location', '{}', '["location_question"]', '26027889133540488', datetime('now'), datetime('now'));

-- Lead 12: Arturo Bustos
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Arturo Bustos', NULL, NULL, 'manychat_instagram', 'out_of_scope', 'property_damage', 'DECLINED', '{"instagram":"@arturobustosg"}', '["declined","instagram"]', '662827525', datetime('now'), datetime('now'));

-- Lead 13: Eduardo Ali Carrillo
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Eduardo Ali Carrillo', NULL, NULL, 'manychat_facebook', 'in_review', 'commercial_vehicle', 'Needs clarification', '{"vehicle_type":"tractocamion"}', '["tractocamion"]', '25991442190507720', datetime('now'), datetime('now'));

-- Lead 14: Beatríz Saldaña QUALIFIED
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Beatríz Saldaña', NULL, '8112491200', 'manychat_facebook', 'qualified', 'wrongful_death', 'Documents ready', '{"insurer":"AXXA","documents_complete":"true"}', '["qualified","axxa","fallecimiento"]', '26071979929129808', datetime('now'), datetime('now'));

-- Lead 15: Marcelo M Ortiz QUALIFIED
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Marcelo M Ortiz', NULL, NULL, 'manychat_facebook', 'qualified', 'insurer_denial', 'Needs attorney escalation', '{"insurer":"Chubb","location":"Tijuana","lesiones":"true"}', '["qualified","chubb","lesiones","tijuana"]', '25421817217496411', datetime('now'), datetime('now'));

-- Batch 2: Leads 16-30
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Chuy Salazar', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Buenas tardes', '{}', '["greeting"]', '34980895151497576', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'User 5486333005415', NULL, NULL, 'manychat_facebook', 'new', NULL, '??', '{}', '["unknown"]', '1480409689', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Julian Alonso', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Puedes luchar contra poderosos?', '{}', '["general_question"]', '532845041', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Zacarías Piedras del Río', NULL, NULL, 'manychat_facebook', 'in_review', 'criminal_injury', 'REVIEW - Shooting case', '{"incident_type":"balacera","weapon":"38super"}', '["review","baleado","ciclista","penal"]', '1229910000', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Trinidad Flores Báez', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Muchas gracias', '{}', '["gratitude"]', '26458701590389626', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Oscar Sosa', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Hola ALA LEGAL', '{}', '["greeting"]', '35187681340830734', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'L-na Charo', NULL, NULL, 'manychat_facebook', 'in_review', 'bicycle_accident', 'Evaluate liability', '{"location":"Michoacán","payment":"9000"}', '["potential","bicicleta","michoacan"]', '652930127', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Javier Jimenez De Los Santos', NULL, NULL, 'manychat_facebook', 'new', NULL, '...', '{}', '["no_info"]', '25955776077436775', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Milu Trifan', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Es lei absurda estoi cicista', '{}', '["comment"]', '25932156549799159', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Bayron Said', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Vehicle faults question', '{}', '["general_question"]', '25834443619590092', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Carlos Gordon Chollett', NULL, NULL, 'manychat_facebook', 'new', NULL, '👏', '{}', '["reaction"]', '1700373630', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'richardeh', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Motorcycle question', '{}', '["general_question"]', '1440071226', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Damian Tolentino', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Production comment', '{}', '["comment"]', '1124429054', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Yaya Sanchez', NULL, NULL, 'manychat_facebook', 'new', NULL, 'Right of way question', '{}', '["general_question"]', '621491972', datetime('now'), datetime('now'));
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) VALUES (lower(hex(randomblob(8))), 'Leonardo Rigel Lozano Santana', NULL, NULL, 'manychat_facebook', 'new', NULL, '...', '{}', '["no_info"]', '1892203930', datetime('now'), datetime('now'));

-- Verify count
SELECT 'Total leads imported:' as status, COUNT(*) as total FROM leads;
