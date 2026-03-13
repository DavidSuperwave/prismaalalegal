const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL || "http://web:3000";

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

module.exports = {
  name: "case-review",
  description: "Move lead to case review state",

  async execute({ leadId }) {
    if (!leadId) throw new Error("leadId is required for /casereview");
    await requestJson(`${WEB_APP_URL}/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: "case_review" }),
    });
    return `Lead ${leadId} moved to case_review.`;
  },
};
