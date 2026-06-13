/**
 * Size chart data and derivation utilities.
 * All functions are globals — shared by content scripts and popup via script tag.
 */

/** Tops (men): chest cm → alpha + Indian numeric */
const TOPS_CHART = [
  { alpha: 'XS',  numeric: '36', min: 0,   max: 80  },
  { alpha: 'S',   numeric: '38', min: 81,  max: 86  },
  { alpha: 'M',   numeric: '40', min: 87,  max: 92  },
  { alpha: 'L',   numeric: '42', min: 93,  max: 98  },
  { alpha: 'XL',  numeric: '44', min: 99,  max: 104 },
  { alpha: 'XXL', numeric: '46', min: 105, max: 110 },
  { alpha: '3XL', numeric: '48', min: 111, max: 116 },
  { alpha: '4XL', numeric: '50', min: 117, max: Infinity },
];

/**
 * Tops (women): bust cm → alpha + Indian numeric.
 * Women's alpha labels match men's but the bust cm ranges are shifted ~2–4 cm
 * tighter — a woman with 92 cm bust is Women's L, but Men's M.
 */
const WOMENS_TOPS_CHART = [
  { alpha: 'XS',  numeric: '36', min: 0,   max: 80  },
  { alpha: 'S',   numeric: '38', min: 81,  max: 85  },
  { alpha: 'M',   numeric: '40', min: 86,  max: 90  },
  { alpha: 'L',   numeric: '42', min: 91,  max: 95  },
  { alpha: 'XL',  numeric: '44', min: 96,  max: 100 },
  { alpha: 'XXL', numeric: '46', min: 101, max: 105 },
  { alpha: '3XL', numeric: '48', min: 106, max: 110 },
  { alpha: '4XL', numeric: '50', min: 111, max: Infinity },
];

/** Bottoms: waist cm → numeric label */
const BOTTOMS_CHART = [
  { label: '26', min: 0,   max: 68  },
  { label: '28', min: 69,  max: 73  },
  { label: '30', min: 74,  max: 78  },
  { label: '32', min: 79,  max: 83  },
  { label: '34', min: 84,  max: 88  },
  { label: '36', min: 89,  max: 93  },
  { label: '38', min: 94,  max: 98  },
  { label: '40', min: 99,  max: 103 },
  { label: '42', min: 104, max: Infinity },
];

/**
 * Bottom-wear keywords seen in product/listing URL slugs across platforms.
 * Anything not matching is treated as a top (the common case for fashion).
 */
const _BOTTOM_KEYWORDS = /jean|trouser|pant|short|jogger|chino|legging|skirt|bottom|cargo|track|culotte|palazzo|capri|dhoti|pyjama|lower/i;

/**
 * Classifies a URL path as 'top' or 'bottom' wear. Used to keep top sizes and
 * bottom sizes from cross-matching (e.g. a top's numeric 42 vs a 42" waist).
 * @param {string} path - typically location.pathname
 * @returns {'top'|'bottom'}
 */
function categoryFromPath(path) {
  return _BOTTOM_KEYWORDS.test((path || '').toLowerCase()) ? 'bottom' : 'top';
}

/**
 * @param {number} chestCm
 * @param {'male'|'female'|string} [gender]
 */
function getTopSize(chestCm, gender) {
  chestCm = Math.round(parseFloat(chestCm));
  if (!chestCm || chestCm <= 0) return null;
  const chart = gender === 'female' ? WOMENS_TOPS_CHART : TOPS_CHART;
  return chart.find(r => chestCm >= r.min && chestCm <= r.max) || chart[chart.length - 1];
}

function getBottomSize(waistCm) {
  waistCm = Math.round(parseFloat(waistCm));
  if (!waistCm || waistCm <= 0) return null;
  return BOTTOMS_CHART.find(r => waistCm >= r.min && waistCm <= r.max) || BOTTOMS_CHART[BOTTOMS_CHART.length - 1];
}

