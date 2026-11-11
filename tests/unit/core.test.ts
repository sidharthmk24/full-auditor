import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { SecurityUtils, UrlUtils, HashUtils } from '../../packages/shared/dist/index.js';
import { IssueEngine } from '../../packages/issue-engine/dist/index.js';
import { IssueCategory, IssueSeverity } from '../../packages/contracts/dist/index.js';
import { ReportGenerator } from '../../packages/reporting/dist/index.js';

describe('Security & SSRF Protection', () => {
  it('should reject localhost and 127.0.0.1', async () => {
    const resLocalhost = await SecurityUtils.validateSafeUrl('http://localhost:3000');
    assert.strictEqual(resLocalhost.isValid, false);

    const resIp = await SecurityUtils.validateSafeUrl('http://127.0.0.1:8080');
    assert.strictEqual(resIp.isValid, false);
  });

  it('should reject AWS/Cloud metadata IP 169.254.169.254', async () => {
    const res = await SecurityUtils.validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    assert.strictEqual(res.isValid, false);
  });

  it('should reject non-HTTP protocols', async () => {
    const res = await SecurityUtils.validateSafeUrl('file:///etc/passwd');
    assert.strictEqual(res.isValid, false);
  });

  it('should allow valid public domains', async () => {
    const res = await SecurityUtils.validateSafeUrl('https://example.com');
    assert.strictEqual(res.isValid, true);
  });
});

describe('URL Normalizer', () => {
  it('should strip tracking parameters and normalize trailing slashes', () => {
    const input = 'https://EXAMPLE.com/pricing/?utm_source=twitter&utm_medium=cpc#reviews';
    const normalized = UrlUtils.normalizeUrl(input);
    assert.strictEqual(normalized, 'https://example.com/pricing');
  });

  it('should extract canonical primary domain', () => {
    assert.strictEqual(UrlUtils.extractDomain('https://www.example.com/blog'), 'example.com');
    assert.strictEqual(UrlUtils.extractDomain('https://app.megamind.studio/dash'), 'app.megamind.studio');
  });
});

describe('Issue Engine & Fingerprinting', () => {
  const engine = new IssueEngine();

  it('should deterministically assign High severity to broken links', () => {
    const finding = {
      type: 'BROKEN_LINK',
      category: IssueCategory.BROKEN_LINK,
      url: 'https://example.com/services',
      title: 'Broken link',
      description: '404 Not Found',
      evidence: { statusCode: 404, isExternal: false },
      recommendedFix: 'Fix link',
      statusCode: 404,
    };

    const norm = engine.normalizeFinding(finding);
    assert.strictEqual(norm.severity, IssueSeverity.HIGH);
    assert.ok(norm.issueFingerprint.length >= 16);
  });

  it('should compute consistent deterministic fingerprints for duplicate issues', () => {
    const fp1 = HashUtils.generateFingerprint(['BROKEN_LINK', '404', 'https://example.com/missing', 'a#btn']);
    const fp2 = HashUtils.generateFingerprint(['BROKEN_LINK', '404', 'https://example.com/missing', 'a#btn']);
    assert.strictEqual(fp1, fp2);
  });
});

describe('Report Generator', () => {
  it('should generate complete HTML audit report with scores and issues', () => {
    const html = ReportGenerator.generateHtmlReport({
      auditId: 'test-123',
      websiteName: 'Acme Test Corp',
      websiteUrl: 'https://example.com',
      auditDate: '11/6/2026',
      overallScore: 88,
      scores: { performance: 90, accessibility: 85, seo: 92, bestPractices: 85 },
      metrics: { pagesCrawled: 15, linksChecked: 45, interactionsTested: 8, totalIssues: 2 },
      executiveSummary: 'Acme Test Corp demonstrates strong overall stability.',
      criticalObservations: ['No critical vulnerabilities found.'],
      actionPlan: [{ step: 1, action: 'Update broken links', expectedImpact: 'Improve UX' }],
      issues: [
        {
          title: 'Missing Image Alt Attribute',
          category: 'ACCESSIBILITY',
          severity: 'MEDIUM',
          affectedUrl: 'https://example.com/about',
          description: 'Image missing alt text tag',
          recommendedFix: 'Add descriptive alt attribute',
        },
      ],
    });

    assert.ok(html.includes('Acme Test Corp'));
    assert.ok(html.includes('88'));
    assert.ok(html.includes('Missing Image Alt Attribute'));
  });

  it('should render Visual UI Breakages & Layout Defect Gallery with screenshot and annotations', () => {
    const htmlWithDefects = ReportGenerator.generateHtmlReport({
      auditId: 'test-audit-ui-break',
      websiteName: 'Broken Layout Corp',
      websiteUrl: 'https://example.com',
      auditDate: '11/06/2026',
      overallScore: 65,
      scores: { performance: 80, accessibility: 70, seo: 75, bestPractices: 80 },
      metrics: { pagesCrawled: 5, linksChecked: 20, interactionsTested: 5, totalIssues: 3 },
      executiveSummary: 'Layout overflows observed across 1440px desktop viewports.',
      criticalObservations: ['Horizontal layout overflow detected on Desktop (1440px).'],
      actionPlan: [{ step: 1, action: 'Apply max-width constraints', expectedImpact: 'Prevent horizontal scroll' }],
      issues: [
        {
          title: 'Visual UI Break: Element overflows 1440px desktop viewport',
          category: 'RESPONSIVE',
          severity: 'HIGH',
          affectedUrl: 'https://example.com',
          description: 'Element extends 120px past 1440px viewport',
          screenshotUrl: '/uploads/artifacts/test-audit-ui-break/ui_break_desktop_overflow.png',
          recommendedFix: 'Set max-width: 100% and overflow-x: clip',
        },
      ],
      uiBreaks: [
        {
          title: 'Element horizontally overflows 1440px desktop viewport',
          category: 'RESPONSIVE',
          severity: 'HIGH',
          affectedUrl: 'https://example.com',
          selector: '.hero-container.wide-banner',
          description: 'Element extends 120px beyond desktop boundary',
          screenshotUrl: '/uploads/artifacts/test-audit-ui-break/ui_break_desktop_overflow.png',
          deviceLabel: 'Desktop 1440px',
          recommendedFix: 'Set max-width: 100% and adjust CSS grid container bounds.',
        },
      ],
    });

    assert.ok(htmlWithDefects.includes('Visual UI Breakages & Layout Defect Gallery'));
    assert.ok(htmlWithDefects.includes('ui_break_desktop_overflow.png'));
    assert.ok(htmlWithDefects.includes('.hero-container.wide-banner'));
    assert.ok(htmlWithDefects.includes('Desktop 1440px'));
    assert.ok(htmlWithDefects.includes('Set max-width: 100% and adjust CSS grid container bounds.'));
  });
});

