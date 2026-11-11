import { chromium, Browser, BrowserContext, Page as PlaywrightPage } from 'playwright';
import { InteractionOutcome, NetworkErrorType } from '@auditor/contracts';
import { SecurityUtils } from '@auditor/shared';
import * as path from 'path';
import * as fs from 'fs';

export interface InteractionTestResult {
  pageUrl: string;
  elementLabel: string;
  elementTag: string;
  elementSelector: string;
  accessibleName?: string;
  outcome: InteractionOutcome;
  beforeUrl: string;
  afterUrl: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  executionTimeMs: number;
  consoleErrors: string[];
  networkErrors: string[];
  isWorking: boolean;
  notes?: string;
}

export interface FormInspectionResult {
  pageUrl: string;
  formSelector: string;
  actionUrl?: string;
  method: string;
  fieldsCount: number;
  requiredCount: number;
  hasValidLabels: boolean;
  hasSubmitButton: boolean;
  issues: string[];
}

export interface NetworkEventRecord {
  pageUrl: string;
  requestUrl: string;
  method: string;
  resourceType?: string;
  statusCode?: number;
  durationMs?: number;
  errorType: NetworkErrorType;
  errorMessage?: string;
}

export interface ConsoleEventRecord {
  pageUrl: string;
  level: string;
  message: string;
  source?: string;
  line?: number;
}

export interface ResponsiveInspectionResult {
  deviceLabel: string;
  viewportWidth: number;
  viewportHeight: number;
  hasOverflowX: boolean;
  clippedContent: boolean;
  screenshotUrl?: string;
}

export interface UIBreakageDefect {
  defectType: 'OVERFLOW_X' | 'BROKEN_MEDIA' | 'CLIPPED_TEXT' | 'LAYOUT_COLLISION';
  deviceLabel: string;
  viewportWidth: number;
  viewportHeight: number;
  pageUrl: string;
  selector: string;
  elementTag: string;
  description: string;
  screenshotUrl: string;
  scrollY: number;
  recommendedFix: string;
}

export interface VisualScrollFrame {
  step: number;
  scrollY: number;
  deviceLabel: string;
  viewportWidth: number;
  screenshotUrl: string;
}

