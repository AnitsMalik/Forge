import { URL } from 'url';

/**
 * SSRF Defense Validator
 * Prevents requests to internal localhost, RFC 1918 private subnets,
 * and link-local cloud metadata endpoints (e.g., 169.254.169.254).
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'metadata.google.internal',
]);

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) return true;

  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 127.0.0.0 - 127.255.255.255
  if (parts[0] === 127) return true;

  // 169.254.0.0 - 169.254.255.255 (Cloud instance metadata service)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0
  if (parts[0] === 0) return true;

  return false;
}

export interface SsrValidationResult {
  isSafe: boolean;
  reason?: string;
  normalizedUrl?: string;
}

export function validateSafeUrl(rawUrl: string): SsrValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isSafe: false, reason: 'URL string is required' };
  }

  try {
    const parsed = new URL(rawUrl.trim());

    // Only HTTP and HTTPS protocols are permitted
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isSafe: false,
        reason: `Disallowed protocol '${parsed.protocol}'. Only http: and https: are permitted.`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check against forbidden hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return {
        isSafe: false,
        reason: `Target hostname '${hostname}' is restricted for security (SSRF prevention).`,
      };
    }

    // Check IP addresses directly
    if (isPrivateIp(hostname)) {
      return {
        isSafe: false,
        reason: `Target IP address '${hostname}' belongs to a private/internal network (SSRF prevention).`,
      };
    }

    // Check for hex/octal representations (e.g. 0x7f000001, 2130706433)
    if (/^\d+$/.test(hostname) || /^0x[0-9a-fA-F]+$/.test(hostname)) {
      return {
        isSafe: false,
        reason: `Numeric/hexadecimal host representations are restricted.`,
      };
    }

    return {
      isSafe: true,
      normalizedUrl: parsed.toString(),
    };
  } catch (err: any) {
    return {
      isSafe: false,
      reason: `Malformed URL: ${err.message}`,
    };
  }
}

export function assertSafeUrl(rawUrl: string): string {
  const result = validateSafeUrl(rawUrl);
  if (!result.isSafe) {
    throw new Error(`SSRF Security Guard: ${result.reason}`);
  }
  return result.normalizedUrl!;
}
