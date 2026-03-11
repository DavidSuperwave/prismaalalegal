#!/bin/bash
# import-all-leads-to-web-crm.sh
# Import all 54 ManyChat leads into the web CRM SQLite database

cd /root/prismaalalegal/web

# Create the SQL insert statements
cat > /tmp/import_leads.sql << 'EOF'
-- Clear existing data (optional - remove if you want to keep existing)
-- DELETE FROM leads;
-- DELETE FROM conversations;
-- DELETE FROM messages;

-- Lead 1: Vanguardia Zuly
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Vanguardia Zuly', NULL, NULL, 'manychat_export', 'in_review', 'insurer_denial', 'Agent recommended CONDUSEF', 'Accidente oct 2015, auto estacionado, Quálitas no repara. Tiene mensajes de WhatsApp y screenshots de reporte. CONDUSEF recommended.', '["qualitas","condusef","2015","estacionado"]', '26395695743355724', datetime('now'), datetime('now'));

-- Lead 2: Victor Esquivel
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Victor Esquivel', NULL, '6643708644', 'manychat_export', 'qualified', 'insurer_denial', 'Follow-up call scheduled', 'Póliza sin documentos físicos, solo número. Tijuana, BC. Preguntó por costos. Trabajamos con comisión del resultado.', '["tijuana","comision","condusef","pago"]', '26024487400512699', datetime('now'), datetime('now'));

-- Lead 3: Jorge Luis Gongora Sequera
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Jorge Luis Gongora Sequera', NULL, NULL, 'manychat_export', 'out_of_scope', 'commercial_property', 'DECLINED - Not our specialty', 'Álamo Veracruz - negocio inundado con 3 metros de agua. Necesita inventario y reporte P&L pero computadoras dañadas. FUERA DE ALCANCE - comercial, no vehicular.', '["declined","comercial","veracruz","inundacion"]', '26093576043614856', datetime('now'), datetime('now'));

-- Lead 4: Elia Soriano Jn
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Elia Soriano Jn', NULL, NULL, 'manychat_export', 'new', NULL, 'Greeting only', 'Solo dijo Buenos días. Sin detalles de caso. Agente respondió pero no hay seguimiento.', '["greeting_only","no_info"]', '34160822006897450', datetime('now'), datetime('now'));

-- Lead 5: Packo Donatary
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Packo Donatary', NULL, NULL, 'manychat_export', 'new', NULL, 'Angry message', 'Mensaje: "MENTIROSO CABRON". Requiere atención.', '["angry","requires_attention"]', '26755949787345504', datetime('now'), datetime('now'));

-- Lead 6: Estrella luna ⭐ QUALIFIED
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, telegram_chat_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Estrella luna', NULL, NULL, 'manychat_export', 'urgent', 'vehicle_accident_death', 'NO RESPONSE IN 6 DAYS - URGENT', 'Hijo atropellado en carretera Mérida-Progreso frente a universidad. Hijo estudia y trabaja. Conductor culpable. Hay escuelas y tiendas cerca (testigos?). Instagram: @estrella_martz1. URGENTE - 6 días sin respuesta.', '["urgent","merida","atropellado","hijo","universidad","testigos"]', '965948082', NULL, datetime('now'), datetime('now'));

-- Lead 7: Cary Daniel Campos
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Cary Daniel Campos', NULL, NULL, 'manychat_export', 'new', NULL, 'Asked location', 'Preguntó en qué estado estamos. Agente respondió: Nuevo León, Monterrey. Sin caso.', '["location_question","monterrey"]', '26027889133540488', datetime('now'), datetime('now'));

-- Lead 8: Arturo Bustos
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Arturo Bustos', NULL, NULL, 'manychat_export', 'out_of_scope', 'property_damage', 'DECLINED - Auto-reply sent', 'Instagram @arturobustosg - Carro dañado en estacionamiento de paga. DECLINED - Solo daños materiales, no lesiones/fallecimiento.', '["declined","estacionamiento","daños_materiales"]', '662827525', datetime('now'), datetime('now'));

-- Lead 9: Eduardo Ali Carrillo
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Eduardo Ali Carrillo', NULL, NULL, 'manychat_export', 'in_review', 'commercial_vehicle', 'Needs clarification', 'Tractocamión - inundación/pérdida total. Agente preguntó si es vivienda (no, es vehículo comercial). Requiere seguimiento para clarificar alcance.', '["tractocamion","comercial","perdida_total","requiere_seguimiento"]', '25991442190507720', datetime('now'), datetime('now'));

-- Lead 10: Beatríz Saldaña ⭐ QUALIFIED
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Beatríz Saldaña', NULL, '8112491200', 'manychat_export', 'qualified', 'wrongful_death', 'Collecting documents', 'Fallecimiento AXXA. Tiene: póliza, acta matrimonio/defunción, comprobante ingresos. Carpeta investigación solicitada. Mensajes AXXA borrados pero tiene otras pruebas. CONDUSEF pending. Calificada - documentos listos.', '["qualified","axxa","fallecimiento","documentos_listos","condusef"]', '26071979929129808', datetime('now'), datetime('now'));

-- Lead 11: Marcelo M Ortiz ⭐ QUALIFIED
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Marcelo M Ortiz', NULL, NULL, 'manychat_export', 'qualified', 'insurer_denial', 'Needs attorney escalation', 'Chubb VIP póliza (22 Dic), accidente 24 Dic. Lesiones: airbag explotó en cara, dolor cuello, pase médico. Auto pérdida total. Chubb investigando 30+ días sin respuesta. Ajustador dio instrucciones confusas. Tijuana BC.', '["qualified","chubb","lesiones","perdida_total","tijuana","negativa"]', '25421817217496411', datetime('now'), datetime('now'));

-- Lead 12: Zacarías Piedras del Río
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'Zacarías Piedras del Río', NULL, NULL, 'manychat_export', 'in_review', 'criminal_injury', 'REVIEW - Possible criminal referral', 'Hijo baleado por ciclista con .38 super en semáforo. Ciclista escapó. 3 balas. Familia completa presente. Puede requerir abogado penalista. Revisar si hay componente civil de indemnización.', '["review","baleado","ciclista","38super","penal","civil"]', '1229910000', datetime('now'), datetime('now'));

-- Lead 13: L-na Charo ⭐ POTENTIAL
INSERT INTO leads (id, name, email, phone, source, status, case_type, last_action, notes, tags, manychat_subscriber_id, created_at, updated_at) 
VALUES (lower(hex(randomblob(8))), 'L-na Charo', NULL, NULL, 'manychat_export', 'in_review', 'bicycle_accident', 'Evaluate shared liability', 'Michoacán - hija chocó bici eléctrica con auto. Aceptó culpabilidad (no pudo frenar). Pagó $9,000 MXN por daños. ¿Fue justo? Posible responsabilidad compartida. Evaluar caso.', '["potential","bicicleta","michoacan","9000","culpabilidad"]', '652930127', datetime('now'), datetime('now'));

-- Verify count
SELECT 'Total leads imported:' as message, COUNT(*) as count FROM leads;
EOF

# Run the import
sqlite3 data/template.db < /tmp/import_leads.sql

echo "✅ Leads imported successfully!"
echo ""
echo "To view imported leads:"
echo "  sqlite3 data/template.db 'SELECT name, status, case_type FROM leads;'"