/**
 * Derives top and bottom sizes from raw measurements.
 * @param {Object} m - measurements object from profile
 * @param {'male'|'female'|string} [gender] - uses women's chart when `'female'`
 * @returns {{ top: Object|null, bottom: Object|null }}
 */
function deriveSizes(m, gender) {
  return {
    top:    getTopSize(m.chest, gender),
    bottom: getBottomSize(m.waist),
  };
}

// ── Label helpers ─────────────────────────────────────────────────────────────

/** @param {Set<string>} set @param {Object} row */
function _addTopLabels(set, row) {
  const a = row.alpha.toLowerCase();
  const n = row.numeric;
  set.add(a);
  set.add(n);
  set.add(`${a}/${n}`);
  set.add(`${n}/${a}`);
}

/** @param {Set<string>} set @param {Object} row */
function _addBottomLabels(set, row) {
  set.add(row.label);
}

/**
 * Returns exact size labels plus labels for adjacent sizes (±1 band).
 * Adjacent matching handles brand-specific size variation — a garment tagged
 * "M" on one brand may be labelled "L" on another for the same body measurement.
 *
 * @param {Object} measurements
 * @param {'top'|'bottom'} [category] - restrict labels to one category so a
 *   top's numeric (e.g. 42) can't cross-match a bottom's waist size (42"). When
 *   omitted, both categories are pooled.
 * @param {'male'|'female'|string} [gender] - uses women's chart when `'female'`
 * @returns {{ exact: string[], adjacent: string[] }} both arrays are lowercase
 */
function getSizeLabelsExtended(measurements, category, gender) {
  const { top, bottom } = deriveSizes(measurements, gender);
  const exact    = new Set();
  const adjacent = new Set();

  if (top && category !== 'bottom') {
    const idx = TOPS_CHART.indexOf(top);
    _addTopLabels(exact, top);
    if (idx > 0)                      _addTopLabels(adjacent, TOPS_CHART[idx - 1]);
    if (idx < TOPS_CHART.length - 1)  _addTopLabels(adjacent, TOPS_CHART[idx + 1]);
  }
  if (bottom && category !== 'top') {
    const idx = BOTTOMS_CHART.indexOf(bottom);
    _addBottomLabels(exact, bottom);
    if (idx > 0)                         _addBottomLabels(adjacent, BOTTOMS_CHART[idx - 1]);
    if (idx < BOTTOMS_CHART.length - 1)  _addBottomLabels(adjacent, BOTTOMS_CHART[idx + 1]);
  }

  // Exact labels take priority — remove overlap from adjacent
  for (const l of exact) adjacent.delete(l);

  return {
    exact:    [...exact].map(l => l.toLowerCase()),
    adjacent: [...adjacent].map(l => l.toLowerCase()),
  };
}

/**
 * Returns true if a site's size string matches any of the profile's size labels.
 * Handles partial matches and compound formats like "M/38" or "42/L".
 * @param {string} siteSize - raw text from the size element
 * @param {string[]} profileLabels - from {@link getSizeLabelsExtended}
 * @returns {boolean}
 */
function sizeMatches(siteSize, profileLabels) {
  const norm = siteSize.toLowerCase().trim().replace(/\s+/g, ' ');
  return profileLabels.some(label => {
    if (norm === label) return true;
    // Compound like "m/38" or "42 / l" — check each segment individually
    const parts = norm.split(/[\/\-,\s]/);
    return parts.some(p => p.trim() === label);
  });
}

// ── Kids size utilities ───────────────────────────────────────────────────────

/**
 * Granular 1-year age bands for kids product-page size matching.
 * Each entry maps a human-readable band label to an inclusive month range.
 * `maxM` is exclusive (i.e. ageMonths < maxM) except for the last band.
 */
