/**
 * Flipkart platform adapter.
 * Handles product page size matching and listing page URL filter construction.
 *
 * Size filter format: `p[]=facets.size[]=L` — one param per size value.
 * Multiple sizes:     `p[]=facets.size[]=L&p[]=facets.size[]=XL`
 *
 * Note: Flipkart hashes its CSS class names on every deploy. The size button
 * selectors below use a known-class list with a heuristic fallback that walks
 * the DOM looking for a "Size" label and collecting adjacent button children.
 */
const FlipkartPlatform = (() => {

  // ── Page detection ──────────────────────────────────────────────────────────

  function onProductPage() {
    return /\/p\/[a-z0-9]+/i.test(location.pathname);
  }

  function onListingPage() {
    if (!/\/[a-z-]+\/pr\b/i.test(location.pathname)) return false;
    // Restrict to clothing categories via the `sid` hierarchy prefix
    const sid = new URLSearchParams(location.search).get('sid') || '';
    return sid.startsWith('clo');
  }

  // ── Product page ────────────────────────────────────────────────────────────

  /**
   * Flipkart renders size swatches as `<a>` tags with hashed class names.
   * We try known selectors first, then fall back to DOM heuristics.
   */
  function findSizeElements() {
    const KNOWN = ['._1fGeJ1', '.dyC4hf', '._3ULzGw', '.itgGwcB', '[class*="size-swatch"]', '[class*="sizeSelector"]'];
    for (const sel of KNOWN) {
      const els = document.querySelectorAll(sel);
      if (els.length && els.length < 25) return els;
    }
    return _fallbackSizeElements();
  }

  /** Walks the DOM for an element whose text is exactly "Size" and collects its siblings. */
  function _fallbackSizeElements() {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length === 0 && /^size\s*:?\s*$/i.test(el.textContent.trim())) {
        const section = el.closest('section, [class]') || el.parentElement?.parentElement;
        if (section) {
          const btns = section.querySelectorAll('a, button, [role="button"]');
          if (btns.length > 0 && btns.length < 25) return btns;
        }
      }
    }
    return [];
  }

  function isUnavailable(el) {
    const cls = (el.className || '') + ' ' + (el.parentElement?.className || '');
    return cls.includes('_3f2I3K') ||
           el.style?.pointerEvents === 'none' ||
           el.getAttribute('aria-disabled') === 'true';
  }

  /** Returns only the size label, ignoring any "Out of Stock" sub-text. */
  function sizeText(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.trim();
        if (t) return t;
      }
    }
    return el.textContent.trim().split('\n')[0].trim();
  }

  // ── Listing filter ──────────────────────────────────────────────────────────

  /**
   * Maps profile measurements to the Flipkart size facet value.
   * Flipkart listing filters use plain alpha labels (S/M/L/XL) for tops
   * and numeric waist for bottoms.
   *
   * @param {Object} measurements
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements) {
    const { top, bottom } = deriveSizes(measurements);
    if (top)    return { label: top.alpha,    facetValue: top.alpha };
    if (bottom) return { label: bottom.label, facetValue: bottom.label };
    return null;
  }

  /**
   * Reads active size filters from the URL.
   * Flipkart encodes each size as a separate `p[]=facets.size[]=<VALUE>` param.
   * @returns {Set<string>} lowercase active size values
   */
  function getCurrentFilters() {
    const params = new URLSearchParams(location.search);
    const active = new Set();
    for (const v of params.getAll('p[]')) {
      const m = v.match(/^facets\.size\[\]=(.+)$/i);
      if (m) active.add(m[1].toLowerCase());
    }
    return active;
  }

  /**
   * Builds a Flipkart listing URL with the given sizes applied.
   * Existing non-size `p[]` params (brand, colour, etc.) are preserved.
   * An empty array clears the size filter.
   *
   * @param {string[]} facetValues
   * @returns {string}
   */
  function buildFilterUrl(facetValues) {
    const url = new URL(location.href);
    // Keep all p[] params that are not size facets
    const others = url.searchParams.getAll('p[]').filter(v => !/^facets\.size\[\]=/i.test(v));
    url.searchParams.delete('p[]');
    for (const v of others) url.searchParams.append('p[]', v);
    for (const size of facetValues) url.searchParams.append('p[]', `facets.size[]=${size}`);
    return url.toString();
  }

  // ── Public interface ────────────────────────────────────────────────────────

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getCurrentFilters, buildFilterUrl };
})();
