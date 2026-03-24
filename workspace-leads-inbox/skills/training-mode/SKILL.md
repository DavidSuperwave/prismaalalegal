# Skill: Training Mode

## Trigger
When operator sends `/train`, `/simular`, `/corregir`, `/fin`, or `/cancelar`.

## Description
Lets the operator simulate customer conversations to train the agent. The operator
roleplays as a customer, the agent responds, the operator corrects bad responses,
and the final session is saved to Supermemory as approved training data.

## How It Works

You use the HTTP training API tools to manage training sessions. All state is
persisted in the database — it survives restarts.

## Commands and API Mapping

### /train [category] — Start a training session

Call the `training_session` tool with:
```json
{
  "action": "start",
  "category": "negativa_aseguradora"
}
```

Valid categories:
- `accidente_mortal` — Wrongful death scenarios
- `lesiones_graves` — Serious injury cases
- `negativa_aseguradora` — Insurance denial
- `fuga_conductor` — Hit and run
- `accidente_laboral` — Workplace accident (out of scope)
- `prescripcion` — Case >2 years (prescription risk)
- `culpable_propio` — Customer was at fault
- `sin_seguro` — No insurance
- `penal_redireccion` — Criminal case redirect
- `enojo_cliente` — Angry/frustrated customer
- `solo_saludo` — Greeting only
- `recopilacion_datos` — Collecting contact info
- `general` — General training

After starting, respond to the operator:
```
🎓 Modo entrenamiento activado.
Categoría: [category]

Instrucciones:
1. Escribe mensajes como si fueras un cliente
2. Yo responderé como lo haría con un cliente real
3. Si mi respuesta es incorrecta: /corregir [texto correcto]
4. Cuando termines: /fin para guardar
5. Para cancelar: /cancelar
```

### When operator sends a customer message (during active session)

1. First, check if there's an active session: GET `training_status`
2. If active, generate your response as if talking to a real customer
   (follow SOUL.md protocol — Spanish, warm, professional)
3. Save the exchange: call `training_session` with:
```json
{
  "action": "add_exchange",
  "customer_message": "[what the operator said]",
  "agent_reply": "[your response]"
}
```
4. Show your response to the operator, followed by:
   "💡 Si esta respuesta no es correcta, usa /corregir [respuesta correcta]"

### /corregir [corrected text] — Correct last response

Call `training_session` with:
```json
{
  "action": "correct",
  "corrected_text": "[the text after /corregir]"
}
```

Respond:
```
✅ Corrección registrada.
Continúa la simulación o usa /fin para guardar.
```

### /fin — End and save the session

Call `training_session` with:
```json
{
  "action": "finish"
}
```

The API saves everything to Supermemory automatically. Report the results:
```
🎓 Sesión guardada.
- [N] intercambios registrados
- [N] correcciones aplicadas
- [N] patrones creados en Supermemory

El agente ahora usará estos patrones para casos similares.
```

### /cancelar — Cancel without saving

Call `training_session` with:
```json
{
  "action": "cancel"
}
```

## Important Rules During Training

1. When the operator is in training mode and sends a message that is NOT a command,
   treat it as a simulated customer message and respond accordingly.
2. Use the SOUL.md conversation protocol for your responses — same quality
   as a real customer interaction.
3. The operator's corrections are the highest-value training signal. When
   corrected, acknowledge it gracefully and learn from it.
4. Always save exchanges via the API — don't just respond without calling
   add_exchange.
