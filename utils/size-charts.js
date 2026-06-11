/**
 * Size chart data and derivation utilities.
 * All functions are globals — shared by content scripts and popup via script tag.
 */

/** Tops: chest cm → alpha + Indian numeric */
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

function getTopSize(chestCm) {
  chestCm = Math.round(parseFloat(chestCm));
  if (!chestCm || chestCm <= 0) return null;
  return TOPS_CHART.find(r => chestCm >= r.min && chestCm <= r.max) || TOPS_CHART[TOPS_CHART.length - 1];
}

function getBottomSize(waistCm) {
  waistCm = Math.round(parseFloat(waistCm));
  if (!waistCm || waistCm <= 0) return null;
  return BOTTOMS_CHART.find(r => waistCm >= r.min && waistCm <= r.max) || BOTTOMS_CHART[BOTTOMS_CHART.length - 1];
}

/**
 * Derives top and bottom sizes from raw measurements.
 * @param {Object} m - measurements object from profile
 * @returns {{ top: Object|null, bottom: Object|null }}
 */
function deriveSizes(m) {
  return {
    top:    getTopSize(m.chest),
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
 * Returns all normalized size strings a profile might appear as on a website.
 * Used by content scripts to match against product size options.
 * @param {Object} measurements
 * @returns {string[]} lowercase labels
 */
function getSizeLabels(measurements) {
  const { top, bottom } = deriveSizes(measurements);
  const labels = new Set();
  if (top)    _addTopLabels(labels, top);
  if (bottom) _addBottomLabels(labels, bottom);
  return [...labels].map(l => l.toLowerCase());
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
 * @returns {{ exact: string[], adjacent: string[] }} both arrays are lowercase
 */
function getSizeLabelsExtended(measurements, category) {
  const { top, bottom } = deriveSizes(measurements);
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
 * Returns the midpoint measurement (cm) for a given size label and category.
 * Used to compute a suggested measurement when a user reports buying a specific size.
 * @param {string} sizeLabel - e.g. "M", "42", "32"
 * @param {'top'|'bottom'} category
 * @returns {number|null} measurement in cm, or null if unrecognised
 */
function getSizeMidpoint(sizeLabel, category) {
  const norm = sizeLabel.trim().toLowerCase();
  if (category === 'top') {
    const row = TOPS_CHART.find(r => r.alpha.toLowerCase() === norm || r.numeric === norm);
    if (!row) return null;
    return row.max === Infinity ? row.min + 5 : (row.min + row.max) / 2;
  }
  if (category === 'bottom') {
    const row = BOTTOMS_CHART.find(r => r.label === norm);
    if (!row) return null;
    return row.max === Infinity ? row.min + 5 : (row.min + row.max) / 2;
  }
  return null;
}

/** Maps category to the measurements key it should update. */
const CATEGORY_FIELD = { top: 'chest', bottom: 'waist' };

/**
 * Returns true if a site's size string matches any of the profile's size labels.
 * Handles partial matches and compound formats like "M/38" or "42/L".
 * @param {string} siteSize - raw text from the size element
 * @param {string[]} profileLabels - from {@link getSizeLabels} or {@link getSizeLabelsExtended}
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
