const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL || "http://web:3000";

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

module.exports = {
  name: "case-reject",
  description: "Reject qualified case and log rejection reason",

  async execute({
    leadId,
    reason,
    leadPhone,
    leadName,
    practiceArea,
    scenario,
    confidence = "medium",
  }) {
    if (!leadId) {
      throw new Error("leadId is required for /casereject");
    }
    if (!reason || !String(reason).trim()) {
      throw new Error("reason is required for /casereject");
    }

    await requestJson(`${WEB_APP_URL}/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: "rejected" }),
    });

    await requestJson(`${WEB_APP_URL}/api/agent/memory/case-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadPhone: leadPhone || "",
        leadName: leadName || "",
        practiceArea: practiceArea || "unknown",
        scenario: scenario || "",
        decision: "rejected",
        reason: String(reason),
        confidenceWas: confidence,
      }),
    });

    return `Case rejected for ${leadName || leadId}. Reason logged.`;
  },
};
