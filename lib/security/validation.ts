/**
 * Security Input Validation Utilities
 * Implements SSRF prevention, URL allowlist, and file type validation
 * Requirements: 3.3, 10.1, 10.2, 10.3
 */

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  error?: string;
}

/**
 * URL validation result
 */
export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Default allowed domains for external URL fetching
 * Can be extended via configuration
 */
const DEFAULT_ALLOWED_DOMAINS = [
  'imagekit.io',
  'ik.imagekit.io',
  'clerk.com',
  'img.clerk.com',
] as const;

/**
 * Internal/private IP ranges that should be blocked for SSRF prevention
 * Includes IPv4 and IPv6 private ranges
 */
const INTERNAL_IP_PATTERNS = [
  // IPv4 loopback
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private ranges (10.x.x.x)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private ranges (172.16.x.x - 172.31.x.x)
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private ranges (192.168.x.x)
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  // IPv4 link-local (169.254.x.x)
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  // IPv6 loopback
  /^::1$/,
  // IPv6 link-local
  /^fe80:/i,
  // IPv6 private
  /^fc00:/i,
  /^fd00:/i,
  // IPv4-mapped IPv6
  /^::ffff:127\./i,
  /^::ffff:10\./i,
  /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./i,
  /^::ffff:192\.168\./i,
];

/**
 * Hostnames that resolve to internal addresses
 */
const INTERNAL_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'local',
  '0.0.0.0',
  '[::1]',
  '[::0]',
];

/**
 * Check if an IP address is internal/private
 * Used for SSRF prevention
 * Requirements: 10.2
 * 
 * @param ip The IP address to check
 * @returns true if the IP is internal/private
 */
export function isInternalIP(ip: string): boolean {
  // Normalize the IP
  const normalizedIP = ip.trim().toLowerCase();
  
  // Check against internal hostname list
  if (INTERNAL_HOSTNAMES.includes(normalizedIP)) {
    return true;
  }
  
  // Check against IP patterns
  return INTERNAL_IP_PATTERNS.some(pattern => pattern.test(normalizedIP));
}

/**
 * Check if a URL's domain is in the allowlist
 * Requirements: 10.1
 * 
 * @param url The URL to check
 * @param allowedDomains Optional custom allowlist (defaults to DEFAULT_ALLOWED_DOMAINS)
 * @returns true if the domain is allowed
 */
export function isAllowedDomain(
  url: string,
  allowedDomains: readonly string[] = DEFAULT_ALLOWED_DOMAINS
): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    // Check if hostname matches any allowed domain (including subdomains)
    return allowedDomains.some(domain => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Validate a URL for safe external fetching
 * Checks for SSRF vulnerabilities and domain allowlist
 * Requirements: 10.1, 10.2, 10.3
 * 
 * @param url The URL to validate
 * @param allowedDomains Optional custom allowlist
 * @returns Validation result
 */
export function validateUrl(
  url: string,
  allowedDomains?: readonly string[]
): UrlValidationResult {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        valid: false,
        error: `Invalid protocol: ${parsed.protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }
    
    // Check for internal IP addresses (SSRF prevention)
    const hostname = parsed.hostname;
    if (isInternalIP(hostname)) {
      return {
        valid: false,
        error: 'Access to internal network addresses is not allowed.',
      };
    }
    
    // Check domain allowlist
    if (!isAllowedDomain(url, allowedDomains)) {
      return {
        valid: false,
        error: 'URL domain is not in the allowed list.',
      };
    }
    
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format.',
    };
  }
}

/**
 * Detect MIME type from file buffer using magic bytes
 * 
 * @param buffer The file buffer to analyze
 * @returns Detected MIME type or null if unknown
 */
function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 8) {
    return null;
  }
  
  // Check JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  
  // Check PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  
  // Check GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }
  
  // Check WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  
  // Check AVIF (ftyp box with avif/avis brand)
  if (buffer.length >= 12) {
    const ftypOffset = 4;
    if (
      buffer[ftypOffset] === 0x66 &&     // f
      buffer[ftypOffset + 1] === 0x74 && // t
      buffer[ftypOffset + 2] === 0x79 && // y
      buffer[ftypOffset + 3] === 0x70    // p
    ) {
      // Check for avif or avis brand
      const brandStr = buffer.slice(8, 12).toString('ascii').toLowerCase();
      if (brandStr === 'avif' || brandStr === 'avis' || brandStr === 'mif1') {
        return 'image/avif';
      }
    }
  }
  
  // Check SVG (text-based)
  const textStart = buffer.slice(0, 100).toString('utf8').trim().toLowerCase();
  if (textStart.startsWith('<?xml') || textStart.startsWith('<svg')) {
    return 'image/svg+xml';
  }
  
  // Check PDF
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }
  
  return null;
}

/**
 * Default allowed MIME types for file uploads
 */
export const DEFAULT_ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
] as const;

/**
 * Validate a file upload by checking content type via magic bytes
 * Requirements: 3.3
 * 
 * @param buffer The file buffer to validate
 * @param filename The original filename (used for extension check)
 * @param allowedTypes Array of allowed MIME types
 * @returns Validation result with detected MIME type
 */
export function validateFileUpload(
  buffer: Buffer,
  filename: string,
  allowedTypes: readonly string[] = DEFAULT_ALLOWED_FILE_TYPES
): FileValidationResult {
  // Detect actual MIME type from content
  const detectedMimeType = detectMimeType(buffer);
  
  if (!detectedMimeType) {
    return {
      valid: false,
      mimeType: 'unknown',
      error: 'Unable to determine file type. File may be corrupted or unsupported.',
    };
  }
  
  // Check if detected type is allowed
  if (!allowedTypes.includes(detectedMimeType)) {
    return {
      valid: false,
      mimeType: detectedMimeType,
      error: `File type '${detectedMimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  
  // Verify extension matches content (optional security check)
  const extension = filename.toLowerCase().split('.').pop() || '';
  const expectedExtensions = getExpectedExtensions(detectedMimeType);
  
  if (expectedExtensions.length > 0 && !expectedExtensions.includes(extension)) {
    return {
      valid: false,
      mimeType: detectedMimeType,
      error: `File extension '.${extension}' does not match content type '${detectedMimeType}'.`,
    };
  }
  
  return {
    valid: true,
    mimeType: detectedMimeType,
  };
}

/**
 * Get expected file extensions for a MIME type
 */
function getExpectedExtensions(mimeType: string): string[] {
  const mimeToExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/avif': ['avif'],
    'image/svg+xml': ['svg'],
    'application/pdf': ['pdf'],
  };
  
  return mimeToExtensions[mimeType] || [];
}

/**
 * Validate image URL format and destination
 * Requirements: 10.3
 * 
 * @param url The image URL to validate
 * @returns Validation result
 */
export function validateImageUrl(url: string): UrlValidationResult {
  const baseValidation = validateUrl(url);
  if (!baseValidation.valid) {
    return baseValidation;
  }
  
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    // Check for common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Also allow URLs without extensions (CDN URLs often don't have them)
    // But warn if the URL looks suspicious
    if (!hasImageExtension && pathname.includes('.')) {
      const extension = pathname.split('.').pop();
      const suspiciousExtensions = ['php', 'asp', 'aspx', 'jsp', 'cgi', 'exe', 'sh', 'bat'];
      if (extension && suspiciousExtensions.includes(extension)) {
        return {
          valid: false,
          error: `Suspicious file extension: .${extension}`,
        };
      }
    }
    
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format.',
    };
  }
}
