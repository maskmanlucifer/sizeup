/**
 * Myntra platform adapter.
 * Handles product page size matching and listing page URL filter construction.
 *
 * Size filter format: `?f=size_facet:L,XL` (comma-separated, pipe-delimited from other filters)
 * Multiple sizes:     `?f=brand:Puma||size_facet:L,XL`
 */
const MyntraPlatform = (() => {

  // ── Page detection ──────────────────────────────────────────────────────────

  function onProductPage() {
    return /\/\d+\/buy/.test(location.pathname);
  }

  function onListingPage() {
    return !onProductPage() && location.pathname.length > 1 && _isClothingUrl();
  }

  /** Filters out non-clothing categories so the bar never shows on beauty, bags, etc. */
  function _isClothingUrl() {
    const path = location.pathname.toLowerCase();
    const NON_CLOTHING = /beauty|skincare|makeup|lipstick|mascara|foundation|kajal|kohl|blush|bronzer|concealer|primer|perfume|fragrance|deodorant|grooming|shampoo|conditioner|hair-|nail-|serum|moisturis|sunscreen|toner|facewash|face-wash|bags|handbag|wallet|purse|clutch|backpack|luggage|suitcase|trolley|watch|jewel|necklace|bracelet|earring|\-ring|pendant|brooch|bangle|anklet|home-|kitchen|furniture|decor|bedding|pillow|curtain|lamp|vase|toy|puzzle|board-game|sunglasses|eyewear|frames|spectacles|electronics|mobile|laptop|headphone|speaker|camera|tablet|stationery|book/i;
    const CLOTHING     = /shirt|tshirt|t-shirt|top|blouse|kurta|kurti|sweatshirt|hoodie|sweater|jacket|coat|blazer|waistcoat|vest|polo|tunic|jean|trouser|pant|short|jogger|chino|legging|skirt|cargo|track-pant|dress|saree|salwar|suit|jumpsuit|romper|gown|dungaree|overall|shoe|sneaker|sandal|heel|loafer|boot|slipper|footwear|mule|clog|brief|boxer|bra|innerwear|underwear|lingerie|shapewear|sportswear|gymwear|swimwear|swimsuit|bikini|sherwani|dhoti|lungi|capri|ethnic|western|men-wear|women-wear|kids-wear|athleisure|activewear|nightwear|sleepwear|pyjama/i;
    if (NON_CLOTHING.test(path)) return false;
    if (CLOTHING.test(path))     return true;
    return true; // ambiguous — default to showing
  }

  // ── Product page ────────────────────────────────────────────────────────────

  function findSizeElements() {
    let els = document.querySelectorAll(
      '.size-buttons-unified-size-container .size-buttons-size-button, ' +
      '.size-buttons-unified-size .size-buttons-size-button'
    );
    if (!els.length) els = document.querySelectorAll('[class*="size-buttons-size-button"]');
    return els;
  }

  function isUnavailable(el) {
    const cls = (el.className || '') + ' ' + (el.parentElement?.className || '');
    return cls.includes('not-available') || cls.includes('outOfStock') ||
           el.style?.pointerEvents === 'none' || el.disabled;
  }

  /**
   * Extracts just the size label, ignoring stock text like "1 left" that
   * Myntra renders inside the same button element.
   */
  function sizeText(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.trim();
        if (t) return t;
      }
      if (node.nodeType === Node.ELEMENT_NODE && !node.className?.includes('stock')) {
        const t = node.textContent.trim().split('\n')[0].trim();
        if (t) return t;
      }
    }
    return el.textContent.trim().split('\n')[0].trim();
  }

  // ── Listing filter ──────────────────────────────────────────────────────────

  /**
   * Detects the clothing category from the URL path.
   * @returns {'top'|'bottom'|'shoe'}
   */
  function _getCategory() {
    const path = location.pathname.toLowerCase();
    if (/shoe|sneaker|sandal|heel|loafer|boot|slipper|footwear|mule|clog|kolhapuri/i.test(path)) return 'shoe';
    if (/jean|trouser|pant|short|jogger|chino|legging|skirt|bottom|cargo|track/i.test(path))     return 'bottom';
    return 'top';
  }

  /**
   * Maps profile measurements to the Myntra size_facet value for the current category.
   *
   * - Tops    → alpha label (XS / S / M / L / XL / XXL)
   * - Bottoms → waist numeric (28 / 30 / 32 / 34)
   * - Shoes   → IND-{uk} prefix (IND-6, IND-7 … IND-12)
   *
   * @param {Object} measurements
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements) {
    const sizes    = deriveSizes(measurements);
    const category = _getCategory();
    switch (category) {
      case 'top':
        if (!sizes.top) return null;
        return { label: sizes.top.alpha, facetValue: sizes.top.alpha };
      case 'bottom':
        if (!sizes.bottom) return null;
        return { label: sizes.bottom.label, facetValue: sizes.bottom.label };
      case 'shoe':
        if (!sizes.shoe) return null;
        return { label: `UK ${sizes.shoe.uk}`, facetValue: `IND-${sizes.shoe.uk}` };
    }
    return null;
  }

  /**
   * @returns {Set<string>} lowercase active size facet values parsed from the URL
   */
  function getCurrentFilters() {
    const f = new URL(location.href).searchParams.get('f') || '';
    const m = f.match(/size_facet:([^|]+)/i);
    if (!m) return new Set();
    return new Set(m[1].split(',').map(v => v.trim().toLowerCase()));
  }

  /**
   * Builds a Myntra listing URL with the given size facets applied.
   * Preserves other active filters (brand, colour, etc.).
   * An empty array clears the size filter entirely.
   *
   * @param {string[]} facetValues
   * @returns {string}
   */
  function buildFilterUrl(facetValues) {
    const url      = new URL(location.href);
    const existing = url.searchParams.get('f') || '';
    const withoutSize = existing
      .replace(/size_facet:[^|]*/gi, '')
      .replace(/^\|+|\|+$/g, '')
      .replace(/\|{2,}/g, '||');

    if (!facetValues.length) {
      if (withoutSize) url.searchParams.set('f', withoutSize);
      else             url.searchParams.delete('f');
    } else {
      const sizeParam = `size_facet:${facetValues.join(',')}`;
      url.searchParams.set('f', withoutSize ? `${withoutSize}||${sizeParam}` : sizeParam);
    }
    return url.toString();
  }

  // ── Public interface ────────────────────────────────────────────────────────

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getCurrentFilters, buildFilterUrl };
})();
