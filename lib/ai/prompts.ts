import { Regulation } from '@/types';

const COMPANY_CONTEXT = `
You are a regulatory compliance expert analyzing Finnish regulations for Kemira Oyj,
a leading global water treatment chemicals and specialized chemicals manufacturer.

Company Profile:
- Name: Kemira Oyj
- Primary Division: Water Treatment Chemicals Division
- Products: Water treatment chemicals, pulp & paper chemicals, oil & gas chemicals
- Manufacturing: Primary operations in Finland, EU-wide distribution network
- Key Markets: Water utilities, industrial water treatment, pulp & paper industry, oil & gas
- Key Concerns: REACH compliance, chemical safety data sheets, environmental regulations, workplace safety, CLP classifications

Kemira's Perspective:
- Regulatory compliance is critical for market access and operational continuity
- Strong emphasis on sustainable and responsible chemistry
- Global manufacturing and distribution means adherence to Finnish, EU, and international regulations
- Procurement of raw materials also impacted by supply chain regulations
`;

/**
 * Generate a prompt for analyzing regulation relevance
 * Returns: { score: 0-100, reasoning: string }
 */
export function relevancePrompt(regulation: Regulation): string {
  return `
${COMPANY_CONTEXT}

Regulation to Analyze:
Title: ${regulation.title}
Source: ${regulation.source_url}
Published: ${regulation.published_date}
Description: ${regulation.description}

Task: Analyze how relevant this regulation is to Kemira Oyj's operations on a scale of 0-100.

Scoring Guidelines:
- 90-100: Direct regulation of water treatment chemicals, chemical safety, or core manufacturing processes
- 70-89: Significantly affects manufacturing processes, safety data sheets, compliance obligations, or supply chain
- 50-69: Moderate indirect impact on supply chain, environmental reporting, workplace safety, or permitting
- 30-49: General chemical industry regulation with limited specific impact to Kemira
- 0-29: Not relevant to Kemira's water treatment chemicals or manufacturing operations

Respond ONLY with valid JSON:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>"
}
`;
}

/**
 * Generate a prompt for full impact analysis
 * Returns: Full analysis with action items, timeline, financial impact, etc.
 */
export function impactAnalysisPrompt(regulation: Regulation, existingScore?: number): string {
  return `
${COMPANY_CONTEXT}

Regulation Analysis Request:
Title: ${regulation.title}
Source: ${regulation.source_url}
Published: ${regulation.published_date}
Relevance Score: ${existingScore ?? 'pending'}
Description: ${regulation.description}

Task: Provide comprehensive impact analysis for Kemira Oyj with actionable compliance items.

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "impact_level": "high" | "medium" | "low",
  "executive_summary": "<2-3 sentence overview of the regulation and its impact on Kemira>",
  "key_changes": ["<specific change 1>", "<specific change 2>", "<specific change 3>"],
  "affected_areas": ["<business area 1>", "<business area 2>"],
  "compliance_deadline": "<ISO 8601 date (YYYY-MM-DD) or 'To be determined'>",
  "action_items": [
    {
      "department": "R&D" | "Compliance" | "Operations" | "Legal" | "Environmental" | "Quality" | "Supply Chain" | "Executive",
      "action": "<specific action required, e.g., 'Update safety data sheets for water treatment products'>",
      "deadline": "<ISO 8601 date or null>",
      "priority": "high" | "medium" | "low"
    }
  ],
  "estimated_effort": "<e.g., '3-6 months, 2-3 FTEs across departments'>",
  "financial_impact": "<qualitative assessment, e.g., 'Moderate: Equipment updates required, estimated EUR 50K-100K'>",
  "risks_if_ignored": "<consequences of non-compliance, e.g., 'Market access restrictions, regulatory fines up to EUR 1M, operational shutdown risks'>",
  "kemira_specific_considerations": "<1-2 sentences on how this applies specifically to Kemira's water treatment chemicals division>"
}

Important:
- Analyze from Kemira's perspective as a water treatment chemicals manufacturer
- Focus on practical, actionable compliance steps
- Consider Kemira's global distribution and multi-site manufacturing
- Include specific deadlines when mentioned in the regulation
- Prioritize action items based on business impact and compliance urgency
- If no specific deadline is mentioned, estimate based on typical regulatory timelines (6-18 months for major changes)
`;
}

/**
 * Validation schemas for Gemini responses
 */
export const RELEVANCE_RESPONSE_SCHEMA = {
  score: 'number',
  reasoning: 'string',
};

export const IMPACT_ANALYSIS_SCHEMA = {
  impact_level: 'string',
  executive_summary: 'string',
  key_changes: 'array',
  affected_areas: 'array',
  compliance_deadline: 'string',
  action_items: 'array',
  estimated_effort: 'string',
  financial_impact: 'string',
  risks_if_ignored: 'string',
  kemira_specific_considerations: 'string',
};
