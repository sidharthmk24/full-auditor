import * as crypto from 'crypto';
import * as dns from 'dns';
import * as urlModule from 'url';
import ipaddr from 'ipaddr.js';

export class SecurityUtils {
  /**
   * Validates if a URL is safe to crawl/fetch (blocks SSRF, private IPs, loopback, cloud metadata).
   */
  static async validateSafeUrl(targetUrl: string): Promise<{ isValid: boolean; reason?: string; resolvedIp?: string }> {
    try {
      const parsed = new urlModule.URL(targetUrl);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { isValid: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Block obvious local names
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
      ) {
        return { isValid: false, reason: 'Localhost or internal hostnames are prohibited' };
      }

      // Check if hostname is raw IP
      if (ipaddr.isValid(hostname)) {
        const addr = ipaddr.parse(hostname);
        if (this.isPrivateOrRestrictedIp(addr)) {
          return { isValid: false, reason: 'Private or restricted IP addresses are prohibited' };
        }
        return { isValid: true, resolvedIp: hostname };
      }

      // Resolve DNS to verify against DNS rebinding / private IP resolutions
      const lookupResult = await dns.promises.lookup(hostname, { all: true });
      if (!lookupResult || lookupResult.length === 0) {
        return { isValid: false, reason: 'Unable to resolve domain name in DNS' };
      }

      for (const entry of lookupResult) {
        const addr = ipaddr.parse(entry.address);
        if (this.isPrivateOrRestrictedIp(addr)) {
          return {
            isValid: false,
            reason: `Resolved IP (${entry.address}) is private, loopback, or cloud metadata`,
            resolvedIp: entry.address,
          };
        }
      }

      return { isValid: true, resolvedIp: lookupResult[0].address };
    } catch (err: any) {
      return { isValid: false, reason: `URL validation error: ${err.message}` };
    }
  }

  private static isPrivateOrRestrictedIp(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
    const range = addr.range();
    const restrictedRanges = [
      'loopback',
      'private',
      'linkLocal',
      'uniqueLocal',
      'carrierGradeNat',
      'broadcast',
      'reserved',
    ];

    if (restrictedRanges.includes(range)) {
      return true;
    }

    // AWS/GCP/Azure Cloud Metadata IP: 169.254.169.254
    const ipStr = addr.toString();
    if (ipStr.startsWith('169.254.') || ipStr === '0.0.0.0' || ipStr === '::' || ipStr === '127.0.0.1') {
      return true;
    }

    return false;
  }
}

export class UrlUtils {
  /**
   * Normalizes a URL for consistent crawling, deduplication, and comparisons.
   */
  static normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
    try {
      const url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);

      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }

      // Lowercase host and protocol
      url.protocol = url.protocol.toLowerCase();
      url.hostname = url.hostname.toLowerCase();

      // Strip common analytics and tracking query parameters
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'msclkid',
        'mc_cid',
        'mc_eid',
      ];
      trackingParams.forEach((param) => url.searchParams.delete(param));

      // Remove hash fragments
      url.hash = '';

      // Normalize trailing slash: retain trailing slash only on root path '/'
      let pathname = url.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      url.pathname = pathname;

      return url.toString();
    } catch {
      return null;
    }
  }

  /**
   * Extracts the primary normalized domain (e.g. "example.com" without www/port).
   */
  static extractDomain(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return rawUrl.toLowerCase();
    }
  }

  /**
   * Checks whether targetUrl belongs to the same origin/domain as baseUrl.
   */
  static isSameDomain(targetUrl: string, baseUrl: string): boolean {
    try {
      const targetDomain = this.extractDomain(targetUrl);
      const baseDomain = this.extractDomain(baseUrl);
      return targetDomain === baseDomain || targetDomain.endsWith(`.${baseDomain}`);
    } catch {
      return false;
    }
  }
}

export class HashUtils {
  /**
   * Generates a deterministic SHA-256 fingerprint for issues.
   */
  static generateFingerprint(parts: (string | number | undefined | null)[]): string {
    const raw = parts.filter(Boolean).join('|');
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
  }
}

