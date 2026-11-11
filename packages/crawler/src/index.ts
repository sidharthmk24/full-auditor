import * as cheerio from 'cheerio';
import * as xml2js from 'xml2js';
import { SecurityUtils, UrlUtils } from '@auditor/shared';

export interface CrawlResult {
  pages: DiscoveredPage[];
  links: DiscoveredLink[];
  resources: DiscoveredResource[];
}

export interface DiscoveredPage {
  url: string;
  path: string;
  statusCode: number;
  title?: string;
  loadTimeMs: number;
  pageSizeBytes: number;
  isIndexable: boolean;
  hasSitemap: boolean;
}

export interface DiscoveredLink {
  sourceUrl: string;
  targetUrl: string;
  anchorText?: string;
  statusCode?: number;
  isExternal: boolean;
  isBroken: boolean;
  errorMessage?: string;
  durationMs?: number;
}

export interface DiscoveredResource {
  pageUrl: string;
  url: string;
  type: string;
  statusCode?: number;
  sizeBytes?: number;
  durationMs?: number;
  isThirdParty: boolean;
  errorMessage?: string;
}

export interface CrawlerConfig {
  maxPages: number;
  maxDepth: number;
  timeoutMs: number;
  crawlDelayMs?: number;
  excludedPatterns?: string[];
  onPageCrawled?: (page: DiscoveredPage, totalCrawled: number) => void;
}

export class WebsiteCrawler {
  private visitedUrls = new Set<string>();
  private discoveredPages: DiscoveredPage[] = [];
  private discoveredLinks: DiscoveredLink[] = [];
  private discoveredResources: DiscoveredResource[] = [];

  constructor(
    private readonly rootUrl: string,
    private readonly config: CrawlerConfig
  ) {}

  public async crawl(): Promise<CrawlResult> {
    const normalizedRoot = UrlUtils.normalizeUrl(this.rootUrl);
    if (!normalizedRoot) {
      throw new Error(`Invalid root URL: ${this.rootUrl}`);
    }

    const safeCheck = await SecurityUtils.validateSafeUrl(normalizedRoot);
    if (!safeCheck.isValid) {
      throw new Error(`SSRF safety violation for root URL: ${safeCheck.reason}`);
    }

    // Try discovering sitemaps
    const sitemapUrls = await this.discoverSitemap(normalizedRoot);

    // Queue of URLs with their depth
    const queue: { url: string; depth: number }[] = [{ url: normalizedRoot, depth: 0 }];

    // Pre-populate with up to 10 sitemap URLs if available within page limits
    for (const smUrl of sitemapUrls.slice(0, 10)) {
      if (smUrl !== normalizedRoot && UrlUtils.isSameDomain(smUrl, normalizedRoot)) {
        queue.push({ url: smUrl, depth: 1 });
      }
    }

    while (queue.length > 0 && this.discoveredPages.length < this.config.maxPages) {
      const item = queue.shift()!;
      const normUrl = UrlUtils.normalizeUrl(item.url);
      if (!normUrl || this.visitedUrls.has(normUrl) || item.depth > this.config.maxDepth) {
        continue;
      }

      if (this.isExcludedUrl(normUrl)) {
        continue;
      }

      this.visitedUrls.add(normUrl);

      // Re-validate SSRF on each URL
      const isSafe = await SecurityUtils.validateSafeUrl(normUrl);
      if (!isSafe.isValid) {
        continue;
      }

      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 30000);

        const response = await fetch(normUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'AIAuditorBot/1.0 (+https://websiteauditor.local/bot)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        clearTimeout(timeoutId);

        const durationMs = Date.now() - start;
        const statusCode = response.status;
        const html = await response.text();
        const pageSizeBytes = Buffer.byteLength(html, 'utf8');

        const parsedUrl = new URL(normUrl);
        const $ = cheerio.load(html);
        const title = $('title').text().trim() || undefined;

        // Check indexability
        const robotsMeta = $('meta[name="robots"]').attr('content') || '';
        const isIndexable = !robotsMeta.toLowerCase().includes('noindex');

        const page: DiscoveredPage = {
          url: normUrl,
          path: parsedUrl.pathname + parsedUrl.search,
          statusCode,
          title,
          loadTimeMs: durationMs,
          pageSizeBytes,
          isIndexable,
          hasSitemap: sitemapUrls.length > 0,
        };

        this.discoveredPages.push(page);
        if (this.config.onPageCrawled) {
          this.config.onPageCrawled(page, this.discoveredPages.length);
        }

        // Extract Links
        $('a[href]').each((_, el) => {
          const rawHref = $(el).attr('href');
          if (!rawHref) return;

          const anchorText = $(el).text().trim() || undefined;
          const targetUrl = UrlUtils.normalizeUrl(rawHref, normUrl);
          if (!targetUrl) return;

          const isExternal = !UrlUtils.isSameDomain(targetUrl, normalizedRoot);
          this.discoveredLinks.push({
            sourceUrl: normUrl,
            targetUrl,
            anchorText,
            isExternal,
            isBroken: false,
          });

          // Enqueue internal link if under depth
          if (!isExternal && !this.visitedUrls.has(targetUrl) && item.depth + 1 <= this.config.maxDepth) {
            queue.push({ url: targetUrl, depth: item.depth + 1 });
          }
        });

        // Extract Page Resources (img, script, link stylesheet)
        $('img[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) this.recordResource(normUrl, src, 'image', normalizedRoot);
        });

        $('script[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) this.recordResource(normUrl, src, 'script', normalizedRoot);
        });

