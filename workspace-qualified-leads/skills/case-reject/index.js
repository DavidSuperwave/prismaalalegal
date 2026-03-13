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

  async execute(input = {}) {
    const command = typeof input.command === "string" ? input.command.trim() : "";
    const commandParts = command.split(/\s+/);
    const isCommand = commandParts[0]?.toLowerCase() === "/casereject";
    const commandLeadId = isCommand ? commandParts[1] : undefined;
    const commandReason = isCommand ? commandParts.slice(2).join(" ").trim() : "";

    const leadId = input.leadId || input.context?.leadId || commandLeadId;
    const reason = input.reason || input.context?.reason || commandReason;
    const leadPhone = input.leadPhone || input.context?.leadPhone;
    const leadName = input.leadName || input.context?.leadName;
    const practiceArea = input.practiceArea || input.context?.practiceArea;
    const scenario = input.scenario || input.context?.scenario;
    const confidence = input.confidence || input.context?.confidence || "medium";

    if (!leadId) {
      throw new Error("leadId is required for /casereject. Use '/casereject <lead_id> <reason>' or provide structured params.");
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
        leadPhone: String(leadPhone || ""),
        leadName: String(leadName || ""),
        practiceArea: String(practiceArea || "unknown"),
        scenario: String(scenario || ""),
        decision: "rejected",
        reason: String(reason),
        confidenceWas: confidence,
      }),
    });

    return `Case rejected for ${leadName || leadId}. Reason logged.`;
  },
};