const KIDS_BANDS = [
  { band: '0-3M',   minM: 0,   maxM: 3   },
  { band: '3-6M',   minM: 3,   maxM: 6   },
  { band: '6-9M',   minM: 6,   maxM: 9   },
  { band: '9-12M',  minM: 9,   maxM: 12  },
  { band: '12-18M', minM: 12,  maxM: 18  },
  { band: '18-24M', minM: 18,  maxM: 24  },
  { band: '2-3Y',   minM: 24,  maxM: 36  },
  { band: '3-4Y',   minM: 36,  maxM: 48  },
  { band: '4-5Y',   minM: 48,  maxM: 60  },
  { band: '5-6Y',   minM: 60,  maxM: 72  },
  { band: '6-7Y',   minM: 72,  maxM: 84  },
  { band: '7-8Y',   minM: 84,  maxM: 96  },
  { band: '8-9Y',   minM: 96,  maxM: 108 },
  { band: '9-10Y',  minM: 108, maxM: 120 },
  { band: '10-11Y', minM: 120, maxM: 132 },
  { band: '11-12Y', minM: 132, maxM: 144 },
  { band: '12-13Y', minM: 144, maxM: 156 },
  { band: '13-14Y', minM: 156, maxM: 168 },
  { band: '14-15Y', minM: 168, maxM: 180 },
  { band: '15-16Y', minM: 180, maxM: Infinity },
];

/**
 * Finds the KIDS_BANDS row for the given age in months.
 * @param {number} ageMonths
 * @returns {Object|null} the matching band row, or null if ageMonths is invalid
 */
function getKidBandByMonths(ageMonths) {
  if (ageMonths == null || ageMonths < 0) return null;
  return KIDS_BANDS.find(b => ageMonths >= b.minM && ageMonths < b.maxM) ||
    KIDS_BANDS[KIDS_BANDS.length - 1];
}

/**
 * Computes age in months from a kid profile.
 * Handles both `kidMode === 'dob'` (compute from date-of-birth) and
 * `kidMode === 'age'` (age in whole years × 12).
 *
 * @param {Object} profile - a kid profile with `kind === 'kid'`
 * @returns {number|null} age in months, or null if it cannot be determined
 */
function getKidAgeMonthsFromProfile(profile) {
  if (!profile || profile.kind !== 'kid') return null;
  if (profile.kidMode === 'dob' && profile.dob) {
    const birth = new Date(profile.dob);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    return years * 12 + months;
  }
  if (profile.kidMode === 'age' && profile.age != null) {
    return parseInt(profile.age, 10) * 12;
  }
  return null;
}

/**
 * Builds the set of all label variants for a single age band, covering the
 * spelling variations used by Myntra, Flipkart, and Amazon India on product pages.
 *
 * @param {Object} band - a row from {@link KIDS_BANDS}
 * @returns {string[]} lowercase label variants for this band
 */
function _kidBandVariants(band) {
  const b = band.band;
  const isMonth = b.endsWith('M');
  const nums    = b.slice(0, -1); // e.g. "3-6" or "7-8"
  const [lo, hi] = nums.split('-');

  if (isMonth) {
    return [
      `${lo}-${hi}m`,
      `${lo}-${hi} months`,
      `${lo} - ${hi} months`,
      `${lo}-${hi}mo`,
      `${lo}-${hi}mths`,
      `${lo}-${hi}month`,
      `${lo} - ${hi}m`,
      `${lo}-${hi}months`,
      `${lo}-${hi} mth`,
      `${lo}-${hi} mo`,
    ];
  }
  // Year band
  return [
    `${lo}-${hi}y`,
    `${lo}-${hi} years`,
    `${lo} - ${hi} years`,
    `${lo}-${hi}yr`,
    `${lo}-${hi}yrs`,
    `${lo}-${hi}year`,
    `${lo} - ${hi}yr`,
    `${lo}-${hi}years`,
    `${lo}-${hi} yrs`,
    `${lo}-${hi} yr`,
  ];
}

/**
 * Returns Myntra's 2-year grouped age band variants for the given 1-year band.
 * Myntra groups sizes on its product pages (e.g. 7-year-old → "6Y-8Y").
 *
 * @param {Object} band - a row from {@link KIDS_BANDS}
 * @returns {string[]} Myntra 2-year band label variants (lowercase)
 */
