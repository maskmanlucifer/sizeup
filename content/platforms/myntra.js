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
   * @param {'male'|'female'|string} [gender]
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements, gender) {
    const sizes    = deriveSizes(measurements, gender);
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
   * Maps a kid profile's age and gender to a Myntra listing facet value.
   * The facetValue encoding is `"_age_:<band>:<gender>"` (lowercase band),
   * where gender is `"boys"`, `"girls"`, or `""` (unknown/unisex).
   *
   * @param {number} ageMonths
   * @param {'male'|'female'|string} gender - profile gender field
   * @returns {{ label: string, facetValue: string }}
   */
  function getKidSizeFacet(ageMonths, gender) {
    const ageBand = getMyntraKidAgeFacet(ageMonths);
    // Clothing is unisex below 8 years — the gender control is hidden in the popup
    // for under-8 kids, but a saved profile may still carry a gender value.
    const useGender = ageMonths >= 96;
    const genderTag = useGender
      ? (gender === 'male' ? 'boys' : gender === 'female' ? 'girls' : '')
      : '';
    const facetValue = `_age_:${ageBand.toLowerCase()}:${genderTag}`;
    return { label: ageBand, facetValue };
  }

  /**
   * Reads active size AND kids-age filters from the URL.
   *
   * Adult sizes are stored as plain lowercase values (e.g. `"l"`, `"xl"`).
   * Kids age entries use the encoding `"_age_:<band>:<gender>"` so they can
   * be round-tripped through the toggle logic in content.js without colliding
   * with adult size labels.
   *
   * @returns {Set<string>} lowercase active facet values
   */
  function getCurrentFilters() {
    const f      = new URL(location.href).searchParams.get('f') || '';
    const active = new Set();

    // Adult sizes
    const sizeM = f.match(/size_facet:([^|]+)/i);
    if (sizeM) {
      for (const v of sizeM[1].split(',')) active.add(v.trim().toLowerCase());
    }

    // Kids age + gender — parse each Age: segment and cross-ref Gender:
    // The f param uses '::' as intra-filter separator and '||' between filter types.
    // Age and Gender live in the same filter block separated by '::'.
    const ageM    = f.match(/Age:([^:|]+)/i);
    const genderM = f.match(/Gender:([^:|]+)/i);
    const genderVals = genderM
      ? genderM[1].split(',').map(v => v.trim().toLowerCase())
      : [];

    if (ageM) {
      for (const band of ageM[1].split(',')) {
        const b = band.trim().toLowerCase();
        // "boys girls" is Myntra's unisex tag — always appended alongside the
        // explicit gender filter. It must NOT be treated as implying either
        // boys or girls on its own, or deselecting one gender would re-enable it.
        const hasBoys  = genderVals.includes('boys');
        const hasGirls = genderVals.includes('girls');
        if (hasBoys)             active.add(`_age_:${b}:boys`);
        if (hasGirls)            active.add(`_age_:${b}:girls`);
        if (!hasBoys && !hasGirls) active.add(`_age_:${b}:`);
      }
    }

    return active;
  }

  /**
   * Builds a Myntra listing URL with the given facet values applied.
   * Handles adult sizes, kids age bands, and gender facets, as well as
   * preserving unrelated filters (brand, colour, etc.).
   * An empty array clears all size and age filters.
   *
   * @param {string[]} facetValues - mix of adult size labels and `_age_:*` entries
   * @returns {string}
   */
  function buildFilterUrl(facetValues) {
    const url      = new URL(location.href);
    const existing = url.searchParams.get('f') || '';

    // Partition into adult sizes and kid age entries
    const adultSizes = facetValues.filter(v => !v.startsWith('_age_:'));
    const kidEntries = facetValues.filter(v =>  v.startsWith('_age_:'));

    // Strip existing size_facet, Age, and Gender segments; preserve everything else
    const withoutManaged = existing
      .replace(/size_facet:[^|]*/gi, '')
      .replace(/Age:[^:|]*/gi,       '')
      .replace(/Gender:[^:|]*/gi,    '')
      .replace(/::+/g,  '::')
      .replace(/^\|+|\|+$|^\:+|\:+$/g, '')
      .replace(/\|{2,}/g, '||')
      .replace(/:{2,}/g,  '::')
      .replace(/^\|+|\|+$/g, '')
      .trim();

    const parts = withoutManaged ? [withoutManaged] : [];

    // Adult size segment
    if (adultSizes.length) {
      parts.push(`size_facet:${adultSizes.join(',')}`);
    }

    // Kids age + gender segment
    if (kidEntries.length) {
      // Collect unique age bands (restore original casing: e.g. "6y-8y" → "6Y-8Y")
      const ageBands = [...new Set(kidEntries.map(v => {
        const raw = v.split(':')[1]; // e.g. "6y-8y"
        return raw.toUpperCase().replace(/([0-9]+)([MY])/gi, (_, n, u) => `${n}${u.toUpperCase()}`);
      }))];

      // Collect gender tags
      const genderTags = [...new Set(kidEntries.map(v => v.split(':')[2]).filter(Boolean))];
      let genderFacet = '';
      const hasBoys  = genderTags.includes('boys');
      const hasGirls = genderTags.includes('girls');
      if (hasBoys && hasGirls) {
        genderFacet = 'Gender:boys,girls,boys girls';
      } else if (hasBoys) {
        genderFacet = 'Gender:boys,boys girls';
      } else if (hasGirls) {
        genderFacet = 'Gender:girls,boys girls';
      }

      const ageSegment = `Age:${ageBands.join(',')}`;
      parts.push(genderFacet ? `${ageSegment}::${genderFacet}` : ageSegment);
    }

    const fValue = parts.join('||');
    if (fValue) url.searchParams.set('f', fValue);
    else        url.searchParams.delete('f');

    return url.toString();
  }

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getKidSizeFacet, getCurrentFilters, buildFilterUrl };
})();
