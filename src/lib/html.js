/**
 * Escapes text for insertion into trusted HTML templates.
 * @param {string} value Text to escape.
 * @returns {string}
 */
export function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Escapes text for insertion into a double-quoted HTML attribute.
 * @param {string} value Text to escape.
 * @returns {string}
 */
export function escapeAttribute(value) {
  return escapeHtml(value);
}

/**
 * Marks the product name with the code-font branding style.
 * @param {string} value Trusted localized text.
 * @returns {string}
 */
export function brandText(value) {
  return escapeHtml(value).replaceAll("T00L", '<span class="brand-code">T00L</span>');
}

/**
 * Builds a word-level animation wrapper for title text.
 * @param {string} value Localized title text.
 * @param {string} className Span class used as a GSAP target.
 * @returns {string}
 */
export function animatedWords(value, className) {
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      return `<span class="${className}">${brandText(part)}</span>`;
    })
    .join("");
}

/**
 * Escapes text before using it inside a regular expression.
 * @param {string} value Text to escape.
 * @returns {string}
 */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns an escaped code block with one marked value span.
 * @param {string} codeText Source code text.
 * @param {string} value Value to mark.
 * @param {string} [className="code-selection"] Marking class name.
 * @returns {string}
 */
export function codeWithMarkedValue(codeText, value, className = "code-selection") {
  if (!value) return escapeHtml(codeText);
  const marker = new RegExp(escapeRegExp(value), "u");
  return escapeHtml(codeText).replace(marker, `<span class="${className}">${escapeHtml(value)}</span>`);
}

/**
 * Returns an escaped code block wrapped as a selected block.
 * @param {string} codeText Source code text.
 * @returns {string}
 */
export function selectedCodeBlock(codeText) {
  return `<span class="code-selection-block">${escapeHtml(codeText)}</span>`;
}
