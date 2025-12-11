/**
 * Property-Based Tests for HTML Sanitization
 *
 * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
 * **Validates: Requirements 3.2**
 *
 * Property: For any HTML input containing XSS patterns (script tags, event handlers,
 * javascript: URLs), the sanitized output SHALL NOT contain any of those dangerous patterns.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeHtml, containsDangerousContent, removeDangerousPatterns } from './sanitize';

// ============================================================================
// Arbitraries for generating XSS payloads
// ============================================================================

// Script tag variations
const scriptTagArb = fc.oneof(
  fc.constant('<script>alert("xss")</script>'),
  fc.constant('<script src="evil.js"></script>'),
  fc.constant('<SCRIPT>alert(1)</SCRIPT>'),
  fc.constant('<script type="text/javascript">document.cookie</script>'),
  fc.constant('<script>eval(atob("YWxlcnQoMSk="))</script>'),
  fc.constant('<script\n>alert(1)</script>'),
  fc.constant('<script\t>alert(1)</script>'),
  fc.constant('<script/>'),
  fc.constant('<script >alert(1)</script >'),
);

// Event handler variations
const eventHandlerArb = fc.oneof(
  fc.constant('<img src="x" onerror="alert(1)">'),
  fc.constant('<div onmouseover="alert(1)">hover</div>'),
  fc.constant('<body onload="alert(1)">'),
  fc.constant('<input onfocus="alert(1)">'),
  fc.constant('<a onclick="alert(1)">click</a>'),
  fc.constant('<img src=x ONERROR=alert(1)>'),
  fc.constant('<div ONMOUSEOVER="alert(1)">'),
  fc.constant('<svg onload="alert(1)">'),
  fc.constant('<img src="x" onerror = "alert(1)">'),
  fc.constant('<div onmouseover=alert(1)>'),
);

// JavaScript URL variations
const javascriptUrlArb = fc.oneof(
  fc.constant('<a href="javascript:alert(1)">click</a>'),
  fc.constant('<a href="JAVASCRIPT:alert(1)">click</a>'),
  fc.constant('<a href="javascript:void(0)">click</a>'),
  fc.constant('<a href="  javascript:alert(1)">click</a>'),
  fc.constant('<iframe src="javascript:alert(1)">'),
  fc.constant('<img src="javascript:alert(1)">'),
);

// VBScript URL variations
const vbscriptUrlArb = fc.oneof(
  fc.constant('<a href="vbscript:msgbox(1)">click</a>'),
  fc.constant('<a href="VBSCRIPT:msgbox(1)">click</a>'),
);

// Data URL variations (non-image)
const dangerousDataUrlArb = fc.oneof(
  fc.constant('<a href="data:text/html,<script>alert(1)</script>">click</a>'),
  fc.constant('<iframe src="data:text/html,<script>alert(1)</script>">'),
  fc.constant('<object data="data:text/html,<script>alert(1)</script>">'),
);

// Style tag variations
const styleTagArb = fc.oneof(
  fc.constant('<style>body{background:url("javascript:alert(1)")}</style>'),
  fc.constant('<STYLE>@import "evil.css";</STYLE>'),
  fc.constant('<style type="text/css">*{color:red}</style>'),
);

// SVG with script
const svgXssArb = fc.oneof(
  fc.constant('<svg><script>alert(1)</script></svg>'),
  fc.constant('<svg onload="alert(1)">'),
  fc.constant('<svg><animate onbegin="alert(1)"/></svg>'),
);

// Iframe/Object/Embed variations
const embeddedContentArb = fc.oneof(
  fc.constant('<iframe src="evil.html"></iframe>'),
  fc.constant('<object data="evil.swf"></object>'),
  fc.constant('<embed src="evil.swf">'),
  fc.constant('<IFRAME SRC="javascript:alert(1)"></IFRAME>'),
);

// Form elements (can be used for phishing)
const formElementArb = fc.oneof(
  fc.constant('<form action="evil.php"><input type="submit"></form>'),
  fc.constant('<input type="text" onfocus="alert(1)">'),
  fc.constant('<button onclick="alert(1)">click</button>'),
  fc.constant('<textarea onfocus="alert(1)">'),
  fc.constant('<select onchange="alert(1)"><option>1</option></select>'),
);

// Meta/Link/Base tags
const metaTagArb = fc.oneof(
  fc.constant('<meta http-equiv="refresh" content="0;url=evil.html">'),
  fc.constant('<link rel="stylesheet" href="evil.css">'),
  fc.constant('<base href="http://evil.com/">'),
);

// Expression (IE CSS)
const expressionArb = fc.oneof(
  fc.constant('<div style="width:expression(alert(1))">'),
  fc.constant('<span style="background:expression(alert(1))">'),
);

// Behavior/Binding (IE/Firefox)
const behaviorArb = fc.oneof(
  fc.constant('<div style="behavior:url(evil.htc)">'),
  fc.constant('<div style="-moz-binding:url(evil.xml#xss)">'),
);

// Template tags
const templateTagArb = fc.oneof(
  fc.constant('<template><script>alert(1)</script></template>'),
  fc.constant('<template id="xss"><img src=x onerror=alert(1)></template>'),
);

// Audio/Video tags
const mediaTagArb = fc.oneof(
  fc.constant('<audio src="evil.mp3" onloadstart="alert(1)">'),
  fc.constant('<video src="evil.mp4" onloadstart="alert(1)">'),
  fc.constant('<source src="evil.mp3" onerror="alert(1)">'),
);

// Legacy dangerous tags
const legacyTagArb = fc.oneof(
  fc.constant('<marquee onstart="alert(1)">text</marquee>'),
  fc.constant('<bgsound src="evil.mid">'),
  fc.constant('<blink>text</blink>'),
  fc.constant('<applet code="evil.class">'),
);

// All XSS payloads combined
const xssPayloadArb = fc.oneof(
  scriptTagArb,
  eventHandlerArb,
  javascriptUrlArb,
  vbscriptUrlArb,
  dangerousDataUrlArb,
  styleTagArb,
  svgXssArb,
  embeddedContentArb,
  formElementArb,
  metaTagArb,
  expressionArb,
  behaviorArb,
  templateTagArb,
  mediaTagArb,
  legacyTagArb,
);

// Safe HTML content
const safeHtmlArb = fc.oneof(
  fc.constant('<p>Hello World</p>'),
  fc.constant('<strong>Bold text</strong>'),
  fc.constant('<em>Italic text</em>'),
  fc.constant('<a href="https://example.com">Link</a>'),
  fc.constant('<img src="https://example.com/image.jpg" alt="Image">'),
  fc.constant('<ul><li>Item 1</li><li>Item 2</li></ul>'),
  fc.constant('<h1>Heading</h1>'),
  fc.constant('<blockquote>Quote</blockquote>'),
  fc.constant('<code>const x = 1;</code>'),
  fc.constant('<table><tr><td>Cell</td></tr></table>'),
);

// ============================================================================
// Helper functions for checking dangerous patterns
// ============================================================================

function containsScriptTag(html: string): boolean {
  return /<script\b/i.test(html);
}

function containsEventHandler(html: string): boolean {
  // Match on* attributes with = sign
  return /\s+on\w+\s*=/i.test(html);
}

function containsJavascriptUrl(html: string): boolean {
  return /javascript\s*:/i.test(html);
}

function containsVbscriptUrl(html: string): boolean {
  return /vbscript\s*:/i.test(html);
}

function containsDangerousDataUrl(html: string): boolean {
  return /data\s*:\s*(?!image\/)/i.test(html);
}

function containsStyleTag(html: string): boolean {
  return /<style\b/i.test(html);
}

function containsSvgTag(html: string): boolean {
  return /<svg\b/i.test(html);
}

function containsIframeTag(html: string): boolean {
  return /<iframe\b/i.test(html);
}

function containsObjectTag(html: string): boolean {
  return /<object\b/i.test(html);
}

function containsEmbedTag(html: string): boolean {
  return /<embed\b/i.test(html);
}

function containsFormElement(html: string): boolean {
  return /<(form|input|button|textarea|select)\b/i.test(html);
}

function containsMetaTag(html: string): boolean {
  return /<(meta|link|base)\b/i.test(html);
}

function containsExpression(html: string): boolean {
  return /expression\s*\(/i.test(html);
}

function containsBehavior(html: string): boolean {
  return /behavior\s*:/i.test(html) || /-moz-binding\s*:/i.test(html);
}

function containsTemplateTag(html: string): boolean {
  return /<template\b/i.test(html);
}

function containsMediaTag(html: string): boolean {
  return /<(audio|video|source|track)\b/i.test(html);
}

function containsLegacyTag(html: string): boolean {
  return /<(marquee|bgsound|blink|applet)\b/i.test(html);
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 3: HTML Sanitization Completeness', () => {
  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing script tags, the sanitized output
   * SHALL NOT contain script tags.
   */
  it('removes all script tags from HTML', () => {
    fc.assert(
      fc.property(scriptTagArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsScriptTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing event handlers (on* attributes),
   * the sanitized output SHALL NOT contain event handlers.
   */
  it('removes all event handlers from HTML', () => {
    fc.assert(
      fc.property(eventHandlerArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsEventHandler(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing javascript: URLs,
   * the sanitized output SHALL NOT contain javascript: URLs.
   */
  it('removes all javascript: URLs from HTML', () => {
    fc.assert(
      fc.property(javascriptUrlArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsJavascriptUrl(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing vbscript: URLs,
   * the sanitized output SHALL NOT contain vbscript: URLs.
   */
  it('removes all vbscript: URLs from HTML', () => {
    fc.assert(
      fc.property(vbscriptUrlArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsVbscriptUrl(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing dangerous data: URLs (non-image),
   * the sanitized output SHALL NOT contain those data: URLs.
   */
  it('removes dangerous data: URLs from HTML', () => {
    fc.assert(
      fc.property(dangerousDataUrlArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsDangerousDataUrl(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing style tags,
   * the sanitized output SHALL NOT contain style tags.
   */
  it('removes all style tags from HTML', () => {
    fc.assert(
      fc.property(styleTagArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsStyleTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing SVG tags,
   * the sanitized output SHALL NOT contain SVG tags.
   */
  it('removes all SVG tags from HTML', () => {
    fc.assert(
      fc.property(svgXssArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsSvgTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing iframe/object/embed tags,
   * the sanitized output SHALL NOT contain those tags.
   */
  it('removes all iframe/object/embed tags from HTML', () => {
    fc.assert(
      fc.property(embeddedContentArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsIframeTag(sanitized)).toBe(false);
        expect(containsObjectTag(sanitized)).toBe(false);
        expect(containsEmbedTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing form elements,
   * the sanitized output SHALL NOT contain form elements.
   */
  it('removes all form elements from HTML', () => {
    fc.assert(
      fc.property(formElementArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsFormElement(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing meta/link/base tags,
   * the sanitized output SHALL NOT contain those tags.
   */
  it('removes all meta/link/base tags from HTML', () => {
    fc.assert(
      fc.property(metaTagArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsMetaTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing CSS expression(),
   * the sanitized output SHALL NOT contain expression().
   */
  it('removes all CSS expression() from HTML', () => {
    fc.assert(
      fc.property(expressionArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsExpression(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing behavior:/moz-binding:,
   * the sanitized output SHALL NOT contain those patterns.
   */
  it('removes all behavior/moz-binding from HTML', () => {
    fc.assert(
      fc.property(behaviorArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsBehavior(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing template tags,
   * the sanitized output SHALL NOT contain template tags.
   */
  it('removes all template tags from HTML', () => {
    fc.assert(
      fc.property(templateTagArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsTemplateTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing audio/video/source/track tags,
   * the sanitized output SHALL NOT contain those tags.
   */
  it('removes all media tags from HTML', () => {
    fc.assert(
      fc.property(mediaTagArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsMediaTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any HTML containing legacy dangerous tags,
   * the sanitized output SHALL NOT contain those tags.
   */
  it('removes all legacy dangerous tags from HTML', () => {
    fc.assert(
      fc.property(legacyTagArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsLegacyTag(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any XSS payload, the sanitized output SHALL NOT
   * be flagged as dangerous by containsDangerousContent().
   */
  it('sanitized output passes containsDangerousContent check', () => {
    fc.assert(
      fc.property(xssPayloadArb, (xssPayload: string) => {
        const sanitized = sanitizeHtml(xssPayload);
        expect(containsDangerousContent(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: For any safe HTML content, the sanitized output SHALL
   * preserve the essential structure.
   */
  it('preserves safe HTML content', () => {
    fc.assert(
      fc.property(safeHtmlArb, (safeHtml: string) => {
        const sanitized = sanitizeHtml(safeHtml);
        // Safe content should not be empty after sanitization
        expect(sanitized.length).toBeGreaterThan(0);
        // Safe content should not be flagged as dangerous
        expect(containsDangerousContent(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: Sanitization is idempotent - sanitizing twice produces
   * the same result as sanitizing once.
   */
  it('sanitization is idempotent', () => {
    fc.assert(
      fc.property(
        fc.oneof(xssPayloadArb, safeHtmlArb),
        (html: string) => {
          const sanitizedOnce = sanitizeHtml(html);
          const sanitizedTwice = sanitizeHtml(sanitizedOnce);
          expect(sanitizedTwice).toBe(sanitizedOnce);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: XSS payloads embedded in safe HTML are still removed.
   */
  it('removes XSS payloads embedded in safe HTML', () => {
    const embeddedXssArb = fc.tuple(safeHtmlArb, xssPayloadArb, safeHtmlArb)
      .map(([before, xss, after]) => `${before}${xss}${after}`);

    fc.assert(
      fc.property(embeddedXssArb, (html: string) => {
        const sanitized = sanitizeHtml(html);
        expect(containsDangerousContent(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: Empty and null inputs are handled gracefully.
   */
  it('handles empty and null inputs gracefully', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });

  /**
   * **Feature: owasp-security-audit, Property 3: HTML Sanitization Completeness**
   * **Validates: Requirements 3.2**
   *
   * Property: removeDangerousPatterns removes all dangerous patterns.
   */
  it('removeDangerousPatterns removes dangerous patterns', () => {
    fc.assert(
      fc.property(xssPayloadArb, (xssPayload: string) => {
        const cleaned = removeDangerousPatterns(xssPayload);
        // After removing dangerous patterns, script tags should be gone
        expect(containsScriptTag(cleaned)).toBe(false);
        // Style tags should be gone
        expect(containsStyleTag(cleaned)).toBe(false);
        // SVG tags should be gone
        expect(containsSvgTag(cleaned)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
