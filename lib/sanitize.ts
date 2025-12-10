/**
 * HTML Content Sanitization Utility
 * 
 * Sanitizes HTML content to prevent XSS attacks while preserving
 * safe formatting elements from TinyMCE editor.
 * 
 * Requirements: 2.1, 5.2, 5.3
 */

// List of allowed HTML tags (safe for rendering)
const ALLOWED_TAGS = new Set([
  // Text formatting
  'p', 'br', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'sub', 'sup', 'mark',
  
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  
  // Lists
  'ul', 'ol', 'li',
  
  // Links and media
  'a', 'img',
  
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  
  // Code blocks
  'pre', 'code',
  
  // Quotes and sections
  'blockquote', 'hr', 'figure', 'figcaption',
]);

// List of allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  'a': new Set(['href', 'title', 'target', 'rel']),
  'img': new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  'code': new Set(['class', 'data-language']),
  'pre': new Set(['class', 'data-language']),
  'span': new Set(['class', 'style']),
  'div': new Set(['class', 'style']),
  'p': new Set(['class', 'style']),
  'table': new Set(['class', 'style']),
  'td': new Set(['class', 'style', 'colspan', 'rowspan']),
  'th': new Set(['class', 'style', 'colspan', 'rowspan', 'scope']),
  '*': new Set(['class', 'id']), // Global attributes
};