function _myntra2YearVariants(band) {
  const b = band.band;
  if (b.endsWith('M')) return []; // no 2-year grouping for infants

  const nums = b.slice(0, -1); // e.g. "7-8"
  const lo   = parseInt(nums.split('-')[0], 10);

  // Snap lo to an even year so we always get 0-2, 2-4, 4-6, 6-8 …
  const base = Math.floor(lo / 2) * 2;
  const top  = base + 2;

  return [
    `${base}y-${top}y`,
    `${base}-${top} years`,
    `${base} - ${top} years`,
    `${base}-${top}y`,
  ];
}

/**
 * Returns exact and adjacent size label sets for kids product-page size button
 * matching.  Covers all spelling variants used by major Indian fashion platforms.
 *
 * @param {number} ageMonths
 * @returns {{ exact: string[], adjacent: string[] }} both arrays are lowercase
 */
function getKidSizeLabels(ageMonths) {
  const band = getKidBandByMonths(ageMonths);
  if (!band) return { exact: [], adjacent: [] };

  const idx     = KIDS_BANDS.indexOf(band);
  const exact   = new Set([..._kidBandVariants(band), ..._myntra2YearVariants(band)]);
  const adjacent = new Set();

  if (idx > 0)                       { for (const v of _kidBandVariants(KIDS_BANDS[idx - 1])) adjacent.add(v); }
  if (idx < KIDS_BANDS.length - 1)   { for (const v of _kidBandVariants(KIDS_BANDS[idx + 1])) adjacent.add(v); }

  // Exact labels take priority — remove overlap from adjacent
  for (const l of exact) adjacent.delete(l);

  return { exact: [...exact], adjacent: [...adjacent] };
}

/**
 * Returns the Myntra listing Age facet value for the given age in months.
 * These are the exact strings that appear in Myntra's `?f=Age:...` URL parameter.
 *
 * @param {number} ageMonths
 * @returns {string} e.g. `"6Y-8Y"`
 */
function getMyntraKidAgeFacet(ageMonths) {
  if (ageMonths <   3) return '0M-3M';
  if (ageMonths <   6) return '3M-6M';
  if (ageMonths <   9) return '6M-9M';
  if (ageMonths <  12) return '9M-12M';
  if (ageMonths <  18) return '12M-18M';
  if (ageMonths <  24) return '18M-24M';
  if (ageMonths <  48) return '2Y-4Y';
  if (ageMonths <  72) return '4Y-6Y';
  if (ageMonths <  96) return '6Y-8Y';
  if (ageMonths < 120) return '8Y-10Y';
  if (ageMonths < 144) return '10Y-12Y';
  if (ageMonths < 168) return '12Y-14Y';
  return '14Y+';
}

/**
 * Returns the Flipkart listing size facet string for the given age in months.
 * These are the exact strings that appear in Flipkart's `p[]=facets.size[]=...`
 * URL parameter for kids/infants clothing.
 *
 * @param {number} ageMonths
 * @returns {string} e.g. `"7 - 8 Years"`
 */
function getFlipkartKidSizeFacet(ageMonths) {
  if (ageMonths <  1) return '0 - 1 Month';
  if (ageMonths <  3) return '0 - 3 Months';
  if (ageMonths <  6) return '3 - 6 Months';
  if (ageMonths < 12) return '6 - 12 Months';
  if (ageMonths < 18) return '12-18 Months';
  if (ageMonths < 24) return '18-24 Months';

  const ageYears = Math.floor(ageMonths / 12);
  switch (ageYears) {
    case  1: return '1-2 Years';
    case  2: return '2-3 Years';
    case  3: return '3-4 Years';
    case  4: return '4-5 Years';
    case  5: return '5-6 Years';
    case  6: return '6-7 Years';
    case  7: return '7 - 8 Years';
    case  8: return '8-9 Years';
    case  9: return '9-10 Years';
    case 10: return '10-11 Years';
    case 11: return '11-12 Years';
    case 12: return '12-13 Years';
    case 13: return '13-14 Years';
    case 14: return '14-15 Years';
    default: return '15-16 Years';
  }
}
