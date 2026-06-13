/**
 * Amazon India platform adapter.
 * Handles product page size matching and listing page URL filter construction.
 *
 * Men's tops filter:    `rh=p_n_pt_nav_size_men_international_size:ID`
 * Kids clothing filter: `rh=p_n_pt_nav_size_children_size:ID`
 *   IDs start at 2081569031 (2-3Y), increment by 1000 per year-band.
 *   Infants (under 2 years) are not in this facet.
 * Gender filter:        `rh=p_n_g-101015233022111:MEN_ID|WOMEN_ID`
 *   Men: 207199034031  Women: 207199036031  (confirmed from live URLs)
 *   Applied to both adult genders. Men get gender + size; women get gender only
 *   (women's size param IDs are per-category and not yet mapped).
 *
 * Internal facetValue encoding for adults: `"sizeAlpha|genderId"` e.g. `"l|207199034031"`.
 * Women (no size): `"|207199036031"` — empty size part, gender only.
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
  const MEN_SIZE_PARAM      = 'p_n_pt_nav_size_men_international_size';
  const CHILDREN_SIZE_PARAM = 'p_n_pt_nav_size_children_size';
  // Confirmed from live URLs: 2-3Y → 2081569031, 17-18Y → 2081584031 (+1000/band)
  const CHILDREN_SIZE_BASE  = 2081569031;
  // Gender filter param — confirmed from live Amazon India URLs
  const GENDER_PARAM = 'p_n_g-101015233022111';
  const GENDER_IDS   = {
    male:   '207199036031', // Men
    female: '207199034031', // Women
    boys:   '207199035031', // Boys (kids)
    girls:  '207199041031', // Girls (kids)
  };
  // Which gender IDs belong to adults vs kids — used to route cartesian products correctly
  const ADULT_GENDER_ID_SET = new Set(['207199036031', '207199034031']);
  const KID_GENDER_ID_SET   = new Set(['207199035031', '207199041031']);

  /**
   * Converts age in months to the Amazon children_size facet ID.
   * The facet starts at 2-3Y (ageMonths ≥ 24); infants have no entry here.
   *
   * @param {number} ageMonths
   * @returns {string|null} numeric ID string, or null for infants under 2 years
   */
  function _getChildrenSizeId(ageMonths) {
    if (ageMonths < 24) return null;
    const ageYears = Math.min(Math.floor(ageMonths / 12), 17); // cap at 17-18Y band
    return String(CHILDREN_SIZE_BASE + (ageYears - 2) * 1000);
  }

  /**
   * Maps a kid profile's age and gender to Amazon listing facets.
   * facetValue encoding: `"_cid_:ID"` for under-8 (unisex), `"_cid_:ID|genderID"` for 8+.
   *
   * @param {number} ageMonths
   * @param {'male'|'female'|string} gender
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getKidSizeFacet(ageMonths, gender) {
    const id = _getChildrenSizeId(ageMonths);
    if (!id) return null; // under 2 years — no children_size entry
    const band      = getKidBandByMonths(ageMonths);
    const useGender = ageMonths >= 96; // unisex below 8 years
    const gKey      = useGender ? (gender === 'male' ? 'boys' : gender === 'female' ? 'girls' : null) : null;
    const gId       = gKey ? GENDER_IDS[gKey] : null;
    const facetValue = gId ? `_cid_:${id}|${gId}` : `_cid_:${id}`;
    return { label: band ? band.band : '?', facetValue };
  }

  /**
   * Maps profile measurements and gender to an Amazon listing facet.
   * facetValue encoding: `"sizeAlpha|genderId"` for men (e.g. `"l|207199034031"`),
   * `"|207199036031"` for women (gender filter only — women's size param IDs are
   * per-category and not yet universally mapped).
   *
   * @param {Object} measurements
   * @param {'male'|'female'|string} [gender]
   * @returns {{ label: string, facetValue: string } | null}
   */
  function getSizeFacet(measurements, gender) {
    const genderId = GENDER_IDS[gender] || null;

    if (gender === 'female') {
      // Gender-only filter — narrows to women's clothing (women's size param IDs not yet mapped)
      const wId = GENDER_IDS.female;
      return { label: 'Women', facetValue: `|${wId}` };
    }

    // Men: apply size + gender filter. Skip bottoms (no men's waist size param).
    if (categoryFromPath(location.pathname) === 'bottom') return null;
    const { top } = deriveSizes(measurements, gender);
    if (!top || !MEN_INTL_SIZE_IDS[top.alpha]) return null;
    const sizeLabel = top.alpha;
    const facetValue = genderId ? `${sizeLabel}|${genderId}` : sizeLabel;
    return { label: sizeLabel, facetValue };
  }

  /**
   * Parses the `rh` URL parameter for all active facets managed by SizeUp.
   * Builds combined facetValue strings matching the encoding used in getSizeFacet /
   * getKidSizeFacet so the checked-state detection in content.js works correctly.
   *
   * @returns {Set<string>}
   */
  function getCurrentFilters() {
    const rh     = decodeURIComponent(new URLSearchParams(location.search).get('rh') || '');
    const active = new Set();

    // Men's international sizes → collect alpha labels
    const alphas = [];
    const menM = rh.match(new RegExp(`${MEN_SIZE_PARAM}:([^,&]+)`, 'i'));
    if (menM) {
      for (const [alpha, id] of Object.entries(MEN_INTL_SIZE_IDS)) {
        if (menM[1].split('|').includes(id)) alphas.push(alpha.toLowerCase());
      }
    }

    // Children's sizes → collect `_cid_:ID` strings
    const cidIds = [];
    const kidM = rh.match(new RegExp(`${CHILDREN_SIZE_PARAM}:([^,&]+)`, 'i'));
    if (kidM) {
      for (const id of kidM[1].split('|')) cidIds.push(id.trim());
    }

    // Gender filter → split into adult IDs and kids IDs
    const adultGIds = [];
    const kidGIds   = [];
    const genderM   = rh.match(new RegExp(`${GENDER_PARAM}:([^,&]+)`, 'i'));
    if (genderM) {
      for (const id of genderM[1].split('|')) {
        const g = id.trim();
        if (ADULT_GENDER_ID_SET.has(g)) adultGIds.push(g);
        else if (KID_GENDER_ID_SET.has(g)) kidGIds.push(g);
      }
    }

    // Adult: size × adult-gender → `"alpha|genderId"`; women gender-only → `"|genderId"`
    for (const gId of adultGIds) {
      active.add(`|${gId}`); // women gender-only entry
      for (const alpha of alphas) active.add(`${alpha}|${gId}`);
    }

    // Kids: children_size × kid-gender → `"_cid_:ID|genderId"`; ungendered → `"_cid_:ID"`
    for (const cid of cidIds) {
      active.add(`_cid_:${cid}`); // ungendered (under-8) entry
      for (const gId of kidGIds) active.add(`_cid_:${cid}|${gId}`);
    }

    return active;
  }

  /**
   * Rebuilds the Amazon search URL with the given facet values applied.
   * Handles adult `"sizeAlpha|genderId"`, women-only `"|genderId"`, and kids `"_cid_:ID"`.
   * Preserves all other `rh` filters (brand, category node, etc.).
   *
   * @param {string[]} facetValues
   * @returns {string}
   */
  function buildFilterUrl(facetValues) {
    const url = new URL(location.href);
    const rh  = decodeURIComponent(url.searchParams.get('rh') || '');

    // Strip all three managed facets; preserve brand, node, etc.
    const base = rh
      .replace(new RegExp(`,?${MEN_SIZE_PARAM}:[^,&]*`, 'gi'), '')
      .replace(new RegExp(`,?${CHILDREN_SIZE_PARAM}:[^,&]*`, 'gi'), '')
      .replace(new RegExp(`,?${GENDER_PARAM}:[^,&]*`, 'gi'), '')
      .replace(/^,|,$/g, '');

    const parts = base ? [base] : [];

    // Collect unique IDs across all three facets
    const sizeIds   = [];
    const genderIds = [];
    const childIds  = [];

    for (const v of facetValues) {
      if (v.startsWith('_cid_:')) {
        // Kids: `"_cid_:ID"` or `"_cid_:ID|genderID"`
        const [cidPart, gPart] = v.slice(6).split('|'); // slice off "_cid_:"
        if (cidPart && !childIds.includes(cidPart)) childIds.push(cidPart);
        if (gPart   && !genderIds.includes(gPart))  genderIds.push(gPart);
      } else {
        // Adults: `"sizeAlpha|genderID"` or `"|genderID"` (women)
        const pipeIdx  = v.indexOf('|');
        const sizePart = pipeIdx >= 0 ? v.slice(0, pipeIdx) : v;
        const gPart    = pipeIdx >= 0 ? v.slice(pipeIdx + 1) : '';
        if (sizePart) {
          const id = MEN_INTL_SIZE_IDS[sizePart] || MEN_INTL_SIZE_IDS[sizePart.toUpperCase()];
          if (id && !sizeIds.includes(id)) sizeIds.push(id);
        }
        if (gPart && !genderIds.includes(gPart)) genderIds.push(gPart);
      }
    }

    if (sizeIds.length)   parts.push(`${MEN_SIZE_PARAM}:${sizeIds.join('|')}`);
    if (genderIds.length) parts.push(`${GENDER_PARAM}:${genderIds.join('|')}`);
    if (childIds.length)  parts.push(`${CHILDREN_SIZE_PARAM}:${childIds.join('|')}`);

    const newRh = parts.join(',');
    if (newRh) url.searchParams.set('rh', newRh);
    else       url.searchParams.delete('rh');
    return url.toString();
  }

  return { onProductPage, onListingPage, findSizeElements, isUnavailable, sizeText, getSizeFacet, getKidSizeFacet, getCurrentFilters, buildFilterUrl };
})();
