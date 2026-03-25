# Skill: Case Criteria Management

## Trigger
When operator sends `/caso-si`, `/caso-no`, `/caso-evaluar`, `/caso-simular`, `/casos-criterio`, or `/caso-revisar`.

## Description
Lets the operator manage intake case criteria: evaluate conversations against qualification rules, manually accept or reject cases, simulate evaluations, and review collected intake data.

## Criteria
Binary rule: **serious injury or death** + **insurance involved** = ACCEPT. Everything else = REJECT.

## Commands and API Mapping

### /caso-evaluar [conversation_id or contact name] — Evaluate a conversation

First, find the conversation ID (use `get_conversations` if operator provides a contact name).

Call the `case_criteria` tool with:
```json
{
  "action": "evaluate",
  "conversation_id": "[conversation_id]"
}
```

Display the result:
```
Evaluacion de caso

Contacto: [contact_name]
Etapa actual: [current_stage]
Decision: [ACCEPT/REJECT/INSUFFICIENT]
Razon: [reasoning]

Datos recopilados:
- Tipo: [incident_type]
- Lesiones: [injury_description]
- Aseguradora: [insurer_name]
```

### /caso-si [conversation_id or contact name] — Manually accept a case

Find conversation ID, then call `case_criteria` with:
```json
{
  "action": "accept",
  "conversation_id": "[conversation_id]"
}
```

Respond:
```
Caso aceptado manualmente.
Conversacion: [conversation_id]
Nueva etapa: [new_stage]
```

### /caso-no [conversation_id or contact name] [razon] — Manually reject a case

Find conversation ID, then call `case_criteria` with:
```json
{
  "action": "reject",
  "conversation_id": "[conversation_id]",
  "reason": "[razon provided by operator]"
}
```

Respond:
```
Caso rechazado.
Conversacion: [conversation_id]
Razon: [reason]
```

### /caso-simular [conversation_id or contact name] — Dry-run evaluation

Find conversation ID, then call `case_criteria` with:
```json
{
  "action": "simulate",
  "conversation_id": "[conversation_id]"
}
```

Display simulation result (same format as evaluate, but note it's a dry-run):
```
Simulacion (sin cambios aplicados)

Contacto: [contact_name]
Etapa actual: [current_stage]
Decision: [ACCEPT/REJECT/INSUFFICIENT]
Razon: [reasoning]
```

### /caso-revisar [conversation_id or contact name] — Review intake data

Find conversation ID, then call `case_criteria` with:
```json
{
  "action": "review",
  "conversation_id": "[conversation_id]"
}
```

Display all collected intake data:
```
Revision de intake

Contacto: [contact_name] -- [contact_phone]
Etapa: [current_stage]
Lead status: [lead_status]

Datos recopilados:
- Tipo de incidente: [incident_type]
- Fecha: [incident_date]
- Severidad: [injury_severity]
- Descripcion lesiones: [injury_description]
- Aseguradora: [insurer_name]
- Estado aseguradora: [insurer_status]
- Reporte policial: [has_police_report]
- Expediente medico: [has_medical_records]
- Telefono contacto: [contact_phone]
- Ubicacion: [location]
- Resumen: [case_summary]
```

### /casos-criterio — Show current criteria

Call `get_case_criteria` tool.

Respond:
```
Criterios de calificacion actuales

Regla: Lesiones graves o muerte + aseguradora = ACEPTAR
Todo lo demas = RECHAZAR

Etapas del pipeline:
new -> greeting -> exploring -> collecting -> requesting_contact -> briefing -> handed_off

Etapas terminales: rejected, closed
```

## Important Rules

1. If the operator provides a contact name instead of a conversation ID, use `get_conversations` first to find the matching conversation.
2. If multiple conversations match, show a disambiguation list and ask the operator to specify.
3. Always display results in Spanish.
4. For `/caso-no`, a reason is required. If not provided, ask the operator for one.
