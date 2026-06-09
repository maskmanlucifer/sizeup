/**
 * SizeUp content script.
 * Runs on Myntra, Amazon India, Flipkart.
 * Depends on: size-charts.js, storage.js (loaded before this via manifest).
 */
(function () {
  'use strict';

  const BAR_ID    = 'sizeup-bar';
  const BANNER_ID = 'sizeup-banner';
  const STYLES_ID = 'sizeup-styles';

  // ── Injected CSS ─────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
      /* ── Floating listing bar (bottom-left) ── */
      #sizeup-bar {
        position: fixed;
        bottom: 20px; left: 20px;
        z-index: 2147483647;
        background: #5C35E8;
        color: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.18);
        padding: 11px 14px 12px;
        min-width: 170px; max-width: 220px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        animation: su-bar-in 0.18s ease;
      }
      @keyframes su-bar-in {
        from { transform: translateY(10px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      #sizeup-bar .su-bar-head {
        display: flex; align-items: center; gap: 7px;
        margin-bottom: 6px;
      }
      #sizeup-bar .su-bar-logo img {
        width: 18px; height: 18px;
        object-fit: contain;
        filter: brightness(0) invert(1);
        display: block;
      }
      #sizeup-bar .su-bar-profile {
        font-weight: 600; font-size: 13px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sizeup-bar .su-bar-size {
        font-size: 12px; opacity: 0.8;
        margin-bottom: 9px;
      }
      #sizeup-bar .su-bar-btn {
        display: block; width: 100%;
        height: 28px; padding: 0 12px;
        border-radius: 8px;
        font-size: 12px; font-weight: 600;
        cursor: pointer; border: none; font-family: inherit;
        white-space: nowrap; text-align: center;
        transition: opacity 0.15s;
      }
      #sizeup-bar .su-bar-btn:hover { opacity: 0.85; }
      #sizeup-bar .su-bar-apply {
        background: #fff;
        color: #5C35E8;
      }
      #sizeup-bar .su-bar-clear {
        background: rgba(255,255,255,0.15);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.3);
      }
      #sizeup-bar .su-bar-filtered {
        font-size: 11px; opacity: 0.75;
        margin-bottom: 6px;
      }

      /* ── Floating banner (product pages / learn mode) ── */
      #sizeup-banner {
        position: fixed;
        bottom: 20px; right: 20px;
        z-index: 2147483647;
        background: #fff;
        border: 1.5px solid #E5E7EB;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.13);
        padding: 12px 14px;
        max-width: 270px; min-width: 220px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        color: #111827;
        animation: su-in 0.18s ease;
        line-height: 1.4;
      }
      @keyframes su-in {
        from { transform: translateY(8px); opacity: 0; }
        to   { transform: translateY(0);   opacity: 1; }
      }
      #sizeup-banner .su-row { display: flex; align-items: flex-start; gap: 8px; }
      #sizeup-banner .su-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
      #sizeup-banner .su-body { flex: 1; min-width: 0; }
      #sizeup-banner .su-msg { font-weight: 600; }
      #sizeup-banner .su-sub { font-size: 11px; color: #6B7280; margin-top: 2px; }
      #sizeup-banner .su-close {
        background: none; border: none; cursor: pointer;
        color: #9CA3AF; font-size: 14px; padding: 0; line-height: 1; flex-shrink: 0;
      }
      #sizeup-banner .su-close:hover { color: #374151; }
      #sizeup-banner .su-actions { display: flex; gap: 6px; margin-top: 10px; }
      #sizeup-banner .su-btn {
        height: 28px; padding: 0 11px; border-radius: 6px;
        font-size: 12px; font-weight: 500; cursor: pointer; border: none; font-family: inherit;
      }
      #sizeup-banner .su-primary { background: #5C35E8; color: #fff; }
      #sizeup-banner .su-primary:hover { background: #4526C9; }
      #sizeup-banner .su-secondary { background: #F3F4F6; color: #374151; }
      #sizeup-banner .su-secondary:hover { background: #E5E7EB; }
      #sizeup-banner .su-brand { font-size: 10px; color: #9CA3AF; text-align: right; margin-top: 8px; }
      #sizeup-banner .su-learn-sizes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      #sizeup-banner .su-size-opt {
        height: 30px; padding: 0 12px;
        border: 1.5px solid #E5E7EB; border-radius: 6px;
        background: #fff; cursor: pointer;
        font-size: 12px; font-weight: 500; font-family: inherit; color: #111827;
        transition: border-color 0.12s, background 0.12s;
      }
      #sizeup-banner .su-size-opt:hover { border-color: #5C35E8; background: #EDE9FE; color: #5C35E8; }

      /* ── Size highlight on product pages ── */
      .sizeup-match {
        outline: 2.5px solid #5C35E8 !important;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Top bar (listing pages) ───────────────────────────────────────────────────

  function removeBar() {
    document.getElementById(BAR_ID)?.remove();
  }

  /**
   * @param {{ profile: Object, sizeLabel: string, facetValue: string, isFiltered: boolean }} opts
   */
  function showBar({ profile, sizeLabel, facetValue, isFiltered }) {
    removeBar();
    const bar = document.createElement('div');
    bar.id = BAR_ID;

    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    bar.innerHTML = `
      <div class="su-bar-head">
        <div class="su-bar-logo"><img src="${iconUrl}" alt="SizeUp" /></div>
        <div class="su-bar-profile">${profile.emoji} ${profile.name}</div>
      </div>
      <div class="su-bar-size">Size ${sizeLabel}</div>
      ${isFiltered
        ? `<div class="su-bar-filtered">✓ Filtered</div>
           <button class="su-bar-btn su-bar-clear" id="su-clear">Clear filter</button>`
        : `<button class="su-bar-btn su-bar-apply" id="su-apply">Filter by ${sizeLabel}</button>`
      }
    `;

    if (isFiltered) {
      bar.querySelector('#su-clear').addEventListener('click', () => {
        location.href = buildClearUrl();
      });
    } else {
      bar.querySelector('#su-apply').addEventListener('click', () => {
        location.href = buildFilterUrl(facetValue);
      });
    }

    document.body.appendChild(bar);
  }

  // ── Floating banner (product pages) ──────────────────────────────────────────

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  function showBanner({ icon, msg, sub, actions }) {
    removeBanner();
    const el = document.createElement('div');
    el.id = BANNER_ID;
    el.innerHTML = `
      <div class="su-row">
        <span class="su-icon">${icon}</span>
        <div class="su-body">
          <div class="su-msg">${msg}</div>
          ${sub ? `<div class="su-sub">${sub}</div>` : ''}
        </div>
        <button class="su-close" title="Dismiss">✕</button>
      </div>
      ${actions?.length ? `
        <div class="su-actions">
          ${actions.map(a => `<button class="su-btn ${a.primary ? 'su-primary' : 'su-secondary'}" data-id="${a.id}">${a.label}</button>`).join('')}
        </div>` : ''}
      <div class="su-brand">SizeUp</div>
    `;
    el.querySelector('.su-close').addEventListener('click', removeBanner);
    actions?.forEach(a => el.querySelector(`[data-id="${a.id}"]`)?.addEventListener('click', a.onClick));
    document.body.appendChild(el);
  }

  // ── Highlights ────────────────────────────────────────────────────────────────

  function clearHighlights() {
    document.querySelectorAll('.sizeup-match').forEach(el => el.classList.remove('sizeup-match'));
  }

  function cleanup() {
    removeBar();
    removeBanner();
    clearHighlights();
  }

  // ── Myntra size facet mapping ─────────────────────────────────────────────────

  /**
   * Detects the clothing category from the Myntra URL path.
   * @returns {'top'|'bottom'|'shoe'}
   */
  function getMyntraCategory() {
    const path = location.pathname.toLowerCase();
    if (/shoe|sneaker|sandal|heel|loafer|boot|slipper|footwear|mule|clog|kolhapuri/i.test(path)) return 'shoe';
    if (/jean|trouser|pant|short|jogger|chino|legging|skirt|bottom|cargo|track/i.test(path))     return 'bottom';
    return 'top';
  }

  /**
   * Maps profile measurements to the exact Myntra size_facet value for the page category.
   *
   * Tops    → alpha (XS / S / M / L / XL / XXL / 3XL / 4XL)
   * Bottoms → numeric waist (28 / 30 / 32 / 34 / 36 / 38 / 40)
   * Shoes   → IND-{uk} prefix Myntra uses (IND-6, IND-7 … IND-12)
   *
   * @param {Object} measurements
   * @param {'top'|'bottom'|'shoe'} category
   * @returns {{ sizeLabel: string, facetValue: string } | null}
   */
  function getMyntraSizeFacet(measurements, category) {
    const sizes = deriveSizes(measurements);
    switch (category) {
      case 'top':
        if (!sizes.top) return null;
        return { sizeLabel: sizes.top.alpha, facetValue: sizes.top.alpha };

      case 'bottom':
        if (!sizes.bottom) return null;
        return { sizeLabel: sizes.bottom.label, facetValue: sizes.bottom.label };

      case 'shoe':
        if (!sizes.shoe) return null;
        return { sizeLabel: `UK ${sizes.shoe.uk}`, facetValue: `IND-${sizes.shoe.uk}` };
    }
    return null;
  }

  // ── URL filter helpers ────────────────────────────────────────────────────────

  function buildFilterUrl(facetValue) {
    const url = new URL(location.href);
    const existing = url.searchParams.get('f') || '';
    // Remove any prior size_facet, keep other active filters (brand, color, etc.)
    const withoutSize = existing
      .replace(/size_facet:[^|]*/gi, '')
      .replace(/^\|+|\|+$/g, '')
      .replace(/\|{2,}/g, '||');
    url.searchParams.set('f', withoutSize ? `${withoutSize}||size_facet:${facetValue}` : `size_facet:${facetValue}`);
    return url.toString();
  }

  function buildClearUrl() {
    const url = new URL(location.href);
    const existing = url.searchParams.get('f') || '';
    const withoutSize = existing
      .replace(/size_facet:[^|]*/gi, '')
      .replace(/^\|+|\|+$/g, '')
      .replace(/\|{2,}/g, '||');
    if (withoutSize) url.searchParams.set('f', withoutSize);
    else url.searchParams.delete('f');
    return url.toString();
  }

  function getCurrentFacet() {
    const f = new URL(location.href).searchParams.get('f') || '';
    const m = f.match(/size_facet:([^|]+)/i);
    return m ? m[1].trim() : null;
  }

  // ── Site detection ────────────────────────────────────────────────────────────

  const host = location.hostname;

  function site() {
    if (host.includes('myntra.com'))   return 'myntra';
    if (host.includes('amazon.in'))    return 'amazon';
    if (host.includes('flipkart.com')) return 'flipkart';
    return null;
  }

  function onProductPage() {
    switch (site()) {
      case 'myntra':   return /\/\d+\/buy/.test(location.pathname);
      case 'amazon':   return location.pathname.includes('/dp/');
      case 'flipkart': return /\/p\/[a-z0-9]+/i.test(location.pathname);
    }
    return false;
  }

  function onListingPage() {
    switch (site()) {
      case 'myntra':   return !onProductPage() && location.pathname.length > 1 && isClothingUrl();
      case 'amazon':   return /^\/s/.test(location.pathname) || location.search.includes('k=');
      case 'flipkart': return location.pathname === '/search' || /\/[a-z-]+\/pr\b/i.test(location.pathname);
    }
    return false;
  }

  /**
   * Returns false for clearly non-clothing Myntra paths (beauty, bags, watches, etc.)
   * so we never show the bar on pages where size filtering makes no sense.
   */
  function isClothingUrl() {
    const path = location.pathname.toLowerCase();

    const NON_CLOTHING = /beauty|skincare|makeup|lipstick|mascara|foundation|kajal|kohl|blush|bronzer|concealer|primer|perfume|fragrance|deodorant|grooming|shampoo|conditioner|hair-|nail-|serum|moisturis|sunscreen|toner|facewash|face-wash|bags|handbag|wallet|purse|clutch|backpack|luggage|suitcase|trolley|watch|jewel|necklace|bracelet|earring|\-ring|pendant|brooch|bangle|anklet|home-|kitchen|furniture|decor|bedding|pillow|curtain|lamp|vase|toy|puzzle|board-game|sunglasses|eyewear|frames|spectacles|electronics|mobile|laptop|headphone|speaker|camera|tablet|stationery|book/i;

    const CLOTHING = /shirt|tshirt|t-shirt|top|blouse|kurta|kurti|sweatshirt|hoodie|sweater|jacket|coat|blazer|waistcoat|vest|polo|tunic|jean|trouser|pant|short|jogger|chino|legging|skirt|cargo|track-pant|dress|saree|salwar|suit|jumpsuit|romper|gown|dungaree|overall|shoe|sneaker|sandal|heel|loafer|boot|slipper|footwear|mule|clog|brief|boxer|bra|innerwear|underwear|lingerie|shapewear|sportswear|gymwear|swimwear|swimsuit|bikini|sherwani|dhoti|lungi|capri|ethnic|western|men-wear|women-wear|kids-wear|athleisure|activewear|nightwear|sleepwear|pyjama/i;

    if (NON_CLOTHING.test(path)) return false;
    if (CLOTHING.test(path))     return true;

    // Ambiguous path — default to showing (better a false positive than missing clothing pages)
    return true;
  }

  // ── Size element finders ──────────────────────────────────────────────────────

  function findSizeElements() {
    switch (site()) {
      case 'myntra': {
        // Product page: round size circles under SELECT SIZE
        let els = document.querySelectorAll('.size-buttons-unified-size-container .size-buttons-size-button, .size-buttons-unified-size .size-buttons-size-button');
        if (!els.length) els = document.querySelectorAll('[class*="size-buttons-size-button"]');
        return els;
      }

      case 'amazon': {
        const grid = document.querySelectorAll('#variation_size_name .a-button:not(.a-button-toggle)');
        if (grid.length) return grid;
        const sel = document.querySelector('#native_dropdown_selected_size_name, #variation_size_name select');
        return sel ? sel.querySelectorAll('option:not([value=""])') : [];
      }

      case 'flipkart': {
        const candidates = ['._1fGeJ1', '.dyC4hf', '._3ULzGw', '.itgGwcB'];
        for (const sel of candidates) {
          const els = document.querySelectorAll(sel);
          if (els.length && els.length < 25) return els;
        }
        return fallbackSizeElements();
      }
    }
    return [];
  }

  function fallbackSizeElements() {
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length === 0 && /^size\s*:?\s*$/i.test(el.textContent.trim())) {
        const section = el.closest('section, [class]') || el.parentElement?.parentElement;
        if (section) {
          const btns = section.querySelectorAll('button, [role="button"]');
          if (btns.length > 0 && btns.length < 25) return btns;
        }
      }
    }
    return [];
  }

  function isUnavailable(el) {
    const cls = (el.className || '') + ' ' + (el.parentElement?.className || '');
    switch (site()) {
      case 'myntra':
        return cls.includes('not-available') || cls.includes('outOfStock') ||
               el.style?.pointerEvents === 'none' || el.disabled;
      case 'amazon':
        return cls.includes('a-button-disabled') || el.disabled;
      case 'flipkart':
        return cls.includes('_3f2I3K') || el.style?.pointerEvents === 'none';
    }
    return false;
  }

  function sizeText(el) {
    if (el.tagName === 'OPTION') return el.textContent.trim();
    return (el.querySelector('.a-button-text') || el).textContent.trim();
  }

  // ── Page handlers ─────────────────────────────────────────────────────────────

  async function handleProduct(profile) {
    await delay(900);

    const els = findSizeElements();
    // No size UI on this product page — likely not a clothing item, skip silently
    if (!els.length) return;

    const labels = getSizeLabels(profile.measurements || {});
    if (!labels.length) return;

    let matchEl = null;
    let available = false;

    for (const el of els) {
      const text = sizeText(el);
      if (!text || !sizeMatches(text, labels)) continue;
      matchEl = el;
      available = !isUnavailable(el);
      el.classList.add('sizeup-match');
      break;
    }

    if (!matchEl) return;

    const sz = deriveSizes(profile.measurements || {});
    const label = sz.top    ? `${sz.top.alpha} / ${sz.top.numeric}` :
                  sz.bottom ? sz.bottom.label :
                  sz.shoe   ? `UK ${sz.shoe.uk}` : '';

    if (available) {
      showBanner({
        icon: '🟢',
        msg: `${profile.name}'s size available`,
        sub: label ? `${label} · highlighted above` : 'Highlighted above',
        actions: [{ id: 'sel', label: 'Select size', primary: true, onClick: () => { matchEl.click(); removeBanner(); } }],
      });
    } else {
      showBanner({
        icon: '🔴',
        msg: `${label || 'Size'} out of stock`,
        sub: `${profile.name}'s size isn't available right now`,
      });
    }
  }

  async function handleListing(profile) {
    if (site() !== 'myntra') return;

    const category = getMyntraCategory();
    const mapped = getMyntraSizeFacet(profile.measurements || {}, category);
    if (!mapped) return;

    const { sizeLabel, facetValue } = mapped;
    const currentFacet = getCurrentFacet();
    const isFiltered = currentFacet?.toLowerCase() === facetValue.toLowerCase();

    showBar({ profile, sizeLabel, facetValue, isFiltered });
  }

  // ── Learn-from-purchase ───────────────────────────────────────────────────────

  function detectCategory(texts) {
    const n = texts.map(t => t.toLowerCase().trim());
    if (n.some(t => /uk\s*\d|ind-\d/i.test(t))) return 'shoe';
    if (n.length > 0 && n.every(t => /^\d{2}$/.test(t) && +t >= 24 && +t <= 44)) return 'bottom';
    return 'top';
  }

  async function handleLearnMode(learnData) {
    if (!onProductPage()) return;

    await delay(800);

    const els = findSizeElements();
    if (!els.length) return;

    const available = [];
    for (const el of els) {
      const text = sizeText(el);
      if (text && !isUnavailable(el)) available.push(text);
    }
    if (!available.length) return;

    const category = detectCategory(available);
    const categoryLabel = { top: 'Tops', bottom: 'Bottoms', shoe: 'Shoes' }[category];

    injectStyles();
    removeBanner();

    const el = document.createElement('div');
    el.id = BANNER_ID;
    el.innerHTML = `
      <div class="su-row">
        <span class="su-icon">📦</span>
        <div class="su-body">
          <div class="su-msg">Which size did you buy?</div>
          <div class="su-sub">${categoryLabel} · tap your size</div>
        </div>
        <button class="su-close" title="Cancel">✕</button>
      </div>
      <div class="su-learn-sizes">
        ${available.map(s => `<button class="su-size-opt" data-size="${s}">${s}</button>`).join('')}
      </div>
      <div class="su-brand">SizeUp</div>
    `;

    el.querySelector('.su-close').addEventListener('click', async () => {
      await clearLearnMode();
      removeBanner();
    });

    el.querySelectorAll('.su-size-opt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const size = btn.dataset.size;
        await saveLearned(learnData.profileId, size, category);
        removeBanner();
        showBanner({
          icon: '✅',
          msg: `Size ${size} (${categoryLabel}) saved!`,
          sub: 'Reopen SizeUp to update the profile.',
        });
      });
    });

    document.body.appendChild(el);
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  async function init() {
    if (!site()) return;

    const data = await getStorageData();
    if (data.learnMode) {
      injectStyles();
      await handleLearnMode(data.learnMode);
      return;
    }

    const profile = await getActiveProfile();
    if (!profile) { cleanup(); return; }

    injectStyles();
    clearHighlights();

    if (onProductPage()) {
      removeBar();
      await handleProduct(profile);
    } else if (onListingPage()) {
      removeBanner();
      await handleListing(profile);
    }
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Re-run on SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      cleanup();
      init();
    }
  }).observe(document.body, { subtree: true, childList: true });

  // Re-run when active profile changes from popup
  chrome.storage.onChanged.addListener(changes => {
    if (changes[STORAGE_KEY]) { cleanup(); init(); }
  });

  init();
})();
