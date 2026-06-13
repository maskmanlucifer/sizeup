/**
 * Flipkart platform adapter.
 * Handles product page size matching and listing page URL filter construction.
 *
 * Size filter:   `p[]=facets.size[]=L` — one param per value.
 * Gender filter: `p[]=facets.ideal_for[]=Men` — Men / Women / Boys / Girls.
 *
 * facetValue encoding used internally: `"size|gender"` (e.g. `"l|men"`, `"7 - 8 years|boys"`).
 * Kids under 8 use no gender: facetValue = just the size string.
 *
 * Note: Flipkart hashes its CSS class names on every deploy. The size button
 * selectors below use a known-class list with a heuristic fallback that walks
 * the DOM looking for a "Size" label and collecting adjacent button children.
 */
const FlipkartPlatform = (() => {

  function onProductPage() {
    return /\/p\/[a-z0-9]+/i.test(location.pathname);
  }

  function onListingPage() {
    // Category browse pages: /shirts/pr?sid=clo,...
    if (/\/[a-z-]+\/pr\b/i.test(location.pathname)) {
      const sid = new URLSearchParams(location.search).get('sid') || '';
      return sid.startsWith('clo');
    }
    // Search results page: /search?q=shirt (no sid — allow all search queries)
    if (location.pathname === '/search') return true;
    return false;
  }

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

  /** Maps a profile gender string to the Flipkart ideal_for value (Title Case). */
  function _idealFor(gender, isKid) {
    if (isKid)  return gender === 'male' ? 'Boys' : gender === 'female' ? 'Girls' : null;
    return gender === 'male' ? 'Men' : gender === 'female' ? 'Women' : null;
  }

  /**
   * Maps a kid profile's age and gender to a Flipkart listing facet.
   * facetValue encoding: `"size|gender"` for kids ≥ 8 years; plain size for under-8.
   *
   * @param {number} ageMonths
   * @param {'male'|'female'|string} gender
   * @returns {{ label: string, facetValue: string }}
   */
  function getKidSizeFacet(ageMonths, gender) {
    const size      = getFlipkartKidSizeFacet(ageMonths);
    const useGender = ageMonths >= 96; // under-8 clothing is unisex
    const gTag      = useGender ? _idealFor(gender, true) : null;
    const facetValue = gTag ? `${size}|${gTag.toLowerCase()}` : size;
    return { label: size, facetValue };
  }

  /**
   * Maps profile measurements to the Flipkart size facet value.
   * facetValue encoding: `"size|gender"` (e.g. `"l|men"`, `"m|women"`).
   *
   * @param {Object} measurements
   * @param {'male'|'female'|string} [gender]
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements, gender) {
    const { top, bottom } = deriveSizes(measurements, gender);
    let sizeLabel;
    if (categoryFromPath(location.pathname) === 'bottom') {
      if (!bottom) return null;
      sizeLabel = bottom.label;
    } else {
      if (!top) return null;
      sizeLabel = top.alpha;
    }
    const gTag       = _idealFor(gender, false);
    const facetValue = gTag ? `${sizeLabel}|${gTag.toLowerCase()}` : sizeLabel;
    return { label: sizeLabel, facetValue };
  }

  /**
   * Reads active size and gender filters from the URL.
   * Returns plain size strings AND combined `"size|gender"` entries so both
   * plain and gender-encoded facetValues round-trip correctly through the toggle.
   *
   * @returns {Set<string>} lowercase entries
   */
  function getCurrentFilters() {
    const params  = new URLSearchParams(location.search);
    const sizes   = [];
    const genders = [];

    for (const v of params.getAll('p[]')) {
      const decoded = _safeDecode(v);
      const sm = decoded.match(/^facets\.size\[\]=(.+)$/i);
      if (sm) { sizes.push(sm[1].toLowerCase()); continue; }
      const gm = decoded.match(/^facets\.ideal_for\[\]=(.+)$/i);
      if (gm) genders.push(gm[1].toLowerCase());
    }

    const active = new Set(sizes);
    // Also add combined "size|gender" entries for every size × gender combo
    for (const s of sizes) {
      for (const g of genders) active.add(`${s}|${g}`);
    }
    return active;
  }

  /**
   * Builds a Flipkart listing URL with the given facet values applied.
   * facetValues may be plain sizes (`"L"`) or `"size|gender"` encoded strings.
   * Writes `facets.size[]` and `facets.ideal_for[]` params; preserves all others.
   * An empty array clears both size and gender filters.
   *
   * @param {string[]} facetValues
   * @returns {string}
   */
  function buildFilterUrl(facetValues) {
    const url = new URL(location.href);

    // Strip size and ideal_for params; keep brand, colour, etc.
    const others = url.searchParams.getAll('p[]').filter(v => {
      const d = _safeDecode(v);
      return !/^facets\.size(\[\]|%5B%5D)=/i.test(v)      &&
             !/^facets\.size\[\]=/i.test(d)                &&
             !/^facets\.ideal_for(\[\]|%5B%5D)=/i.test(v) &&
             !/^facets\.ideal_for\[\]=/i.test(d);
    });
    url.searchParams.delete('p[]');
    for (const v of others) url.searchParams.append('p[]', v);

    // Split facetValues into unique sizes and unique genders
    const sizes   = [...new Set(facetValues.map(v => v.split('|')[0]))];
    const genders = [...new Set(
      facetValues.map(v => v.split('|')[1]).filter(Boolean)
        .map(g => g[0].toUpperCase() + g.slice(1)) // restore Title Case
    )];

    for (const size   of sizes)   url.searchParams.append('p[]', `facets.size[]=${size}`);
    for (const gender of genders) url.searchParams.append('p[]', `facets.ideal_for[]=${gender}`);

    return url.toString();
  }

  /** Safely decodes a percent-encoded string; returns original on error. */
  function _safeDecode(v) {
    try { return decodeURIComponent(v); } catch (_) { return v; }
  }

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getKidSizeFacet, getCurrentFilters, buildFilterUrl };
})();
