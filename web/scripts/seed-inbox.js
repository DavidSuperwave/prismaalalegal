/**
 * Seed script to populate the inbox with test conversations and messages.
 * Run from the web directory: node scripts/seed-inbox.js
 */

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH || "./data/template.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function generateId() {
  return Buffer.from(require("node:crypto").randomBytes(8))
    .toString("hex")
    .toLowerCase();
}

function hoursAgo(hours) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

const testConversations = [
  {
    contactName: "María García",
    contactPhone: "+34 612 345 678",
    source: "manychat",
    sentiment: "positive",
    messages: [
      { sender: "contact", content: "Hola, estoy interesada en consultar sobre un despido. ¿Me podrían ayudar?", channel: "manychat", offset: 4 },
      { sender: "agent", content: "Hola María, gracias por contactarnos. Claro que sí, podemos ayudarte con tu consulta sobre despido.\n\nPara darte una respuesta más precisa, ¿podrías decirme si el despido ya se ha producido o si estás anticipando que podría ocurrir?", channel: "manychat", offset: 3 },
      { sender: "contact", content: "Ya ocurrió, me despidieron hace dos semanas sin previo aviso.", channel: "manychat", offset: 2 },
      { sender: "agent", content: "Entendido. Un despido sin previo aviso puede tener implicaciones legales importantes. Te recomiendo que agendes una consulta con uno de nuestros abogados.\n\n¿Tienes documentación del despido o comunicación escrita de la empresa?", channel: "manychat", offset: 1 },
      { sender: "contact", content: "Sí, tengo la carta de despido. ¿Cuándo podrían atenderme?", channel: "manychat", offset: 0 },
    ],
  },
  {
    contactName: "Carlos Rodríguez",
    contactPhone: "+34 698 765 432",
    source: "telegram",
    sentiment: "neutral",
    messages: [
      { sender: "contact", content: "Buenos días. Necesito asesoramiento sobre una herencia.", channel: "telegram", offset: 3 },
      { sender: "agent", content: "Buenos días Carlos. Podemos ayudarte con temas de herencia. ¿Podrías indicarme brevemente cuál es tu situación? Por ejemplo: ¿has recibido ya el testamento, hay disputas entre herederos, o necesitas tramitar la aceptación?", channel: "telegram", offset: 2 },
      { sender: "contact", content: "Hay disputa entre mis hermanos por el reparto del piso familiar.", channel: "telegram", offset: 1 },
      { sender: "human", content: "Gracias por la información. En casos de conflicto entre herederos recomendamos una mediación primero. ¿Le gustaría que le enviemos el formulario de consulta para revisar su caso?", channel: "web", offset: 0 },
    ],
  },
  {
    contactName: "Laura Martínez",
    contactPhone: null,
    source: "manychat",
    sentiment: "negative",
    messages: [
      { sender: "contact", content: "Mi arrendador me subió la renta un 15% sin avisarme. ¿Es legal?", channel: "manychat", offset: 2 },
      { sender: "agent", content: "Hola Laura. Las subidas de renta en contratos de arrendamiento están reguladas por la Ley de Arrendamientos Urbanos. Por norma general, el incremento anual no puede superar el IPC.\n\n¿Sabes si tu contrato está en zona tensionada o tiene alguna cláusula específica sobre revisión de renta?", channel: "manychat", offset: 1 },
      { sender: "contact", content: "No lo sé, pero me siento muy desprotegida. Quiero reclamar.", channel: "manychat", offset: 0 },
    ],
  },
  {
    contactName: "Roberto Fernández",
    contactPhone: "+34 655 111 222",
    source: "telegram",
    sentiment: "positive",
    messages: [
      { sender: "contact", content: "Hola, busco un abogado para un accidente de tráfico.", channel: "telegram", offset: 1 },
      { sender: "agent", content: "Hola Roberto. Somos expertos en reclamaciones por accidentes de tráfico. Para evaluar tu caso necesitaríamos:\n• Fecha y lugar del accidente\n• Parte amistoso o denuncia\n• Informes médicos si hay lesiones\n\n¿Tienes ya la documentación?", channel: "telegram", offset: 0 },
    ],
  },
  {
    contactName: "Ana López",
    contactPhone: "+34 677 888 999",
    source: "manychat",
    sentiment: "neutral",
    messages: [
      { sender: "contact", content: "¿Hacen consultas online?", channel: "manychat", offset: 0 },
    ],
  },
];

function main() {
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");

  const insertConversation = database.prepare(`
    INSERT INTO conversations (
      id, contact_name, contact_phone, source, last_message, last_message_at,
      unread_count, sentiment, lead_id, status, manychat_subscriber_id, telegram_chat_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = database.prepare(`
    INSERT INTO messages (id, conversation_id, sender, content, channel, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((conversations) => {
    for (const conv of conversations) {
      const convId = generateId();
      const lastMsg = conv.messages[0];
      const lastMsgTime = hoursAgo(lastMsg?.offset ?? 0);

      insertConversation.run(
        convId,
        conv.contactName,
        conv.contactPhone ?? null,
        conv.source,
        lastMsg?.content ?? "",
        lastMsgTime,
        0,
        conv.sentiment,
        null,
        "active",
        conv.source === "manychat" ? `mc_${generateId()}` : null,
        conv.source === "telegram" ? `tg_${generateId()}` : null,
        lastMsgTime
      );

      const sortedMessages = [...conv.messages].sort((a, b) => b.offset - a.offset);
      for (const msg of sortedMessages) {
        const timestamp = hoursAgo(msg.offset);
        insertMessage.run(
          generateId(),
          convId,
          msg.sender,
          msg.content,
          msg.channel,
          timestamp,
          "{}"
        );
      }
    }
  });

  insertMany(testConversations);
  database.close();
  console.log(`Seeded ${testConversations.length} conversations into inbox. Database: ${dbPath}`);
}

main();
