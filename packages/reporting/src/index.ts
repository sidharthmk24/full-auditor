export interface UIReportDefect {
  title: string;
  category: string;
  severity: string;
  affectedUrl: string;
  selector?: string;
  description: string;
  screenshotUrl?: string;
  deviceLabel?: string;
  recommendedFix?: string;
}

export interface AuditReportData {
  auditId: string;
  websiteName: string;
  websiteUrl: string;
  auditDate: string;
  overallScore: number;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  metrics: {
    pagesCrawled: number;
    linksChecked: number;
    interactionsTested: number;
    totalIssues: number;
  };
  executiveSummary: string;
  criticalObservations: string[];
  actionPlan: { step: number; action: string; expectedImpact: string }[];
  issues: {
    title: string;
    category: string;
    severity: string;
    affectedUrl: string;
    description: string;
    recommendedFix?: string;
    screenshotUrl?: string;
    selector?: string;
  }[];
  uiBreaks?: UIReportDefect[];
}

export class ReportGenerator {
  public static generateHtmlReport(data: AuditReportData): string {
    const issuesHtml = data.issues
      .map(
        (issue) => `
        <tr class="border-b border-slate-100">
          <td class="py-3 px-4 text-xs font-bold ${
            issue.severity === 'CRITICAL'
              ? 'text-red-600'
              : issue.severity === 'HIGH'
              ? 'text-amber-600'
              : 'text-slate-600'
          }">
            <span class="inline-block px-2 py-0.5 rounded text-xs ${
              issue.severity === 'CRITICAL'
                ? 'bg-red-50 text-red-700'
                : issue.severity === 'HIGH'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }">${issue.severity}</span>
          </td>
          <td class="py-3 px-4 text-xs font-medium text-slate-500">${issue.category}</td>
          <td class="py-3 px-4 text-sm font-semibold text-slate-900">
            <div>${issue.title}</div>
            <div class="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-md">${issue.affectedUrl}</div>
            ${
              issue.screenshotUrl
                ? `<div class="mt-2"><a href="${issue.screenshotUrl}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded transition">📸 View Annotated Screenshot</a></div>`
                : ''
            }
          </td>
          <td class="py-3 px-4 text-xs text-slate-600">${issue.recommendedFix || 'Inspect and fix'}</td>
        </tr>
      `
      )
      .join('');

    const actionPlanHtml = data.actionPlan
      .map(
        (plan) => `
        <div class="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 mb-3">
          <div class="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
            ${plan.step}
          </div>
          <div>
            <div class="text-sm font-bold text-slate-800">${plan.action}</div>
            <div class="text-xs text-slate-500 mt-1"><span class="font-semibold text-teal-700">Impact:</span> ${plan.expectedImpact}</div>
          </div>
        </div>
      `
      )
      .join('');

    const uiBreaksGalleryHtml =
      data.uiBreaks && data.uiBreaks.length > 0
        ? `
      <section class="space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              Visual UI Breakages & Layout Defect Gallery
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Detected by the AI visual inspector during smooth section-by-section viewport traversal. Annotated screenshots highlighting anomalies.
            </p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            ${data.uiBreaks.length} Visual Defect(s)
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${data.uiBreaks
            .map(
              (defect, idx) => `
            <div class="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div>
                <div class="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold px-2 py-0.5 bg-red-600 text-white rounded">
                      ${defect.deviceLabel || 'Desktop 1440px'}
                    </span>
                    <span class="text-xs font-mono font-bold text-red-900 truncate max-w-xs">
                      ${defect.selector || 'Element'}
                    </span>
                  </div>
                  <span class="text-[11px] font-bold text-red-700 uppercase">Defect #${idx + 1}</span>
                </div>
                
                ${
                  defect.screenshotUrl
                    ? `
                  <div class="bg-slate-950 p-2 flex justify-center border-b border-slate-200">
                    <a href="${defect.screenshotUrl}" target="_blank" title="Click to view full image">
                      <img src="${defect.screenshotUrl}" alt="UI Defect Screenshot" class="max-h-64 object-contain rounded border border-slate-800 hover:opacity-95 transition" />
                    </a>
                  </div>
                `
                    : ''
                }

                <div class="p-4 space-y-2">
                  <h4 class="text-sm font-bold text-slate-900">${defect.title}</h4>
                  <p class="text-xs text-slate-600 leading-relaxed">${defect.description}</p>
                </div>
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-100">
                <div class="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Recommended CSS Fix</div>
                <div class="text-xs text-slate-700 font-mono mt-1 bg-white p-2 rounded border border-slate-200">${defect.recommendedFix || 'Inspect container constraints.'}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
      `
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Audit Report - ${data.websiteName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased font-sans p-6 md:p-12">
  <div class="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <!-- Header -->
    <div class="bg-slate-900 text-white p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <div class="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-2">Automated Technical Audit Report</div>
        <h1 class="text-3xl font-extrabold text-white">${data.websiteName}</h1>
        <p class="text-sm text-slate-400 mt-1"><a href="${data.websiteUrl}" class="underline text-teal-300" target="_blank">${data.websiteUrl}</a></p>
      </div>
      <div class="text-left md:text-right">
        <div class="text-xs text-slate-400">Audit Completed</div>
        <div class="text-sm font-medium text-slate-200 mt-0.5">${data.auditDate}</div>
        <button onclick="window.print()" class="no-print mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition">
          Print / Save PDF
        </button>
      </div>
    </div>

    <!-- Scores Grid -->
    <div class="grid grid-cols-2 md:grid-cols-5 border-b border-slate-200 divide-x divide-slate-100 bg-slate-50/50">
      <div class="p-6 text-center">
        <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">Health Score</div>
        <div class="text-3xl font-black text-teal-600 mt-2">${Math.round(data.overallScore)}<span class="text-xs font-normal text-slate-400">/100</span></div>
      </div>
      <div class="p-6 text-center">
        <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">Performance</div>
        <div class="text-2xl font-bold text-slate-800 mt-2">${Math.round(data.scores.performance)}%</div>
      </div>
      <div class="p-6 text-center">
        <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">Accessibility</div>
        <div class="text-2xl font-bold text-slate-800 mt-2">${Math.round(data.scores.accessibility)}%</div>
      </div>
      <div class="p-6 text-center">
        <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">SEO</div>
        <div class="text-2xl font-bold text-slate-800 mt-2">${Math.round(data.scores.seo)}%</div>
      </div>
      <div class="p-6 text-center col-span-2 md:col-span-1">
        <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Issues</div>
        <div class="text-2xl font-bold text-slate-800 mt-2">${data.metrics.totalIssues}</div>
      </div>
    </div>

    <!-- Content Body -->
    <div class="p-8 md:p-10 space-y-10">
      <!-- Executive Summary -->
      <section>
        <h2 class="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Executive Summary</h2>
        <p class="text-sm text-slate-700 leading-relaxed">${data.executiveSummary}</p>
        
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          ${data.criticalObservations
            .map(
              (obs) => `
            <div class="flex items-start gap-2 text-xs bg-amber-50/80 border border-amber-200/60 p-3 rounded-lg text-amber-900">
              <span class="font-bold text-amber-600">•</span>
              <span>${obs}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </section>

      <!-- Action Plan -->
      <section>
        <h2 class="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Prioritized Action Plan</h2>
        <div>${actionPlanHtml}</div>
      </section>

      <!-- Visual UI Breakages Section (Annotated Screenshots) -->
      ${uiBreaksGalleryHtml}

      <!-- Issues Table -->
      <section>
        <h2 class="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Detected Issues & Findings</h2>
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
              <tr>
                <th class="py-3 px-4">Severity</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4">Issue & Route</th>
                <th class="py-3 px-4">Recommended Fix</th>
              </tr>
            </thead>
            <tbody>
              ${issuesHtml || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No issues detected!</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="border-t border-slate-200 p-6 bg-slate-50 text-center text-xs text-slate-400">
      Generated automatically by AI Website Auditor • Visual Inspection & Responsive Diagnostics
    </div>
  </div>
</body>
</html>`;
  }
}