// Dangerous patterns to remove
const DANGEROUS_PATTERNS = [
  // Script tags and content
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers
  /\s*on\w+\s*=\s*["'][^"']*["']/gi,
  /\s*on\w+\s*=\s*[^\s>]+/gi,
  // JavaScript URLs
  /javascript\s*:/gi,
  // Data URLs (except images)
  /data\s*:\s*(?!image\/)/gi,
  // VBScript
  /vbscript\s*:/gi,
  // Expression (IE)
  /expression\s*\(/gi,
  // Style tags
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  // Object/embed/iframe tags
  /<object\b[^>]*>.*?<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<iframe\b[^>]*>.*?<\/iframe>/gi,
  // Form elements
  /<form\b[^>]*>.*?<\/form>/gi,
  /<input\b[^>]*>/gi,
  /<button\b[^>]*>.*?<\/button>/gi,
  // Meta and link tags
  /<meta\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  // Base tag
  /<base\b[^>]*>/gi,
];

/**
 * Check if a tag is allowed
 */
export function isAllowedTag(tagName: string): boolean {
  return ALLOWED_TAGS.has(tagName.toLowerCase());
}

/**
 * Check if an attribute is allowed for a given tag
 */
export function isAllowedAttribute(tagName: string, attrName: string): boolean {
  const tag = tagName.toLowerCase();
  const attr = attrName.toLowerCase();
  
  // Check tag-specific allowed attributes
  const tagAttrs = ALLOWED_ATTRIBUTES[tag];
  if (tagAttrs && tagAttrs.has(attr)) {
    return true;
  }
  
  // Check global attributes
  const globalAttrs = ALLOWED_ATTRIBUTES['*'];
  if (globalAttrs && globalAttrs.has(attr)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a URL is safe (not javascript:, vbscript:, etc.)
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return true;
  
  const trimmedUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (trimmedUrl.startsWith('javascript:')) return false;
  if (trimmedUrl.startsWith('vbscript:')) return false;
  if (trimmedUrl.startsWith('data:') && !trimmedUrl.startsWith('data:image/')) return false;
  
  return true;
}

/**
 * Sanitize an attribute value
 */
export function sanitizeAttributeValue(tagName: string, attrName: string, value: string): string | null {
  const attr = attrName.toLowerCase();
  
  // Check URL attributes
  if (attr === 'href' || attr === 'src') {
    if (!isSafeUrl(value)) {
      return null;
    }
  }
  
  // Check style attribute for dangerous patterns
  if (attr === 'style') {
    // Remove expression() and url() with javascript
    let sanitizedStyle = value
      .replace(/expression\s*\([^)]*\)/gi, '')
      .replace(/url\s*\(\s*["']?\s*javascript:[^)]*\)/gi, '');
    return sanitizedStyle;
  }
  
  return value;
}

/**
 * Remove dangerous patterns from HTML content
 */
export function removeDangerousPatterns(html: string): string {
  let result = html;
  
  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  return result;
}

/**
 * Escape special characters in attribute values for safe HTML output
 * This function is idempotent - already escaped entities are not double-escaped
 */
function escapeAttributeValue(value: string): string {
  // First, decode any existing HTML entities to normalize the input
  // Then re-encode to ensure consistent output
  let decoded = value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  // Now escape all special characters
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parse HTML tag with attributes, handling edge cases like > in attribute values
 */
function parseTag(tagString: string): { tagName: string; attributes: Map<string, string>; selfClosing: boolean } | null {
  // Remove < and > from the tag string
  const trimmed = tagString.trim();
  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
    return null;
  }
  
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return null;
  
  // Check for closing tag
  if (inner.startsWith('/')) {
    const tagName = inner.slice(1).trim().toLowerCase();
    return { tagName, attributes: new Map(), selfClosing: false };
  }
  
  // Check for self-closing
  const selfClosing = inner.endsWith('/');
  const content = selfClosing ? inner.slice(0, -1).trim() : inner;
  
  // Extract tag name
  const spaceIndex = content.search(/\s/);
  const tagName = (spaceIndex === -1 ? content : content.slice(0, spaceIndex)).toLowerCase();
  const attrString = spaceIndex === -1 ? '' : content.slice(spaceIndex);
  
  // Parse attributes
  const attributes = new Map<string, string>();
  const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi;
  let match;
  
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes.set(name, value);
  }
  
  return { tagName, attributes, selfClosing };
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * This function:
 * 1. Removes dangerous patterns (script tags, event handlers, etc.)
 * 2. Removes disallowed tags
 * 3. Removes disallowed attributes
 * 4. Sanitizes URL attributes
 * 
 * @param html - Raw HTML content from TinyMCE
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Step 1: Remove dangerous patterns
  let result = removeDangerousPatterns(html);
  
  // Step 2: Process tags and attributes using a more robust approach
  // This regex matches HTML tags more carefully, handling quoted attributes
  const tagRegex = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
  
  result = result.replace(tagRegex, (match, closing, tagName, attributes, selfClose) => {
    const tag = tagName.toLowerCase();
    
    // Remove disallowed tags entirely
    if (!isAllowedTag(tag)) {
      return '';
    }
    
    // For closing tags, just return the closing tag
    if (closing) {
      return `</${tag}>`;
    }
    
    // Parse and sanitize attributes
    const sanitizedAttrs: string[] = [];
    const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(attributes)) !== null) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      
      if (isAllowedAttribute(tag, attrName)) {
        const sanitizedValue = sanitizeAttributeValue(tag, attrName, attrValue);
        if (sanitizedValue !== null) {
          // Escape the attribute value to ensure idempotency
          const escapedValue = escapeAttributeValue(sanitizedValue);
          sanitizedAttrs.push(`${attrName.toLowerCase()}="${escapedValue}"`);
        }
      }
    }
    
    // Handle self-closing tags
    const isSelfClosing = selfClose === '/' || ['br', 'hr', 'img'].includes(tag);
    const attrsStr = sanitizedAttrs.length > 0 ? ' ' + sanitizedAttrs.join(' ') : '';
    
    return isSelfClosing ? `<${tag}${attrsStr} />` : `<${tag}${attrsStr}>`;
  });
  
  return result;
}

/**
 * Check if HTML content contains any dangerous patterns
 * 
 * @param html - HTML content to check
 * @returns true if content contains dangerous patterns
 */
export function containsDangerousContent(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false;
  }
  
  // Check for script tags
  if (/<script\b/i.test(html)) return true;
  
  // Check for event handlers
  if (/\s+on\w+\s*=/i.test(html)) return true;
  
  // Check for javascript: URLs
  if (/javascript\s*:/i.test(html)) return true;
  
  // Check for vbscript: URLs
  if (/vbscript\s*:/i.test(html)) return true;
  
  // Check for dangerous data: URLs
  if (/data\s*:\s*(?!image\/)/i.test(html)) return true;
  
  // Check for expression()
  if (/expression\s*\(/i.test(html)) return true;
  
  // Check for style tags
  if (/<style\b/i.test(html)) return true;
  
  // Check for iframe/object/embed
  if (/<(iframe|object|embed)\b/i.test(html)) return true;
  
  return false;
}

export default sanitizeHtml;
