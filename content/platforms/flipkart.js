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
   * Flipkart renders size swatches as `<a>` tags.
   * Primary selector targets the stable `swatchAttr=size` href parameter.
   * Falls back to known hashed class names then DOM heuristics.
   */
  function findSizeElements() {
    // Stable semantic selector — Flipkart always puts swatchAttr=size on size links
    const byHref = document.querySelectorAll('a[href*="swatchAttr=size"]');
    if (byHref.length && byHref.length < 25) return byHref;

    // Legacy hashed selectors (deploy-specific, kept as secondary)
    const KNOWN = ['._1fGeJ1', '.dyC4hf', '._3ULzGw', '.itgGwcB', '[class*="size-swatch"]', '[class*="sizeSelector"]'];
    for (const sel of KNOWN) {
      const els = document.querySelectorAll(sel);
      if (els.length && els.length < 25) return els;
    }
    return _fallbackSizeElements();
  }

  /**
   * DOM heuristic: find a "size" or "select size" label element and collect
   * the adjacent clickable elements in its container.
   */
  function _fallbackSizeElements() {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length === 0 && /^(select\s+)?size\s*:?\s*$/i.test(el.textContent.trim())) {
        let container = el.parentElement;
        for (let i = 0; i < 4 && container; i++, container = container.parentElement) {
          const btns = container.querySelectorAll('a, button, [role="button"]');
          if (btns.length > 1 && btns.length < 25) return btns;
        }
      }
    }
    return [];
  }

  function isUnavailable(el) {
    if (el.style?.pointerEvents === 'none') return true;
    if (el.getAttribute('aria-disabled') === 'true') return true;
    // Flipkart renders OOS size swatches with a dashed border — most reliable signal
    const computed = getComputedStyle(el);
    if (computed.borderStyle === 'dashed' || computed.borderTopStyle === 'dashed') return true;
    // Also check the first child div in case the border is on the inner container
    const inner = el.firstElementChild;
    if (inner) {
      const ic = getComputedStyle(inner);
      if (ic.borderStyle === 'dashed' || ic.borderTopStyle === 'dashed') return true;
    }
    // Walk up 3 levels for hashed OOS class names
    let node = el;
    for (let i = 0; i < 3 && node; i++, node = node.parentElement) {
      const cls = node.className || '';
      if (cls.includes('_3f2I3K') || cls.includes('disabled') || cls.includes('unavailable')) return true;
    }
    // swatchAttr-based elements: OOS text div has grey colour (#707070)
    const textDiv = el.querySelector('div[style*="color"]');
    if (textDiv) {
      const c = textDiv.style.color || '';
      if (c.includes('707070') || c.includes('9e9e9e') || c.includes('bdbdbd')) return true;
    }
    return false;
  }

  /** Returns only the size label, ignoring any "Out of Stock" sub-text. */
  function sizeText(el) {
    // Direct text node first (legacy structure)
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.trim();
        if (t) return t;
      }
    }
    // For swatchAttr <a> elements: size text is in innermost div, e.g. <a><div><div>M</div></div></a>
    const leaf = el.querySelector('div > div, span');
    if (leaf) {
      const t = leaf.textContent.trim().split('\n')[0].trim();
      if (t) return t;
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
   * Flipkart's native URLs double-encode the value (`facets.size%5B%5D%3DL`),
   * so we decode each value before matching to handle both single- and double-
   * encoded forms.
   * @returns {Set<string>} lowercase active size values
   */
  function getCurrentFilters() {
    const params = new URLSearchParams(location.search);
    const active = new Set();
    for (const v of params.getAll('p[]')) {
      // Decode once more because Flipkart double-encodes the value in native URLs
      const decoded = _safeDecode(v);
      const m = decoded.match(/^facets\.size\[\]=(.+)$/i);
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
    // Keep all p[] params that are not size facets (handle both encodings)
    const others = url.searchParams.getAll('p[]').filter(v => !/^facets\.size(\[\]|%5B%5D)=/i.test(v) && !/^facets\.size\[\]=/i.test(_safeDecode(v)));
    url.searchParams.delete('p[]');
    for (const v of others) url.searchParams.append('p[]', v);
    for (const size of facetValues) url.searchParams.append('p[]', `facets.size[]=${size}`);
    return url.toString();
  }

  /** Safely decodes a percent-encoded string; returns original on error. */
  function _safeDecode(v) {
    try { return decodeURIComponent(v); } catch (_) { return v; }
  }

  // ── Public interface ────────────────────────────────────────────────────────

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getCurrentFilters, buildFilterUrl };
})();
