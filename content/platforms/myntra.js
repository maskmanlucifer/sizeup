/**
 * Myntra platform adapter.
 * Handles product page size matching and listing page URL filter construction.
 *
 * Size filter format: `?f=size_facet:L,XL` (comma-separated, pipe-delimited from other filters)
 * Multiple sizes:     `?f=brand:Puma||size_facet:L,XL`
 */
const MyntraPlatform = (() => {
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
    const CLOTHING     = /shirt|tshirt|t-shirt|top|blouse|kurta|kurti|sweatshirt|hoodie|sweater|jacket|coat|blazer|waistcoat|vest|polo|tunic|jean|trouser|pant|short|jogger|chino|legging|skirt|cargo|track-pant|dress|saree|salwar|suit|jumpsuit|romper|gown|dungaree|overall|brief|boxer|bra|innerwear|underwear|lingerie|shapewear|sportswear|gymwear|swimwear|swimsuit|bikini|sherwani|dhoti|lungi|capri|ethnic|western|men-wear|women-wear|kids-wear|athleisure|activewear|nightwear|sleepwear|pyjama/i;
    if (NON_CLOTHING.test(path)) return false;
    if (CLOTHING.test(path))     return true;
    return true; // ambiguous — default to showing
  }

  function findSizeElements() {
    // Target button elements inside their containers — avoids matching ancestor divs
    // whose class names are superstrings of the button class (e.g. "size-buttons-size-buttons")
    let els = document.querySelectorAll('.size-buttons-buttonContainer button');
    if (!els.length) els = document.querySelectorAll('button[class*="size-buttons-size-button"]');
    return els;
  }

  function isUnavailable(el) {
    if (el.style?.pointerEvents === 'none' || el.disabled) return true;
    // Use classList.contains for exact class matching — avoids substring false-positives
    if (el.classList.contains('size-buttons-size-button-disabled')) return true;
    // Strike-through span is rendered inside OOS buttons
    if (el.querySelector('.size-buttons-size-strike-show')) return true;
    return false;
  }

  /**
   * Extracts just the size label, ignoring garment measurement text that
   * Myntra renders in sibling elements inside the same container.
   */
  function sizeText(el) {
    // Myntra wraps the size label in a <p class="size-buttons-unified-size">
    const p = el.querySelector('.size-buttons-unified-size');
    if (p) return p.textContent.trim().split('\n')[0].trim();
    return el.textContent.trim().split('\n')[0].trim();
  }


  /**
   * Maps profile measurements to the Myntra size_facet value for the current category.
   *
   * - Tops    → alpha label (XS / S / M / L / XL / XXL)
   * - Bottoms → waist numeric (28 / 30 / 32 / 34)
   *
   * @param {Object} measurements
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements) {
    const sizes    = deriveSizes(measurements);
    const category = categoryFromPath(location.pathname);
    switch (category) {
      case 'top':
        if (!sizes.top) return null;
        return { label: sizes.top.alpha, facetValue: sizes.top.alpha };
      case 'bottom':
        if (!sizes.bottom) return null;
        return { label: sizes.bottom.label, facetValue: sizes.bottom.label };
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

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getCurrentFilters, buildFilterUrl };
})();
