import OpenAI from 'openai';
import {
  AIExplanation,
  AIExplanationSchema,
  AIExecutiveSummary,
  AIExecutiveSummarySchema,
  NormalizedIssue,
} from '@auditor/contracts';

export class AiAnalysisService {
  private openai: OpenAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, model = 'gpt-4o-mini') {
    this.modelName = model;
    if (apiKey && apiKey.trim() !== '') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  public isAvailable(): boolean {
    return this.openai !== null;
  }

  public async explainIssue(issue: NormalizedIssue): Promise<AIExplanation> {
    if (!this.openai) {
      return this.fallbackExplanation(issue);
    }

    try {
      const prompt = `Analyze this technical website issue and provide simple, actionable business explanation in JSON format.
Evidence:
Issue Title: ${issue.title}
Category: ${issue.category}
Severity: ${issue.severity}
Affected URL: ${issue.affectedUrl}
Details: ${issue.description}
Raw Evidence: ${JSON.stringify(issue.evidence)}

Return strictly valid JSON matching this schema:
{
  "summary": "1-2 sentence plain language summary",
  "businessImpact": "Potential effect on conversions, user trust, or search rankings",
  "recommendation": "Clear technical or content fix",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL"
}`;

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const rawJson = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawJson);
      return AIExplanationSchema.parse(parsed);
    } catch {
      return this.fallbackExplanation(issue);
    }
  }

  public async generateExecutiveSummary(
    websiteName: string,
    overallScore: number,
    issues: NormalizedIssue[]
  ): Promise<AIExecutiveSummary> {
    if (!this.openai) {
      return this.fallbackExecutiveSummary(websiteName, overallScore, issues);
    }

    try {
      const topIssues = issues.slice(0, 15).map((i) => ({
        title: i.title,
        severity: i.severity,
        category: i.category,
        url: i.affectedUrl,
      }));

      const prompt = `Provide an executive website audit summary for ${websiteName}.
Overall Health Score: ${overallScore}/100.
Detected Issues: ${JSON.stringify(topIssues)}

Return strictly valid JSON matching this schema:
{
  "executiveSummary": "Concise paragraph for leadership",
  "criticalObservations": ["Key high-priority finding 1", "Key finding 2"],
  "actionPlan": [
    { "step": 1, "action": "Action item description", "expectedImpact": "Impact description" }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const rawJson = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawJson);
      return AIExecutiveSummarySchema.parse(parsed);
    } catch {
      return this.fallbackExecutiveSummary(websiteName, overallScore, issues);
    }
  }

  private fallbackExplanation(issue: NormalizedIssue): AIExplanation {
    return {
      summary: issue.description || issue.title,
      businessImpact:
        issue.severity === 'CRITICAL' || issue.severity === 'HIGH'
          ? 'May degrade user experience, trust, or functional journeys.'
          : 'Minor observation with low immediate business impact.',
      recommendation: issue.recommendedFix || 'Inspect and rectify the affected element or route.',
      priority: issue.severity,
    };
  }

  private fallbackExecutiveSummary(
    websiteName: string,
    overallScore: number,
    issues: NormalizedIssue[]
  ): AIExecutiveSummary {
    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;

    return {
      executiveSummary: `Audit completed for ${websiteName} with an overall health score of ${Math.round(overallScore)}/100. A total of ${issues.length} issue(s) were identified across functional, SEO, accessibility, and performance categories.`,
      criticalObservations: [
        `${criticalCount} high or critical priority issue(s) need immediate attention.`,
        `${issues.length - criticalCount} medium or low severity optimization opportunities were noted.`,
      ],
      actionPlan: [
        {
          step: 1,
          action: 'Resolve broken links and critical functional interaction failures.',
          expectedImpact: 'Restores user journeys and prevents conversion drop-off.',
        },
        {
          step: 2,
          action: 'Address missing SEO metadata and accessibility labels.',
          expectedImpact: 'Improves search discoverability and assistive technology compliance.',
        },
      ],
    };
  }
}

