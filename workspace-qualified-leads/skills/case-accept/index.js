const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL || "http://web:3000";
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "x-service-token": SERVICE_TOKEN,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

module.exports = {
  name: "case-accept",
  description: "Accept qualified case and update learning memory",

  async execute(input = {}) {
    const command = typeof input.command === "string" ? input.command.trim() : "";
    const commandLeadId = command.toLowerCase().startsWith("/caseaccept")
      ? command.split(/\s+/).slice(1)[0]
      : undefined;

    const leadId = input.leadId || input.context?.leadId || commandLeadId;
    const leadPhone = input.leadPhone || input.context?.leadPhone;
    const leadName = input.leadName || input.context?.leadName;
    const practiceArea = input.practiceArea || input.context?.practiceArea;
    const scenario = input.scenario || input.context?.scenario;
    const keyFactors = input.keyFactors || input.context?.keyFactors;
    const confidence = input.confidence || input.context?.confidence || "medium";

    if (!leadId) {
      throw new Error("leadId is required for /caseaccept. Use '/caseaccept <lead_id>' or provide structured params.");
    }

    await requestJson(`${WEB_APP_URL}/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: "accepted" }),
    });

    await requestJson(`${WEB_APP_URL}/api/agent/memory/case-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadPhone: String(leadPhone || ""),
        leadName: String(leadName || ""),
        practiceArea: String(practiceArea || "unknown"),
        scenario: String(scenario || ""),
        decision: "accepted",
        keyFactors: String(keyFactors || ""),
        confidenceWas: confidence,
      }),
    });

    return `Case accepted. Lead ${leadName || leadId} moved to accepted.`;
  },
};
