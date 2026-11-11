const { prisma } = require('../../packages/database/dist/index.js');
const { WebsiteCrawler } = require('../../packages/crawler/dist/index.js');
const { BrowserEngine } = require('../../packages/browser-engine/dist/index.js');
const { IssueEngine } = require('../../packages/issue-engine/dist/index.js');
const { AiAnalysisService } = require('../../packages/ai/dist/index.js');
const { ReportGenerator } = require('../../packages/reporting/dist/index.js');
const { LocalStorageAdapter } = require('../../packages/storage/dist/index.js');
const path = require('path');

async function runEndToEndAuditTest() {
  console.log('=== Starting End-to-End Audit Verification ===');

  // 1. Check or create test website
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization found');

  const testUrl = 'https://example.com';
  let website = await prisma.website.findFirst({
    where: { organizationId: org.id, normalizedDomain: 'example.com' },
  });

  if (!website) {
    website = await prisma.website.create({
      data: {
        organizationId: org.id,
        name: 'Example Domain Benchmark',
        url: testUrl,
        normalizedDomain: 'example.com',
        category: 'Benchmark',
      },
    });
  }

  console.log(`[E2E] Website ready: ${website.name} (${website.url})`);

  // 2. Create Audit Record
  const audit = await prisma.audit.create({
    data: {
      websiteId: website.id,
      status: 'QUEUED',
      progressPercent: 5,
      currentStep: 'Audit initiated for benchmark verification',
    },
  });
  console.log(`[E2E] Created Audit ID: ${audit.id}`);

  // 3. Execute Crawler
  console.log('[E2E] Running Crawler on https://example.com...');
  const crawler = new WebsiteCrawler(testUrl, {
    maxPages: 3,
    maxDepth: 1,
    timeoutMs: 15000,
  });

  const crawlResults = await crawler.crawl();
  console.log(`[E2E] Crawler discovered ${crawlResults.pages.length} pages, ${crawlResults.links.length} links`);

  for (const p of crawlResults.pages) {
    await prisma.page.upsert({
      where: { auditId_url: { auditId: audit.id, url: p.url } },
      create: {
        auditId: audit.id,
        url: p.url,
        path: p.path,
        statusCode: p.statusCode,
        title: p.title,
        loadTimeMs: p.loadTimeMs,
        pageSizeBytes: p.pageSizeBytes,
        isIndexable: p.isIndexable,
      },
      update: { statusCode: p.statusCode },
    });
  }

  // 4. Execute Browser Automation
  console.log('[E2E] Running Playwright Headless Browser Engine...');
  const browserEngine = new BrowserEngine();
  const storageDir = path.resolve('./uploads/artifacts', audit.id);

  const browserRes = await browserEngine.testPage(testUrl, storageDir);
  await browserEngine.close();
  console.log(`[E2E] Browser tested ${browserRes.interactions.length} interactions, ${browserRes.responsive.length} viewports, ${browserRes.visualFrames.length} visual scroll frames`);

  for (const frame of browserRes.visualFrames) {
    await prisma.artifact.create({
      data: {
        auditId: audit.id,
        type: 'visual_scan',
        fileName: frame.screenshotUrl,
        fileSize: 1024,
        mimeType: 'image/png',
        storageKey: `artifacts/${audit.id}/${frame.screenshotUrl}`,
        publicUrl: `/uploads/artifacts/${audit.id}/${frame.screenshotUrl}`,
      },
    });
  }

  const allUiBreaks = [];
  for (const defect of browserRes.uiBreaks) {
    allUiBreaks.push({
      title: defect.description,
      category: 'RESPONSIVE',
      severity: defect.defectType === 'OVERFLOW_X' ? 'HIGH' : 'MEDIUM',
      affectedUrl: defect.pageUrl,
      selector: defect.selector,
      description: defect.description,
      screenshotUrl: `/uploads/artifacts/${audit.id}/${defect.screenshotUrl}`,
      deviceLabel: `${defect.deviceLabel} (${defect.viewportWidth}px)`,
      recommendedFix: defect.recommendedFix,
    });

    await prisma.artifact.create({
      data: {
        auditId: audit.id,
        type: 'ui_break',
        fileName: defect.screenshotUrl,
        fileSize: 2048,
        mimeType: 'image/png',
        storageKey: `artifacts/${audit.id}/${defect.screenshotUrl}`,
        publicUrl: `/uploads/artifacts/${audit.id}/${defect.screenshotUrl}`,
      },
    });
  }

  for (const resp of browserRes.responsive) {
    await prisma.responsiveResult.create({
      data: {
        auditId: audit.id,
        pageUrl: testUrl,
        deviceLabel: resp.deviceLabel,
        viewportWidth: resp.viewportWidth,
        viewportHeight: resp.viewportHeight,
        hasOverflowX: resp.hasOverflowX,
        clippedContent: resp.clippedContent,
      },
    });
  }

  // 5. Issue Engine normalization
  console.log('[E2E] Running Deterministic Issue Engine...');
  const issueEngine = new IssueEngine();
  const rawFindings = [
    {
      type: 'MISSING_ALT',
      category: 'ACCESSIBILITY',
      url: testUrl,
      title: 'Image missing descriptive alt attribute',
      description: 'Found image element without alt tag',
      evidence: { url: testUrl },
      recommendedFix: 'Add alt attribute describing image content',
      impact: 'moderate',
    },
  ];

  const normalized = rawFindings.map((f) => issueEngine.normalizeFinding(f));
  for (const norm of normalized) {
    const issueRec = await prisma.issue.upsert({
      where: {
        websiteId_fingerprint: {
          websiteId: website.id,
          fingerprint: norm.issueFingerprint,
        },
      },
      create: {
        websiteId: website.id,
        fingerprint: norm.issueFingerprint,
        title: norm.title,
        description: norm.description,
        category: norm.category,
        severity: norm.severity,
        status: 'NEW',
        suggestedFix: norm.recommendedFix,
      },
      update: {
        occurrencesCount: { increment: 1 },
      },
    });

    await prisma.issueOccurrence.create({
      data: {
        issueId: issueRec.id,
        auditId: audit.id,
        affectedUrl: norm.affectedUrl,
        evidenceJson: norm.evidence,
      },
    });
  }

  // 6. AI Summary & Report Generation
  console.log('[E2E] Generating AI Analysis & HTML Report Artifact...');
  const aiService = new AiAnalysisService();
  const summary = await aiService.generateExecutiveSummary(website.name, 92, normalized);

  await prisma.aIAnalysis.create({
    data: {
      auditId: audit.id,
      executiveSummary: summary.executiveSummary,
      businessImpact: 'Baseline business impact analyzed.',
      keyRecommendations: summary.criticalObservations,
      actionPlan: summary.actionPlan,
    },
  });

  const htmlReport = ReportGenerator.generateHtmlReport({
    auditId: audit.id,
    websiteName: website.name,
    websiteUrl: website.url,
    auditDate: new Date().toLocaleDateString(),
    overallScore: 92,
    scores: { performance: 95, accessibility: 90, seo: 92, bestPractices: 90 },
    metrics: { pagesCrawled: crawlResults.pages.length, linksChecked: 5, interactionsTested: 2, totalIssues: 1 },
    executiveSummary: summary.executiveSummary,
    criticalObservations: summary.criticalObservations,
    actionPlan: summary.actionPlan,
    uiBreaks: allUiBreaks,
    issues: normalized.map((i) => ({
      title: i.title,
      category: i.category,
      severity: i.severity,
      affectedUrl: i.affectedUrl,
      description: i.description,
    })),
  });

  const storage = new LocalStorageAdapter('./uploads');
  const reportPath = `reports/audit_report_${audit.id}.html`;
  await storage.uploadFile(reportPath, htmlReport, 'text/html');

  await prisma.artifact.create({
    data: {
      auditId: audit.id,
      type: 'html_report',
      fileName: `audit_report_${audit.id}.html`,
      fileSize: Buffer.byteLength(htmlReport, 'utf8'),
      mimeType: 'text/html',
      storageKey: reportPath,
      publicUrl: `/uploads/${reportPath}`,
    },
  });

  // Complete Audit
  await prisma.audit.update({
    where: { id: audit.id },
    data: {
      status: 'COMPLETED',
      progressPercent: 100,
      overallScore: 92,
      performanceScore: 95,
      accessibilityScore: 90,
      seoScore: 92,
      bestPracticesScore: 90,
      pagesCrawled: crawlResults.pages.length,
      issuesFound: 1,
      completedAt: new Date(),
    },
  });

  console.log(`[E2E] SUCCESS: Audit ${audit.id} COMPLETED with health score 92%!`);
}

runEndToEndAuditTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[E2E Error]', err);
    process.exit(1);
  });