        $('link[rel="stylesheet"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) this.recordResource(normUrl, href, 'stylesheet', normalizedRoot);
        });

        // Crawl delay to be polite
        if (this.config.crawlDelayMs) {
          await new Promise((r) => setTimeout(r, this.config.crawlDelayMs));
        }
      } catch (err: any) {
        this.discoveredPages.push({
          url: normUrl,
          path: new URL(normUrl).pathname,
          statusCode: 0,
          loadTimeMs: Date.now() - start,
          pageSizeBytes: 0,
          isIndexable: false,
          hasSitemap: false,
        });
      }
    }

    return {
      pages: this.discoveredPages,
      links: this.discoveredLinks,
      resources: this.discoveredResources,
    };
  }

  private recordResource(pageUrl: string, rawResourceUrl: string, type: string, rootUrl: string) {
    const fullUrl = UrlUtils.normalizeUrl(rawResourceUrl, pageUrl);
    if (!fullUrl) return;

    const isThirdParty = !UrlUtils.isSameDomain(fullUrl, rootUrl);
    this.discoveredResources.push({
      pageUrl,
      url: fullUrl,
      type,
      isThirdParty,
    });
  }

  private isExcludedUrl(urlStr: string): boolean {
    const lower = urlStr.toLowerCase();
    const sensitive = ['logout', 'signout', 'delete', 'destroy', 'checkout', 'pay', 'stripe', 'paypal'];
    if (sensitive.some((s) => lower.includes(s))) {
      return true;
    }

    if (this.config.excludedPatterns) {
      for (const pattern of this.config.excludedPatterns) {
        if (urlStr.includes(pattern)) return true;
      }
    }

    return false;
  }

  private async discoverSitemap(rootUrl: string): Promise<string[]> {
    try {
      const sitemapUrl = new URL('/sitemap.xml', rootUrl).toString();
      const res = await fetch(sitemapUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];

      const xml = await res.text();
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xml);

      const urls: string[] = [];
      if (result.urlset && Array.isArray(result.urlset.url)) {
        for (const u of result.urlset.url) {
          if (u.loc && u.loc[0]) {
            const loc = UrlUtils.normalizeUrl(u.loc[0]);
            if (loc) urls.push(loc);
          }
        }
      }
      return urls;
    } catch {
      return [];
    }
  }
}

