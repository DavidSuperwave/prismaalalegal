# ManyChat Conversations Export
# Agent: Prisma Legal
# Date: March 11, 2026
# Total: 54 conversations
# Source: Manual export from ManyChat

---

## Conversation 1: Vanguardia Zuly
- **Subscriber ID:** 26395695743355724
- **Gender:** Female
- **Language:** Spanish
- **Status:** Unassigned
- **Channel:** Facebook

### Messages:
1. **Tuesday 05:09 (User):**
   "Hola qué taespeeo y me puedas orientar 🙏🏻🙏🏻🙏🏻por q ya no se q hacer Tengo mi carro asegurado con Quálitas En octubre del 2015 me chocaron estando estacionada, el culpable en el momento no quiso hacerse responsable por lo q lo denuncié y llegamos a un acuerdo en noviembre y el responsable pagó todos los gastos q la aseguradora asignó, pero es fecha que no han reparado mi carro y los supervisor y coordinador q se supone q iban a estar dando seguimiento a mi caso no me contestan las llamadas ni mensajes, hice un reporte por medio de la página de la aseguradora y por los números telefónicos que en la página aparecen solo quedan en q van a revisar mi caso y ya no se comunican conmigo Espero y me puedan orientar, en q hacer en estos casos"

2. **Today 12:22 (Agent):**
   "Hola qué tal buenas tardes, una disculpa por la tardanza"

3. **Today 12:22 (Agent):**
   "Es importante que recabe todas las pruebas de los reportes que ha hecho ante la aseguradora para demostrar la negativa de ellos, puede acudir a la conducef, ellos apoyan a los usuarios que tienen problemas ante instituciones financieras y aseguradoras"

4. **Today 13:00 (User):**
   "Tengo los mensajes por what SAP y algunas imágenes de donde puse el reporte en su página la de las llamadas pues nunca me han dado un número de reporte pero tengo anotado los nombres q me han atendido"

5. **Today 13:00 (User):**
   "Muchas gracias"

---

## Conversation 2: Victor Esquivel
- **Subscriber ID:** 26024487400512699
- **Last Message:** 2h ago
- **Preview:** "6643708644"

---

## Conversation 3: Jorge Luis Gongora Sequera
- **Subscriber ID:** 26093576043614856
- **Last Message:** 2h ago
- **Preview:** "si entiendo, pensé que me podian dar una asesoria para ver cómo proceder por que me piden inventario y reporte de perdidas y ganancias pero todas las computadoras se me echaron a perder y no tengo como sacar la información"

---

## Conversation 4: Elia Soriano Jn
- **Subscriber ID:** 34160822006897450
- **Last Message:** 1d ago
- **Preview:** "Buenos días"

---

## Conversation 5: Packo Donatary
- **Subscriber ID:** 26755949787345504
- **Last Message:** 2d ago
- **Preview:** "MENTIROSO CABRON"

---

## Conversation 6: 🐓
- **Subscriber ID:** 56167725
- **Last Message:** 2d ago
- **Preview:** "..."

---

## Conversation 7: Mg Diego
- **Subscriber ID:** 25611852911812014
- **Last Message:** 4d ago
- **Preview:** "Gracias 👌🏽"

---

## Conversation 8: armando Hernandez Hernandez
- **Subscriber ID:** 1034964093
- **Last Message:** 4d ago
- **Preview:** "..."

---

## Conversation 9: Raquel Lopez
- **Subscriber ID:** 1212999897
- **Last Message:** 5d ago
- **Preview:** "..."

---

## Conversation 10: Estrella luna
- **Subscriber ID:** 965948082
- **Last Message:** 6d ago
- **Preview:** "A mi hijo lo atropellaron crizando una carretera federal pero hay esc y tiendas fue en Mérida carretera Mérida progreso enfrente de la universidad el estudia y trabaja y el pedito dice que el es culpable ,que el que atropellaro no tuvo la culpa"

---

## Conversation 11: Cary Daniel Campos
- **Subscriber ID:** 26027889133540488
- **Last Message:** 6d ago
- **Preview:** "Disculpa, en qué estado te encuentras?"

---

## Conversation 12: Arturo Bustos
- **Subscriber ID:** 662827525
- **Last Message:** 7d ago
- **Preview:** "Hola 👋 Gracias por comunicarte con Ala Legal. Somos un despacho enfocado exclusivamente en la representación de familias de personas fallecidas en accidentes automovilísticos y de víctimas con lesiones graves o permanentes..."

---

## Conversation 13: Eduardo Ali Carrillo
- **Subscriber ID:** 25991442190507720
- **Last Message:** 7d ago
- **Preview:** "Un tractocamion"

---

## Conversation 14: Beatríz Saldaña
- **Subscriber ID:** 26071979929129808
- **Last Message:** 7d ago
- **Preview:** "Buena noche"

---

## Conversation 15: Marcelo M Ortiz
- **Subscriber ID:** 25421817217496411
- **Last Message:** 7d ago
- **Preview:** "?"

---

# Import Instructions:

1. Copy this file to the server
2. Run: node scripts/import-conversations.js
3. Or manually POST each conversation to Supermemory via the API

# Supermemory API Endpoint:
POST https://api.supermemory.ai/v3/add
Headers:
  Authorization: Bearer sm_NneFm4f9iFbTCtM99gt15z_azzNHMoXjBGfrKzaKZiNzUpIZRIyKeIGiuGNEDUhwAbfQBqUiBvEIJyaNodJUuZY
Body:
{
  "content": "conversation text",
  "containerTags": ["client:prismaalalegal:conversations"],
  "metadata": {
    "type": "conversation",
    "contact_name": "...",
    "channel": "manychat",
    "timestamp": "..."
  }
}
