/**
 * Amazon India platform adapter.
 * Product page size matching only — listing filter is not supported because
 * Amazon's size facet IDs are dynamic per category node and have no universal
 * mapping from a plain label like "L" to a URL parameter.
 */
const AmazonPlatform = (() => {

  function onProductPage() {
    return location.pathname.includes('/dp/');
  }

  function onListingPage() {
    return /^\/s/.test(location.pathname) || location.search.includes('k=');
  }

  /**
   * Amazon renders sizes in multiple ways depending on the listing type.
   * Tries button grids (twister/variation) first, then dropdown selects.
   */
  /**
   * Amazon product pages use an inline twister with .a-button-toggle class on
   * each size swatch. The containing <li> has data-initiallyunavailable for OOS.
   */
  function findSizeElements() {
    // Inline twister swatches — confirmed DOM structure: li.swatch-list-item-text > span > .a-button-toggle
    const swatches = document.querySelectorAll('li.swatch-list-item-text .a-button-toggle');
    if (swatches.length) return swatches;

    // Classic variation grid
    const classic = document.querySelectorAll(
      '#variation_size_name .a-button:not(.a-button-toggle), ' +
      '[id*="variation_size"] .a-button:not(.a-button-toggle)'
    );
    if (classic.length) return classic;

    // Native select dropdown fallback
    const sel = document.querySelector(
      '#native_dropdown_selected_size_name, #variation_size_name select, [id*="variation_size"] select'
    );
    return sel ? sel.querySelectorAll('option:not([value=""])') : [];
  }

  function isUnavailable(el) {
    if (el.tagName === 'OPTION') return el.disabled || el.textContent.includes('currently unavailable');
    // Confirmed: data-initiallyunavailable="true" on the parent <li>
    if (el.closest('li')?.dataset.initiallyunavailable === 'true') return true;
    // Also marked with a-button-unavailable class on the button itself
    if (el.classList.contains('a-button-unavailable')) return true;
    if (el.classList.contains('a-button-disabled')) return true;
    return false;
  }

  function sizeText(el) {
    if (el.tagName === 'OPTION') return el.textContent.trim();
    // Confirmed structure: .a-button-text > div > div > span.swatch-title-text-display
    const swatchText = el.querySelector('.swatch-title-text-display');
    if (swatchText) return swatchText.textContent.trim();
    return (el.querySelector('.a-button-text') || el).textContent.trim();
  }

  /**
   * Confirmed size IDs for men's international sizes on amazon.in.
   * All 7 values verified by manually selecting each size and inspecting the URL.
   * Parameter: p_n_pt_nav_size_men_international_size
   */
  const MEN_INTL_SIZE_IDS = {
    'XS':  '1975392031',
    'S':   '1975393031',
    'M':   '1975394031',
    'L':   '1975395031',
    'XL':  '1975396031',
    'XXL': '1975397031',
    '3XL': '1975398031',
  };
  const SIZE_PARAM = 'p_n_pt_nav_size_men_international_size';

  /**
   * @param {Object} measurements
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements) {
    // This facet only maps tops (men's international size); don't apply it on
    // bottoms listings.
    if (categoryFromPath(location.pathname) === 'bottom') return null;
    const { top } = deriveSizes(measurements);
    if (!top || !MEN_INTL_SIZE_IDS[top.alpha]) return null;
    return { label: top.alpha, facetValue: top.alpha };
  }

  /**
   * Parses the `rh` URL parameter to find which size IDs are active,
   * then maps them back to alpha labels.
   * Amazon double-encodes the pipe separator (%7C), so we decode it manually.
   * @returns {Set<string>} lowercase alpha size labels (e.g. 'l', 'xl')
   */
  function getCurrentFilters() {
    const rh = decodeURIComponent(new URLSearchParams(location.search).get('rh') || '');
    const m  = rh.match(new RegExp(`${SIZE_PARAM}:([^,&]+)`, 'i'));
    if (!m) return new Set();
    const ids    = m[1].split('|');
    const active = new Set();
    for (const [alpha, id] of Object.entries(MEN_INTL_SIZE_IDS)) {
      if (ids.includes(id)) active.add(alpha.toLowerCase());
    }
    return active;
  }

  /**
   * Rebuilds the Amazon search URL with the given alpha sizes applied.
   * Preserves all other `rh` filters (brand, category node, etc.).
   * @param {string[]} facetValues - alpha size labels e.g. ['L', 'XL']
   * @returns {string}
   */
  function buildFilterUrl(facetValues) {
    const url  = new URL(location.href);
    const rh   = decodeURIComponent(url.searchParams.get('rh') || '');
    const base = rh.replace(/,?p_n_pt_nav_size_men_international_size:[^,&]*/gi, '').replace(/^,|,$/g, '');
    const ids  = facetValues.map(v => MEN_INTL_SIZE_IDS[v] || MEN_INTL_SIZE_IDS[v.toUpperCase()]).filter(Boolean);
    let newRh;
    if (!ids.length) {
      newRh = base;
    } else {
      const sizeParam = `${SIZE_PARAM}:${ids.join('|')}`;
      newRh = base ? `${base},${sizeParam}` : sizeParam;
    }
    if (newRh) url.searchParams.set('rh', newRh);
    else       url.searchParams.delete('rh');
    return url.toString();
  }

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getCurrentFilters, buildFilterUrl };
})();
