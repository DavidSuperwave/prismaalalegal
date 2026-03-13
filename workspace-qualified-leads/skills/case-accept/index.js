const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL || "http://web:3000";

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

module.exports = {
  name: "case-accept",
  description: "Accept qualified case and update learning memory",

  async execute({ leadId, leadPhone, leadName, practiceArea, scenario, keyFactors, confidence = "medium" }) {
    if (!leadId) {
      throw new Error("leadId is required for /caseaccept");
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
        leadPhone: leadPhone || "",
        leadName: leadName || "",
        practiceArea: practiceArea || "unknown",
        scenario: scenario || "",
        decision: "accepted",
        keyFactors: keyFactors || "",
        confidenceWas: confidence,
      }),
    });

    return `Case accepted. Lead ${leadName || leadId} moved to accepted.`;
  },
};
