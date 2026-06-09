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
      /* ── Shared base ── */
      #sizeup-bar, #sizeup-banner {
        position: fixed;
        top: 70px; left: 20px;
        z-index: 2147483647;
        border-radius: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        min-width: 210px; max-width: 248px;
        animation: su-in 0.22s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes su-in {
        from { transform: translateX(-14px); opacity: 0; }
        to   { transform: translateX(0);     opacity: 1; }
      }

      /* ── Listing bar (purple) ── */
      #sizeup-bar {
        background: #5C35E8; color: #fff;
        box-shadow: 0 8px 30px rgba(92,53,232,0.38);
        padding: 12px 13px 13px;
      }
      #sizeup-bar .su-bar-head {
        display: flex; align-items: center; gap: 6px; margin-bottom: 10px;
      }
      #sizeup-bar .su-bar-logo img {
        width: 15px; height: 15px; object-fit: contain;
        filter: brightness(0) invert(1); display: block;
      }
      #sizeup-bar .su-bar-heading {
        font-size: 11px; font-weight: 700; letter-spacing: 0.7px;
        opacity: 0.7; text-transform: uppercase;
      }
      /* profile cards */
      #sizeup-bar .su-bar-profiles {
        display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;
      }
      #sizeup-bar .su-bar-pcard {
        display: flex; align-items: center; gap: 9px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 9px; padding: 7px 10px;
        cursor: pointer; transition: background 0.12s, border-color 0.12s;
      }
      #sizeup-bar .su-bar-pcard:hover { background: rgba(255,255,255,0.16); }
      #sizeup-bar .su-bar-pcard.active {
        background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.45);
      }
      #sizeup-bar .su-pcard-check {
        width: 16px; height: 16px; flex-shrink: 0;
        border: 1.5px solid rgba(255,255,255,0.4); border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 800; transition: all 0.12s;
      }
      #sizeup-bar .su-bar-pcard.active .su-pcard-check {
        background: #fff; border-color: #fff; color: #5C35E8;
      }
      #sizeup-bar .su-pcard-avatar { font-size: 17px; line-height: 1; flex-shrink: 0; }
      #sizeup-bar .su-pcard-name {
        flex: 1; font-size: 12px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sizeup-bar .su-pcard-size-big {
        font-size: 20px; font-weight: 800; letter-spacing: -0.5px;
        color: rgba(255,255,255,0.75); flex-shrink: 0; line-height: 1;
      }
      #sizeup-bar .su-bar-pcard.active .su-pcard-size-big { color: #fff; }

      /* ── Product banner (white card) ── */
      #sizeup-banner {
        background: #fff; color: #111827;
        box-shadow: 0 8px 30px rgba(0,0,0,0.13);
        border: 1.5px solid #EAE6FF;
        overflow: hidden; line-height: 1.4;
      }
      #sizeup-banner .su-accent {
        height: 4px;
      }
      #sizeup-banner .su-accent.avail    { background: #22C55E; }
      #sizeup-banner .su-accent.unavail  { background: #EF4444; }
      #sizeup-banner .su-accent.unlisted { background: #D1D5DB; }
      #sizeup-banner .su-banner-body { padding: 11px 13px 13px; }
      #sizeup-banner .su-top-row {
        display: flex; align-items: flex-start;
        justify-content: space-between; margin-bottom: 8px;
      }
      #sizeup-banner .su-heading {
        font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; color: #6B7280;
      }
      #sizeup-banner .su-close {
        background: none; border: none; cursor: pointer;
        color: #9CA3AF; font-size: 15px; padding: 0; line-height: 1; flex-shrink: 0;
      }
      #sizeup-banner .su-close:hover { color: #374151; }
      /* profile result cards */
      #sizeup-banner .su-banner-profiles {
        display: flex; flex-direction: column; gap: 5px;
      }
      #sizeup-banner .su-bpc {
        display: flex; align-items: center; gap: 9px;
        border: 1px solid #F0EEFF; border-radius: 9px;
        padding: 7px 10px; background: #FAFAFF;
      }
      #sizeup-banner .su-bpc-dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      }
      #sizeup-banner .su-bpc-dot.avail   { background: #22C55E; }
      #sizeup-banner .su-bpc-dot.unavail { background: #EF4444; }
      #sizeup-banner .su-bpc-dot.unlisted { background: #D1D5DB; }
      #sizeup-banner .su-bpc-avatar { font-size: 16px; line-height: 1; }
      #sizeup-banner .su-bpc-info { flex: 1; min-width: 0; }
      #sizeup-banner .su-bpc-name {
        font-size: 12px; font-weight: 600; display: block; color: #111827;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sizeup-banner .su-bpc-size { font-size: 11px; color: #6B7280; display: block; }
      #sizeup-banner .su-bpc-tag {
        font-size: 10px; font-weight: 600; padding: 2px 7px;
        border-radius: 999px; flex-shrink: 0;
      }
      #sizeup-banner .su-bpc-tag.avail   { background: #DCFCE7; color: #15803D; }
      #sizeup-banner .su-bpc-tag.unavail { background: #FEE2E2; color: #B91C1C; }
      #sizeup-banner .su-bpc-tag.unlisted { background: #F3F4F6; color: #6B7280; }
      /* action button */
      #sizeup-banner .su-actions { display: flex; gap: 6px; margin-top: 10px; }
      #sizeup-banner .su-btn {
        height: 30px; padding: 0 14px; border-radius: 8px;
        font-size: 12px; font-weight: 600; cursor: pointer;
        border: none; font-family: inherit; transition: opacity 0.15s;
      }
      #sizeup-banner .su-btn:hover { opacity: 0.85; }
      #sizeup-banner .su-primary { background: #5C35E8; color: #fff; }
      #sizeup-banner .su-brand {
        font-size: 10px; color: #C4B5FD; text-align: right; margin-top: 9px;
      }

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

  function showBar({ profile, allProfiles, isFiltered }) {
    removeBar();
    const bar = document.createElement('div');
    bar.id = BAR_ID;

    const iconUrl    = chrome.runtime.getURL('icons/icon48.png');
    const category   = getMyntraCategory();

    const cardData = allProfiles.map(p => {
      const mapped = getMyntraSizeFacet(p.measurements || {}, category);
      const sz     = deriveSizes(p.measurements || {});
      const szLabel = sz.top ? sz.top.alpha : sz.bottom ? sz.bottom.label : sz.shoe ? `UK${sz.shoe.uk}` : '?';
      const checked = p.id === profile.id && isFiltered;
      return { p, szLabel, facetValue: mapped?.facetValue || szLabel, checked };
    });

    const cards = cardData.map(({ p, szLabel, checked }) => `
      <div class="su-bar-pcard${checked ? ' active' : ''}" data-id="${p.id}">
        <span class="su-pcard-check">${checked ? '✓' : ''}</span>
        <span class="su-pcard-avatar">${p.emoji}</span>
        <span class="su-pcard-name">${p.name}</span>
        <span class="su-pcard-size-big">${szLabel}</span>
      </div>`).join('');

    bar.innerHTML = `
      <div class="su-bar-head">
        <div class="su-bar-logo"><img src="${iconUrl}" alt="" /></div>
        <span class="su-bar-heading">Filter for</span>
      </div>
      <div class="su-bar-profiles">${cards}</div>
    `;

    bar.querySelectorAll('.su-bar-pcard').forEach((card, i) => {
      const { p, facetValue, checked } = cardData[i];
      card.addEventListener('click', async () => {
        if (p.id !== profile.id) await setActiveProfile(p.id);
        // Tap checked card = clear; tap any other = apply that profile's filter
        location.href = checked ? buildClearUrl() : buildFilterUrl(facetValue);
      });
    });

    document.body.appendChild(bar);
  }

  // ── Floating banner (product pages) ──────────────────────────────────────────

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  /**
   * @param {{ results: Array<{profile, status, szLabel}>, selectEl: Element|null }} opts
   */
  function showBanner({ results, selectEl }) {
    removeBanner();
    if (!results.length) return;

    // Accent colour driven by best outcome across all profiles
    const best = results.find(r => r.status === 'avail') ||
                 results.find(r => r.status === 'unavail') ||
                 results[0];
    const accentClass = best.status;

    const tagLabel = { avail: 'Fits', unavail: 'Out of stock', unlisted: 'Not offered' };

    const cards = results.map(r => `
      <div class="su-bpc">
        <span class="su-bpc-dot ${r.status}"></span>
        <span class="su-bpc-avatar">${r.profile.emoji}</span>
        <span class="su-bpc-info">
          <span class="su-bpc-name">${r.profile.name}</span>
          <span class="su-bpc-size">${r.szLabel}</span>
        </span>
        <span class="su-bpc-tag ${r.status}">${tagLabel[r.status]}</span>
      </div>`).join('');

    const el = document.createElement('div');
    el.id = BANNER_ID;
    el.innerHTML = `
      <div class="su-accent ${accentClass}"></div>
      <div class="su-banner-body">
        <div class="su-top-row">
          <span class="su-heading">Fits available for</span>
          <button class="su-close" title="Dismiss">✕</button>
        </div>
        <div class="su-banner-profiles">${cards}</div>
        ${selectEl ? `
          <div class="su-actions">
            <button class="su-btn su-primary" id="su-select">Select size</button>
          </div>` : ''}
        <div class="su-brand">SizeUp</div>
      </div>
    `;

    el.querySelector('.su-close').addEventListener('click', removeBanner);
    if (selectEl) el.querySelector('#su-select').addEventListener('click', () => { selectEl.click(); removeBanner(); });
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

  async function handleProduct(profile, allProfiles) {
    await delay(900);

    const els = findSizeElements();
    if (!els.length) return;

    let activeSelectEl = null;

    const results = allProfiles.map(p => {
      const labels = getSizeLabels(p.measurements || {});
      if (!labels.length) return null;

      const sz      = deriveSizes(p.measurements || {});
      const szLabel = sz.top    ? `${sz.top.alpha} · ${sz.top.numeric}` :
                      sz.bottom ? `Waist ${sz.bottom.label}` :
                      sz.shoe   ? `UK ${sz.shoe.uk}` : '?';

      for (const el of els) {
        const text = sizeText(el);
        if (!text || !sizeMatches(text, labels)) continue;
        const avail = !isUnavailable(el);
        if (p.id === profile.id) {
          el.classList.add('sizeup-match');
          if (avail) activeSelectEl = el;
        }
        return { profile: p, status: avail ? 'avail' : 'unavail', szLabel };
      }
      return { profile: p, status: 'unlisted', szLabel };
    }).filter(Boolean);

    if (!results.length) return;
    showBanner({ results, selectEl: activeSelectEl });
  }

  async function handleListing(profile, allProfiles) {
    if (site() !== 'myntra') return;

    const category = getMyntraCategory();
    const mapped   = getMyntraSizeFacet(profile.measurements || {}, category);
    if (!mapped) return;

    const currentFacet = getCurrentFacet();
    const isFiltered   = currentFacet?.toLowerCase() === mapped.facetValue.toLowerCase();

    showBar({ profile, allProfiles, isFiltered });
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  async function init() {
    if (!site()) return;

    const data = await getStorageData();
    if (data.learnMode) await clearLearnMode();

    const { profiles, activeProfileId } = data;
    const profile = profiles?.find(p => p.id === activeProfileId);
    if (!profile) { cleanup(); return; }

    injectStyles();
    clearHighlights();

    if (onProductPage()) {
      removeBar();
      await handleProduct(profile, profiles);
    } else if (onListingPage()) {
      removeBanner();
      await handleListing(profile, profiles);
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
