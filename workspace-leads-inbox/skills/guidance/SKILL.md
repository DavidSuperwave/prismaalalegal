# Skill: Operator Guidance

## Trigger
When operator sends `/advise`, `/consejo`, `/reglas`, or `/borrar-regla`.

## Description
Lets the operator store permanent guidance rules that the agent follows when
handling conversations. These rules are stored in Supermemory and are
automatically retrieved during conversation handling based on relevance.

## Commands and API Mapping

### /advise [guidance text] or /consejo [texto] — Store new guidance

Call the `store_guidance` tool with:
```json
{
  "content": "[the guidance text after /advise or /consejo]",
  "category": "[inferred category or 'general']"
}
```

Try to infer the category from the guidance content:
- `accidente_mortal` — Rules about wrongful death cases
- `lesiones_graves` — Rules about serious injury cases
- `negativa_aseguradora` — Rules about insurance denial
- `recopilacion_datos` — Rules about data collection
- `tono` — Rules about tone and communication style
- `general` — Everything else

After storing, respond:
```
✅ Regla guardada.

📝 "[guidance text]"
📂 Categoría: [category]

El agente aplicará esta regla automáticamente en conversaciones relevantes.
```

### /reglas — List all guidance

Call the `list_guidance` tool (GET).

Display the results:
```
📋 Reglas activas del operador:

1. [content] (📂 [category]) — ID: [id]
2. [content] (📂 [category]) — ID: [id]
...

Para borrar una regla: /borrar-regla [id]
```

If no guidance exists:
```
📋 No hay reglas activas.
Usa /advise o /consejo para agregar una nueva regla.
```

### /borrar-regla [id] — Delete guidance by ID

1. Call `list_guidance` first to verify the ID exists
2. Call DELETE on the guidance API (note: this is done via a custom request
   since there's no dedicated delete tool — use the store_guidance tool
   description to guide the operator, or confirm deletion manually)

Respond:
```
🗑️ Regla eliminada: [id]
```

## Examples

**Operator:** /advise Siempre preguntar por el número de póliza en casos de negativa
**Agent response:**
```
✅ Regla guardada.

📝 "Siempre preguntar por el número de póliza en casos de negativa"
📂 Categoría: negativa_aseguradora

El agente aplicará esta regla automáticamente en conversaciones relevantes.
```

**Operator:** /consejo Nunca usar emojis en casos de fallecimiento
**Agent response:**
```
✅ Regla guardada.

📝 "Nunca usar emojis en casos de fallecimiento"
📂 Categoría: accidente_mortal

El agente aplicará esta regla automáticamente en conversaciones relevantes.
```

**Operator:** /reglas
**Agent response:** Lists all stored guidance rules with IDs.