export class BrowserEngine {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async testPage(
    url: string,
    storageDir: string,
    onProgress?: (step: string) => Promise<void> | void,
    onLiveFrame?: (data: { frameBase64: string; currentAction: string; scrollY?: number }) => Promise<void> | void
  ): Promise<{
    interactions: InteractionTestResult[];
    forms: FormInspectionResult[];
    networkEvents: NetworkEventRecord[];
    consoleEvents: ConsoleEventRecord[];
    responsive: ResponsiveInspectionResult[];
    uiBreaks: UIBreakageDefect[];
    visualFrames: VisualScrollFrame[];
    pageTitle?: string;
  }> {
    await this.init();

    await onProgress?.(`Opening ${url} in isolated browser context...`);

    const safe = await SecurityUtils.validateSafeUrl(url);
    if (!safe.isValid) {
      throw new Error(`SSRF safety violation: ${safe.reason}`);
    }

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const networkEvents: NetworkEventRecord[] = [];
    const consoleEvents: ConsoleEventRecord[] = [];
    const interactionResults: InteractionTestResult[] = [];
    const formResults: FormInspectionResult[] = [];
    const responsiveResults: ResponsiveInspectionResult[] = [];
    const uiBreaks: UIBreakageDefect[] = [];
    const visualFrames: VisualScrollFrame[] = [];

    // 1. Create an isolated browser context with exact Desktop width: 1440px
    const context: BrowserContext = await this.browser!.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AIAuditorBot/1.0',
      ignoreHTTPSErrors: true,
    });

    const page: PlaywrightPage = await context.newPage();

    // Helper to capture and emit live frame
    const broadcastLiveFrame = async (actionText: string, scrollY = 0) => {
      try {
        const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
        const base64 = 'data:image/jpeg;base64,' + buf.toString('base64');
        await onLiveFrame?.({ frameBase64: base64, currentAction: actionText, scrollY });
      } catch {
        // Ignore screenshot capture error during live stream
      }
    };

    // Listen to console events
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleEvents.push({
        pageUrl: url,
        level: type,
        message: text.substring(0, 500),
      });
    });

    // Listen to page errors
    page.on('pageerror', (err) => {
      consoleEvents.push({
        pageUrl: url,
        level: 'error',
        message: err.message.substring(0, 500),
      });
    });

    // Listen to network request failures
    page.on('requestfailed', (req) => {
      const failure = req.failure();
      const reqUrl = req.url();
      const cleanUrl = reqUrl.split('?')[0];
      networkEvents.push({
        pageUrl: url,
        requestUrl: cleanUrl,
        method: req.method(),
        resourceType: req.resourceType(),
        errorType: NetworkErrorType.NETWORK_FAILURE,
        errorMessage: failure ? failure.errorText : 'Request failed',
      });
    });

    // Listen to responses for 4xx and 5xx
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400) {
        const req = res.request();
        const errType = status >= 500 ? NetworkErrorType.SERVER_ERROR : NetworkErrorType.CLIENT_ERROR;
        networkEvents.push({
          pageUrl: url,
          requestUrl: req.url().split('?')[0],
          method: req.method(),
          resourceType: req.resourceType(),
          statusCode: status,
          errorType: errType,
          errorMessage: `HTTP ${status}`,
        });
      }
    });

    let pageTitle = '';

    try {
      await onProgress?.(`Navigating to ${url} on 1440px desktop viewport...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      pageTitle = await page.title();
      await page.waitForTimeout(600);

      // Broadcast initial loaded frame
      await broadcastLiveFrame(`Page loaded: ${pageTitle || url}`, 0);

      // =========================================================================
      // 2. AI-STYLE VISUAL SCROLL INSPECTOR (Desktop: 1440px)
      // =========================================================================
      await onProgress?.(`AI Visual Inspector: Initializing Desktop (1440px) visual traversal...`);
      await page.setViewportSize({ width: 1440, height: 900 });

      // Measure page dimensions
      const pageDimensions = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
          totalHeight: Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, 900),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          scrollWidth: doc.scrollWidth,
        };
      });

      const maxScroll = Math.max(0, pageDimensions.totalHeight - pageDimensions.viewportHeight);
      const scrollStepSize = 650;
      const totalSteps = maxScroll > 0 ? Math.min(Math.ceil(maxScroll / scrollStepSize) + 1, 6) : 1;

      for (let step = 0; step < totalSteps; step++) {
        const targetY = Math.min(step * scrollStepSize, maxScroll);

        // Smoothly scroll to next section
        await page.evaluate((y) => {
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, targetY);

        await page.waitForTimeout(450); // allow lazy images and layout transitions to settle

        const scrollProgressPct = maxScroll > 0 ? Math.round((targetY / maxScroll) * 100) : 100;
        const stepAction = `Scrolling through page section ${step + 1}/${totalSteps} (${scrollProgressPct}%, Y=${targetY}px)`;
        await onProgress?.(`AI Visual Inspector (1440px): ${stepAction}`);

        // Broadcast live frame to UI
        await broadcastLiveFrame(stepAction, targetY);

        // Capture visual frame for archive
        const frameFileName = `scroll_desktop_${step}_${Date.now()}.png`;
        const frameFilePath = path.join(storageDir, frameFileName);
        await page.screenshot({ path: frameFilePath, fullPage: false }).catch(() => {});

        if (fs.existsSync(frameFilePath)) {
          visualFrames.push({
            step: step + 1,
            scrollY: targetY,
            deviceLabel: 'Desktop',
            viewportWidth: 1440,
            screenshotUrl: frameFileName,
          });
        }

        // --- Active UI Breaking Detection in current scroll view ---
        const detectedDefects = await page.evaluate((currY) => {
          const defects: {
            defectType: 'OVERFLOW_X' | 'BROKEN_MEDIA' | 'CLIPPED_TEXT' | 'LAYOUT_COLLISION';
            selector: string;
            tag: string;
            description: string;
            recommendedFix: string;
          }[] = [];

          // 1. Check Document Horizontal Overflow
          if (document.documentElement.scrollWidth > window.innerWidth + 2) {
            const allElements = document.querySelectorAll('div, section, article, header, footer, table, img, pre');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth + 4 && rect.width > 20 && rect.height > 20) {
                const selector = el.id
                  ? `#${el.id}`
                  : `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
                defects.push({
                  defectType: 'OVERFLOW_X',
                  selector,
                  tag: el.tagName.toLowerCase(),
                  description: `Element "${selector}" extends to ${Math.round(rect.right)}px, exceeding the 1440px desktop boundary by ${Math.round(rect.right - window.innerWidth)}px`,
                  recommendedFix: 'Set max-width: 100%, adjust grid/flex bounds, or apply overflow-x: clip.',
                });
                break;
              }
            }
          }

          // 2. Check Broken Media (images with zero natural dimensions)
          const images = document.querySelectorAll('img');
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const rect = img.getBoundingClientRect();
            if (rect.top >= -100 && rect.bottom <= window.innerHeight + 100) {
              if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:image/svg')) {
                const selector = img.id ? `#${img.id}` : `img[src*="${img.src.split('/').pop()?.split('?')[0] || ''}"]`;
                defects.push({
                  defectType: 'BROKEN_MEDIA',
                  selector,
                  tag: 'img',
                  description: `Broken image detected: failed to render asset (${img.src.substring(0, 70)})`,
                  recommendedFix: 'Verify asset URL, server headers, and provide fallback src placeholder.',
                });
                break;
              }
            }
          }

          // 3. Check Clipped Text Elements
          const textNodes = document.querySelectorAll('h1, h2, h3, p, button, a.btn');
          for (let i = 0; i < textNodes.length; i++) {
            const el = textNodes[i] as HTMLElement;
            const rect = el.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
              const style = window.getComputedStyle(el);
              if (
                el.scrollWidth > el.clientWidth + 10 &&
                (style.overflow === 'hidden' || style.overflowX === 'hidden') &&
                style.textOverflow !== 'ellipsis'
              ) {
                const selector = el.id ? `#${el.id}` : el.tagName.toLowerCase();
                defects.push({
                  defectType: 'CLIPPED_TEXT',
                  selector,
                  tag: el.tagName.toLowerCase(),
                  description: `Text content in <${el.tagName.toLowerCase()}> is clipped without ellipsis truncation.`,
                  recommendedFix: 'Use text-overflow: ellipsis with white-space: nowrap or allow multi-line wrapping.',
                });
                break;
              }
            }
          }

          return defects;
        }, targetY);

        // If defects detected, annotate, broadcast live frame with annotation, and capture screenshot
        for (const defect of detectedDefects) {
          // Highlight defect on screen
          await page.evaluate((def) => {
            const el = document.querySelector(def.selector);
            if (el) {
              (el as HTMLElement).style.outline = '4px solid #ef4444';
              (el as HTMLElement).style.outlineOffset = '2px';
              (el as HTMLElement).style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.7)';

              const badge = document.createElement('div');
              badge.id = '__ui_defect_badge';
              badge.style.position = 'fixed';
              badge.style.top = '16px';
              badge.style.right = '16px';
              badge.style.zIndex = '999999';
              badge.style.background = '#ef4444';
              badge.style.color = '#ffffff';
              badge.style.fontFamily = 'monospace';
              badge.style.fontSize = '12px';
              badge.style.fontWeight = 'bold';
              badge.style.padding = '8px 14px';
              badge.style.borderRadius = '8px';
              badge.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)';
              badge.innerText = `⚠️ UI BREAK: ${def.defectType}`;
              document.body.appendChild(badge);
            }
          }, defect);

          await page.waitForTimeout(150);

          // Broadcast annotated defect frame live!
          await broadcastLiveFrame(`⚠️ Defect Detected: ${defect.description}`, targetY);

          const breakShotName = `ui_break_desktop_${defect.defectType.toLowerCase()}_${Date.now()}.png`;
          const breakShotPath = path.join(storageDir, breakShotName);
          await page.screenshot({ path: breakShotPath, fullPage: false }).catch(() => {});

          // Clean up annotation
          await page.evaluate((def) => {
            const el = document.querySelector(def.selector);
            if (el) {
              (el as HTMLElement).style.outline = '';
              (el as HTMLElement).style.outlineOffset = '';
              (el as HTMLElement).style.boxShadow = '';
            }
            const badge = document.getElementById('__ui_defect_badge');
            if (badge) badge.remove();
          }, defect);

          if (fs.existsSync(breakShotPath)) {
            uiBreaks.push({
              defectType: defect.defectType,
              deviceLabel: 'Desktop',
              viewportWidth: 1440,
              viewportHeight: 900,
              pageUrl: url,
              selector: defect.selector,
              elementTag: defect.tag,
              description: defect.description,
              screenshotUrl: breakShotName,
              scrollY: targetY,
              recommendedFix: defect.recommendedFix,
            });

            await onProgress?.(`⚠️ UI Defect Captured: ${defect.description}`);
          }
        }
      }

      // Reset scroll position to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);

      // =========================================================================
      // 3. RESPONSIVE MULTI-DEVICE VIEWPORT TESTING (Desktop 1440px, Tablet, Mobile)
      // =========================================================================
      const viewports = [
        { label: 'Desktop', width: 1440, height: 900 },
        { label: 'Tablet', width: 768, height: 1024 },
        { label: 'Mobile', width: 390, height: 844 },
      ];

      for (const vp of viewports) {
        await onProgress?.(`Inspecting layout on ${vp.label} (${vp.width}x${vp.height})...`);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(400);

        const overflowCheck = await page.evaluate((vpWidth) => {
          const doc = document.documentElement;
          const hasOverflow = doc.scrollWidth > vpWidth + 2;
          return {
            hasOverflow,
            scrollWidth: doc.scrollWidth,
          };
        }, vp.width);

        const shotName = `responsive_${vp.label.toLowerCase()}_${Date.now()}.png`;
        const shotPath = path.join(storageDir, shotName);
        await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});

        responsiveResults.push({
          deviceLabel: vp.label,
          viewportWidth: vp.width,
          viewportHeight: vp.height,
          hasOverflowX: overflowCheck.hasOverflow,
          clippedContent: false,
          screenshotUrl: fs.existsSync(shotPath) ? shotName : undefined,
        });

        if (overflowCheck.hasOverflow && vp.label !== 'Desktop') {
          const mobileBreakName = `ui_break_${vp.label.toLowerCase()}_overflow_${Date.now()}.png`;
          const mobileBreakPath = path.join(storageDir, mobileBreakName);
          await page.screenshot({ path: mobileBreakPath, fullPage: false }).catch(() => {});

          if (fs.existsSync(mobileBreakPath)) {
            uiBreaks.push({
              defectType: 'OVERFLOW_X',
              deviceLabel: vp.label,
              viewportWidth: vp.width,
              viewportHeight: vp.height,
              pageUrl: url,
              selector: 'html/body',
              elementTag: 'body',
              description: `Horizontal layout overflow on ${vp.label}: content width (${overflowCheck.scrollWidth}px) exceeds ${vp.width}px viewport`,
              screenshotUrl: mobileBreakName,
              scrollY: 0,
              recommendedFix: 'Add max-width: 100vw and overflow-x: hidden or make flexible elements wrap.',
            });
          }
        }
      }

      // Reset back to Desktop 1440px for interaction testing
      await page.setViewportSize({ width: 1440, height: 900 });

      // =========================================================================
      // 4. INSPECT FORMS NON-DESTRUCTIVELY
      // =========================================================================
      const forms = await page.$$('form');
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const formSelector = `form:nth-of-type(${i + 1})`;
        const fields = await form.$$('input, textarea, select');
        const submitBtn = await form.$('button[type="submit"], input[type="submit"], button:not([type])');

        let requiredCount = 0;
        let missingLabels = 0;
        const issues: string[] = [];

        for (const field of fields) {
          const isRequired = (await field.getAttribute('required')) !== null;
          if (isRequired) requiredCount++;

          const id = await field.getAttribute('id');
          const ariaLabel = await field.getAttribute('aria-label');
          const ariaLabelledBy = await field.getAttribute('aria-labelledby');

          let hasLabel = Boolean(ariaLabel || ariaLabelledBy);
          if (id && !hasLabel) {
            const label = await page.$(`label[for="${id}"]`);
            if (label) hasLabel = true;
          }

          const type = (await field.getAttribute('type')) || 'text';
          if (!hasLabel && !['hidden', 'submit', 'button', 'reset'].includes(type)) {
            missingLabels++;
          }
        }

        if (missingLabels > 0) {
          issues.push(`${missingLabels} form input(s) missing associated <label> or aria-label`);
        }
        if (!submitBtn) {
          issues.push('Form has no detectable submit button');
        }

        const action = (await form.getAttribute('action')) || undefined;
        const method = (await form.getAttribute('method')) || 'GET';

        formResults.push({
          pageUrl: url,
          formSelector,
          actionUrl: action,
          method: method.toUpperCase(),
          fieldsCount: fields.length,
          requiredCount,
          hasValidLabels: missingLabels === 0,
          hasSubmitButton: Boolean(submitBtn),
          issues,
        });
      }

      // =========================================================================
      // 5. DISCOVER & TEST INTERACTIVE ELEMENTS (BUTTONS, MODALS, ACCORDIONS)
      // =========================================================================
      const interactiveElements = await page.$$(
        'button, [role="button"], a.btn, a[class*="button"], summary, [data-toggle], [aria-expanded]'
      );

      const testLimit = Math.min(interactiveElements.length, 10);
      for (let i = 0; i < testLimit; i++) {
        const el = interactiveElements[i];

        try {
          const isVisible = await el.isVisible();
          const isEnabled = await el.isEnabled();
          if (!isVisible || !isEnabled) continue;

          const text = ((await el.innerText()) || (await el.getAttribute('aria-label')) || '').trim();
          const testMsg = `Testing interactive control ${i + 1}/${testLimit}: "${text ? text.substring(0, 30) : 'button'}"`;
          await onProgress?.(testMsg);
          await broadcastLiveFrame(testMsg);

          const tag = await el.evaluate((node) => node.tagName.toLowerCase());
          const selector = await el.evaluate((node) => {
            if (node.id) return `#${node.id}`;
            const cls =
              node.className && typeof node.className === 'string'
                ? `.${node.className.trim().split(/\s+/).join('.')}`
                : '';
            return `${node.tagName.toLowerCase()}${cls}`;
          });

          const lowerText = text.toLowerCase();
          if (
            ['log out', 'logout', 'sign out', 'delete', 'remove', 'pay', 'checkout', 'buy'].some((w) =>
              lowerText.includes(w)
            )
          ) {
            continue;
          }

          const beforeUrl = page.url();
          const beforeShotName = `before_${i}_${Date.now()}.png`;
          const beforeShotPath = path.join(storageDir, beforeShotName);
          await el.screenshot({ path: beforeShotPath }).catch(() => {});

          const startClick = Date.now();
          const elementErrors: string[] = [];

          const initialModalsCount = await page.$$eval(
            '[role="dialog"], .modal, [aria-modal="true"]',
            (els) => els.length
          );
          const initialExpanded = await el.getAttribute('aria-expanded');

          // Click element safely
          await el.click({ timeout: 4000 }).catch((e) => elementErrors.push(e.message));
          await page.waitForTimeout(600);

          // Broadcast post-interaction frame
          await broadcastLiveFrame(`Interacted with: "${text.substring(0, 30)}"`);

          const afterUrl = page.url();
          const afterShotName = `after_${i}_${Date.now()}.png`;
          const afterShotPath = path.join(storageDir, afterShotName);
          await page.screenshot({ path: afterShotPath, fullPage: false }).catch(() => {});

          const currentModalsCount = await page.$$eval(
            '[role="dialog"], .modal, [aria-modal="true"]',
            (els) => els.length
          );
          const afterExpanded = await el.getAttribute('aria-expanded');

          let outcome = InteractionOutcome.NO_OBSERVABLE_CHANGE;
          if (elementErrors.length > 0) {
            outcome = InteractionOutcome.CLICK_FAILED;
          } else if (afterUrl !== beforeUrl) {
            outcome = InteractionOutcome.NAVIGATION;
          } else if (currentModalsCount > initialModalsCount) {
            outcome = InteractionOutcome.MODAL_OPENED;
          } else if (initialExpanded !== afterExpanded && afterExpanded === 'true') {
            outcome = InteractionOutcome.ACCORDION_EXPANDED;
          }

          interactionResults.push({
            pageUrl: url,
            elementLabel: text.substring(0, 80) || `Element [${tag}]`,
            elementTag: tag,
            elementSelector: selector.substring(0, 150),
            outcome,
            beforeUrl,
            afterUrl,
            beforeScreenshot: fs.existsSync(beforeShotPath) ? beforeShotName : undefined,
            afterScreenshot: fs.existsSync(afterShotPath) ? afterShotName : undefined,
            executionTimeMs: Date.now() - startClick,
            consoleErrors: elementErrors,
            networkErrors: [],
            isWorking: outcome !== InteractionOutcome.CLICK_FAILED,
          });
        } catch {
          // Ignore individual interaction failure and continue
        }
      }
    } finally {
      await context.close();
    }

    return {
      interactions: interactionResults,
      forms: formResults,
      networkEvents,
      consoleEvents,
      responsive: responsiveResults,
      uiBreaks,
      visualFrames,
      pageTitle,
    };
  }
}
