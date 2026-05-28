import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

/**
 * Sanitizes legal document HTML while preserving formatting
 * Allows structural tags needed for contracts and legal documents
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized HTML string with formatting preserved
 */
export function sanitizeLegalDocument(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'b', 'i', 'em', 'strong', 'u',
      'section', 'article', 'hr'
    ],
    ALLOWED_ATTR: ['class'],
  });
}

/**
 * Sanitizes plain text to prevent XSS
 * Strips all HTML tags and returns only text content
 * @param dirty - Potentially unsafe text
 * @returns Safe text string
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escapes HTML special characters
 * Use this for rendering user input in text nodes
 * @param unsafe - Unsafe string
 * @returns Escaped string
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
