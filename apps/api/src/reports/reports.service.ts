import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@auditor/database';
import { ReportGenerator } from '@auditor/reporting';

@Injectable()
export class ReportsService {
  async listReports(organizationId: string) {
    return prisma.audit.findMany({
      where: {
        website: { organizationId },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        createdAt: true,
        overallScore: true,
        issuesFound: true,
        website: { select: { id: true, name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHtmlReport(auditId: string, organizationId?: string): Promise<string> {
    const whereClause: any = { id: auditId };
    if (organizationId) {
      whereClause.website = { organizationId };
    }

    const audit = await prisma.audit.findFirst({
      where: whereClause,
      include: {
        website: true,
        aiAnalysis: true,
        issueOccurrences: {
          include: { issue: true },
          take: 50,
        },
      },
    });

    if (!audit) {
      throw new NotFoundException('Audit report not found');
    }

    const issues = audit.issueOccurrences.map((occ) => ({
      title: occ.issue.title,
      category: occ.issue.category,
      severity: occ.issue.severity,
      affectedUrl: occ.affectedUrl,
      description: occ.issue.description,
      recommendedFix: occ.issue.suggestedFix || undefined,
    }));

    const aiPlan = (audit.aiAnalysis?.actionPlan as any) || [
      { step: 1, action: 'Inspect high severity issues', expectedImpact: 'Restore website stability' },
    ];

    const criticalObs = ((audit.aiAnalysis?.keyRecommendations as any) || []).map((r: any) =>
      typeof r === 'string' ? r : r.recommendation || 'Fix high priority defects'
    );

    return ReportGenerator.generateHtmlReport({
      auditId: audit.id,
      websiteName: audit.website.name,
      websiteUrl: audit.website.url,
      auditDate: audit.createdAt.toLocaleDateString(),
      overallScore: audit.overallScore || 0,
      scores: {
        performance: audit.performanceScore || 0,
        accessibility: audit.accessibilityScore || 0,
        seo: audit.seoScore || 0,
        bestPractices: audit.bestPracticesScore || 0,
      },
      metrics: {
        pagesCrawled: audit.pagesCrawled,
        linksChecked: audit.linksChecked,
        interactionsTested: audit.interactionsTested,
        totalIssues: audit.issuesFound,
      },
      executiveSummary:
        audit.aiAnalysis?.executiveSummary ||
        `Automated comprehensive technical audit completed for ${audit.website.name}.`,
      criticalObservations: criticalObs.length > 0 ? criticalObs : ['Review all high-severity issues.'],
      actionPlan: aiPlan,
      issues,
    });
  }
}

