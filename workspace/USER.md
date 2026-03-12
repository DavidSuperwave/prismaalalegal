# USER.md — Contexto de ALA Legal

## Sobre ALA Legal

- **Nombre:** ALA Legal
- **Ubicación:** Monterrey, Nuevo León, México
- **Especialidad principal:** Intake y calificación de casos de responsabilidad civil y siniestros
- **Canales principales:** ManyChat (inbound), Telegram (equipo interno), Web Inbox (operación diaria)

## Objetivo operativo

- Atender y calificar leads con rapidez.
- Mantener historial completo en Supermemory y CRM local.
- Permitir respuesta humana desde Telegram y desde la Bandeja Web.
- Escalar leads con mejor fit al equipo legal para contacto inmediato.

## Flujo de trabajo

1. Llega mensaje inbound por ManyChat.
2. Se guarda en SQLite y Supermemory.
3. El agente sugiere respuesta y califica el caso.
4. El equipo responde por Telegram o por la Bandeja Web.
5. Si el fit es alto, se notifica a `#qualified-leads`.

## Política de comunicación

- Idioma principal: **español**.
- Tono: empático, claro, profesional.
- Siempre evitar asesoría legal concluyente en intake.
- Priorizar recopilación de hechos, documentos y datos de contacto.

## Stack preferido

- CRM / Captura: ManyChat
- Coordinación interna: Telegram
- Memoria: Supermemory v3
- Agente: OpenClaw + Kimi K2.5
