import {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  NormalizedIssue,
} from '@auditor/contracts';
import { HashUtils } from '@auditor/shared';

export interface RawFinding {
  type: string;
  category: IssueCategory;
  url: string;
  selector?: string;
  title: string;
  description: string;
  evidence: Record<string, any>;
  recommendedFix: string;
  statusCode?: number;
  impact?: 'critical' | 'serious' | 'moderate' | 'minor';
}

export class IssueEngine {
  /**
   * Evaluates raw findings into normalized issues with deterministic severity and fingerprints.
   */
  public normalizeFinding(finding: RawFinding): NormalizedIssue {
    const severity = this.determineSeverity(finding);
    const fingerprint = this.computeFingerprint(finding);

    return {
      title: finding.title,
      description: finding.description,
      category: finding.category,
      severity,
      confidence: 1.0,
      affectedUrl: finding.url,
      elementSelector: finding.selector,
      evidence: finding.evidence,
      recommendedFix: finding.recommendedFix,
      issueFingerprint: fingerprint,
    };
  }

  /**
   * Deterministic rule matrix to assign issue severity based on evidence.
   */
  public determineSeverity(finding: RawFinding): IssueSeverity {
    // 1. Broken Links
    if (finding.category === IssueCategory.BROKEN_LINK) {
      if (finding.statusCode === 404 || finding.statusCode === 500) {
        // Internal broken links are High, external are Medium
        return finding.evidence?.isExternal ? IssueSeverity.MEDIUM : IssueSeverity.HIGH;
      }
      return IssueSeverity.LOW;
    }

    // 2. Functional & Interactions
    if (finding.category === IssueCategory.FUNCTIONAL) {
      if (finding.evidence?.outcome === 'CLICK_FAILED' || finding.evidence?.consoleErrors?.length > 0) {
        return IssueSeverity.HIGH;
      }
      return IssueSeverity.MEDIUM;
    }

    // 3. Network & Console
    if (finding.category === IssueCategory.NETWORK) {
      if (finding.statusCode && finding.statusCode >= 500) {
        return IssueSeverity.CRITICAL;
      }
      return IssueSeverity.HIGH;
    }

    // 4. Accessibility
    if (finding.category === IssueCategory.ACCESSIBILITY) {
      if (finding.impact === 'critical') return IssueSeverity.CRITICAL;
      if (finding.impact === 'serious') return IssueSeverity.HIGH;
      if (finding.impact === 'moderate') return IssueSeverity.MEDIUM;
      return IssueSeverity.LOW;
    }

    // 5. Responsive
    if (finding.category === IssueCategory.RESPONSIVE) {
      if (finding.evidence?.hasOverflowX) {
        return IssueSeverity.HIGH;
      }
      return IssueSeverity.MEDIUM;
    }

    // 6. SEO
    if (finding.category === IssueCategory.SEO) {
      if (finding.type === 'MISSING_TITLE' || finding.type === 'MISSING_H1') {
        return IssueSeverity.MEDIUM;
      }
      return IssueSeverity.LOW;
    }

    // 7. Performance
    if (finding.category === IssueCategory.PERFORMANCE) {
      const score = finding.evidence?.score;
      if (typeof score === 'number' && score < 50) return IssueSeverity.HIGH;
      if (typeof score === 'number' && score < 80) return IssueSeverity.MEDIUM;
      return IssueSeverity.LOW;
    }

    return IssueSeverity.INFORMATIONAL;
  }

  /**
   * Computes a deterministic SHA-256 fingerprint string.
   */
  public computeFingerprint(finding: RawFinding): string {
    return HashUtils.generateFingerprint([
      finding.category,
      finding.type,
      finding.url,
      finding.selector || '',
    ]);
  }

  /**
   * Compares the current audit issues against the previous audit baseline.
   */
  public reconcileAuditIssues(
    currentIssues: NormalizedIssue[],
    previousIssues: { fingerprint: string; status: IssueStatus }[]
  ): {
    newIssues: NormalizedIssue[];
    persistentIssues: NormalizedIssue[];
    resolvedFingerprints: string[];
  } {
    const prevMap = new Map(previousIssues.map((i) => [i.fingerprint, i.status]));
    const currentFingerprints = new Set(currentIssues.map((i) => i.issueFingerprint));

    const newIssues: NormalizedIssue[] = [];
    const persistentIssues: NormalizedIssue[] = [];

    for (const issue of currentIssues) {
      if (prevMap.has(issue.issueFingerprint)) {
        persistentIssues.push(issue);
      } else {
        newIssues.push(issue);
      }
    }

    const resolvedFingerprints: string[] = [];
    for (const [fingerprint, status] of prevMap.entries()) {
      if (!currentFingerprints.has(fingerprint) && status !== IssueStatus.RESOLVED) {
        resolvedFingerprints.push(fingerprint);
      }
    }

    return {
      newIssues,
      persistentIssues,
      resolvedFingerprints,
    };
  }
}

