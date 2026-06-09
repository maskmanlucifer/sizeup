/**
 * Amazon India platform adapter.
 * Product page size matching only — listing filter is not supported because
 * Amazon's size facet IDs are dynamic per category node and have no universal
 * mapping from a plain label like "L" to a URL parameter.
 */
const AmazonPlatform = (() => {

  // ── Page detection ──────────────────────────────────────────────────────────

  function onProductPage() {
    return location.pathname.includes('/dp/');
  }

  function onListingPage() {
    return /^\/s/.test(location.pathname) || location.search.includes('k=');
  }

  // ── Product page ────────────────────────────────────────────────────────────

  /**
   * Amazon renders sizes in two ways depending on the seller:
   * 1. Button grid — `#variation_size_name .a-button` elements
   * 2. Native dropdown — `#native_dropdown_selected_size_name select`
   */
  function findSizeElements() {
    // Try the "twister" inline button variant first (most clothing listings)
    const twister = document.querySelectorAll(
      '#variation_size_name .a-button:not(.a-button-toggle), ' +
      '#inline-twister-row-size_name .a-button:not(.a-button-toggle)'
    );
    if (twister.length) return twister;

    // Fall back to native select dropdown
    const sel = document.querySelector(
      '#native_dropdown_selected_size_name, #variation_size_name select'
    );
    return sel ? sel.querySelectorAll('option:not([value=""])') : [];
  }

  function isUnavailable(el) {
    if (el.tagName === 'OPTION') return el.disabled || el.textContent.includes('currently unavailable');
    const cls = (el.className || '') + ' ' + (el.closest('li')?.className || '');
    return cls.includes('a-button-disabled') ||
           el.closest('li')?.dataset.initiallyUnavailable === 'true' ||
           el.disabled;
  }

  function sizeText(el) {
    if (el.tagName === 'OPTION') return el.textContent.trim();
    return (el.querySelector('.a-button-text') || el).textContent.trim();
  }

  // ── Listing filter (not supported) ─────────────────────────────────────────

  /**
   * Amazon India listing filter requires dynamic per-category facet IDs.
   * Not supported — returns null so the listing bar is never shown.
   * @returns {null}
   */
  function getSizeFacet() {
    return null;
  }

  /** @returns {Set<string>} always empty — Amazon listing filter not supported */
  function getCurrentFilters() {
    return new Set();
  }

  /** No-op — Amazon listing filter not supported. @returns {string} current URL unchanged */
  function buildFilterUrl() {
    return location.href;
  }

  // ── Public interface ────────────────────────────────────────────────────────

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getCurrentFilters, buildFilterUrl };
})();
