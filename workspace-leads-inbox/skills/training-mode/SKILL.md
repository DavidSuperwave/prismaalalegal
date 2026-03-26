# Skill: Training Mode

## Trigger
When operator sends `/train`, `/simular`, `/corregir`, `/fin`, or `/cancelar`.

## Description
Lets the operator simulate customer conversations to train the agent. The operator
roleplays as a customer, the agent responds, the operator corrects bad responses,
and the final session is saved to Supermemory as approved training data.

## How It Works

You use inline fetch() calls to the training API to manage training sessions. All state is
persisted in the database — it survives restarts.

## API Constants

Use these constants for all API calls (same as SOUL.md):
```javascript
const BASE_URL = 'http://web:3000';
const TOKEN = '0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb';
```

## Commands and API Mapping

### /train [category] — Start a training session

```javascript
const response = await fetch(`${BASE_URL}/api/training`, {
  method: 'POST',
  headers: {
    'x-service-token': TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'start',
    category: 'negativa_aseguradora'  // replace with actual category
  })
});
const result = await response.json();
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

1. First, check if there's an active session:
```javascript
const statusResponse = await fetch(`${BASE_URL}/api/training`, {
  headers: { 'x-service-token': TOKEN }
});
const statusData = await statusResponse.json();
```

2. If active, generate your response as if talking to a real customer
   (follow SOUL.md protocol — Spanish, warm, professional)

3. Save the exchange:
```javascript
const response = await fetch(`${BASE_URL}/api/training`, {
  method: 'POST',
  headers: {
    'x-service-token': TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'add_exchange',
    customer_message: '[what the operator said]',
    agent_reply: '[your response]'
  })
});
const result = await response.json();
```

4. Show your response to the operator, followed by:
   "💡 Si esta respuesta no es correcta, usa /corregir [respuesta correcta]"

### /corregir [corrected text] — Correct last response

```javascript
const response = await fetch(`${BASE_URL}/api/training`, {
  method: 'POST',
  headers: {
    'x-service-token': TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'correct',
    corrected_text: '[the text after /corregir]'
  })
});
const result = await response.json();
```

Respond:
```
✅ Corrección registrada.
Continúa la simulación o usa /fin para guardar.
```

### /fin — End and save the session

```javascript
const response = await fetch(`${BASE_URL}/api/training`, {
  method: 'POST',
  headers: {
    'x-service-token': TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'finish'
  })
});
const result = await response.json();
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

```javascript
const response = await fetch(`${BASE_URL}/api/training`, {
  method: 'POST',
  headers: {
    'x-service-token': TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'cancel'
  })
});
const result = await response.json();
```

### /simular [contact name or id] — Simulate from active chat

```javascript
const response = await fetch(`${BASE_URL}/api/training/simulate`, {
  method: 'POST',
  headers: {
    'x-service-token': TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_name: '[name after /simular]'
    // OR: conversation_id: '[the id]'
  })
});
const result = await response.json();
```

If the API returns `disambiguation: true`, show the candidate list:
```
🔎 Encontré varias conversaciones:
1. [contact_name] — ID: [id]
2. [contact_name] — ID: [id]

¿Cuál quieres simular? Usa /simular [id]
```

If successful, display the loaded conversation:
```
🎓 Simulación cargada desde conversación real.
👤 Contacto: [contact_name]
📂 Categoría inferida: [inferred_category]
💬 Mensajes cargados: [messages_loaded]
🔄 Intercambios encontrados: [exchanges_found]

La sesión de entrenamiento está activa. Puedes:
- Revisar los intercambios y corregir con /corregir [texto correcto]
- Continuar la simulación enviando más mensajes de cliente
- Guardar con /fin o cancelar con /cancelar
```

Then enter training mode with the loaded conversation context.

## Important Rules During Training

1. When the operator is in training mode and sends a message that is NOT a command,
   treat it as a simulated customer message and respond accordingly.
2. Use the SOUL.md conversation protocol for your responses — same quality
   as a real customer interaction.
3. The operator's corrections are the highest-value training signal. When
   corrected, acknowledge it gracefully and learn from it.
4. Always save exchanges via the API — don't just respond without calling
   add_exchange.
