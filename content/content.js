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
        padding: 13px 14px 13px;
      }
      #sizeup-bar .su-bar-head {
        display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
      }
      #sizeup-bar .su-bar-logo img {
        width: 15px; height: 15px; object-fit: contain;
        filter: brightness(0) invert(1); display: block;
      }
      #sizeup-bar .su-bar-wordmark {
        font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
        opacity: 0.65; text-transform: uppercase;
      }
      #sizeup-bar .su-bar-size {
        font-size: 24px; font-weight: 800; letter-spacing: -0.5px;
        line-height: 1; margin-bottom: 2px;
      }
      #sizeup-bar .su-bar-size-sub {
        font-size: 11px; opacity: 0.7; margin-bottom: 0;
      }
      #sizeup-bar .su-bar-filtered-tag {
        display: inline-flex; align-items: center; gap: 3px;
        font-size: 10px; font-weight: 600;
        background: rgba(255,255,255,0.18); border-radius: 999px;
        padding: 2px 8px; margin-top: 4px; opacity: 0.9;
      }
      #sizeup-bar .su-bar-btn {
        display: block; width: 100%; height: 32px;
        border-radius: 8px; font-size: 12px; font-weight: 700;
        cursor: pointer; border: none; font-family: inherit;
        margin-top: 11px; transition: opacity 0.15s; text-align: center;
      }
      #sizeup-bar .su-bar-btn:hover { opacity: 0.88; }
      #sizeup-bar .su-bar-apply { background: #fff; color: #5C35E8; }
      #sizeup-bar .su-bar-clear {
        background: rgba(255,255,255,0.15); color: #fff;
        border: 1px solid rgba(255,255,255,0.3);
      }

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
        justify-content: space-between; margin-bottom: 2px;
      }
      #sizeup-banner .su-hero {
        font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #111827;
        line-height: 1;
      }
      #sizeup-banner .su-hero-sub {
        font-size: 12px; color: #6B7280; margin-top: 3px; margin-bottom: 10px;
      }
      #sizeup-banner .su-close {
        background: none; border: none; cursor: pointer;
        color: #9CA3AF; font-size: 15px; padding: 0; line-height: 1; flex-shrink: 0;
        margin-top: 2px;
      }
      #sizeup-banner .su-close:hover { color: #374151; }
      #sizeup-banner .su-actions { display: flex; gap: 6px; margin-top: 11px; }
      #sizeup-banner .su-btn {
        height: 30px; padding: 0 14px; border-radius: 8px;
        font-size: 12px; font-weight: 600; cursor: pointer;
        border: none; font-family: inherit; transition: opacity 0.15s;
      }
      #sizeup-banner .su-btn:hover { opacity: 0.85; }
      #sizeup-banner .su-primary { background: #5C35E8; color: #fff; }
      #sizeup-banner .su-secondary { background: #F3F4F6; color: #374151; }
      #sizeup-banner .su-brand {
        font-size: 10px; color: #C4B5FD; text-align: right; margin-top: 9px;
      }

      /* ── Profile switcher chips (shared, different themes) ── */
      .su-profiles {
        display: flex; gap: 5px; flex-wrap: wrap;
        padding-top: 9px; margin-top: 9px;
      }
      #sizeup-bar    .su-profiles { border-top: 1px solid rgba(255,255,255,0.18); }
      #sizeup-banner .su-profiles { border-top: 1px solid #F0EEFF; }
      .su-profile-chip {
        height: 24px; padding: 0 9px; border-radius: 999px;
        font-size: 11px; font-weight: 500; cursor: pointer;
        font-family: inherit; white-space: nowrap; transition: all 0.12s;
      }
      #sizeup-bar .su-profile-chip {
        background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.8);
        border: 1px solid rgba(255,255,255,0.28);
      }
      #sizeup-bar .su-profile-chip.active {
        background: #fff; color: #5C35E8; border-color: transparent; font-weight: 700;
      }
      #sizeup-banner .su-profile-chip {
        background: #F5F3FF; color: #6B7280; border: 1px solid #E9E6FF;
      }
      #sizeup-banner .su-profile-chip.active {
        background: #EDE9FE; color: #5C35E8; border-color: #5C35E8; font-weight: 700;
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

  function profileChipsHtml(profiles, activeId) {
    return profiles.map(p =>
      `<button class="su-profile-chip${p.id === activeId ? ' active' : ''}" data-id="${p.id}">${p.emoji} ${p.name}</button>`
    ).join('');
  }

  function attachProfileChips(el, activeId) {
    el.querySelectorAll('.su-profile-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        if (chip.dataset.id === activeId) return;
        await setActiveProfile(chip.dataset.id);
        cleanup(); init();
      });
    });
  }

  function showBar({ profile, allProfiles, sizeLabel, facetValue, isFiltered }) {
    removeBar();
    const bar = document.createElement('div');
    bar.id = BAR_ID;

    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    bar.innerHTML = `
      <div class="su-bar-head">
        <div class="su-bar-logo"><img src="${iconUrl}" alt="SizeUp" /></div>
        <span class="su-bar-wordmark">SizeUp</span>
      </div>
      <div class="su-bar-size">${sizeLabel}</div>
      <div class="su-bar-size-sub">${isFiltered ? '✓ Filtered' : 'Your size'}</div>
      <div class="su-profiles">${profileChipsHtml(allProfiles, profile.id)}</div>
      ${isFiltered
        ? `<button class="su-bar-btn su-bar-clear" id="su-clear">Clear filter</button>`
        : `<button class="su-bar-btn su-bar-apply" id="su-apply">Filter by ${sizeLabel}</button>`
      }
    `;

    if (isFiltered) {
      bar.querySelector('#su-clear').addEventListener('click', () => { location.href = buildClearUrl(); });
    } else {
      bar.querySelector('#su-apply').addEventListener('click', () => { location.href = buildFilterUrl(facetValue); });
    }
    attachProfileChips(bar, profile.id);
    document.body.appendChild(bar);
  }

  // ── Floating banner (product pages) ──────────────────────────────────────────

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  function showBanner({ accentClass, hero, sub, actions, profiles, activeProfileId }) {
    removeBanner();
    const el = document.createElement('div');
    el.id = BANNER_ID;
    el.innerHTML = `
      <div class="su-accent ${accentClass}"></div>
      <div class="su-banner-body">
        <div class="su-top-row">
          <div class="su-hero">${hero}</div>
          <button class="su-close" title="Dismiss">✕</button>
        </div>
        ${sub ? `<div class="su-hero-sub">${sub}</div>` : ''}
        ${profiles?.length ? `<div class="su-profiles">${profileChipsHtml(profiles, activeProfileId)}</div>` : ''}
        ${actions?.length ? `
          <div class="su-actions">
            ${actions.map(a => `<button class="su-btn ${a.primary ? 'su-primary' : 'su-secondary'}" data-id="${a.id}">${a.label}</button>`).join('')}
          </div>` : ''}
        <div class="su-brand">SizeUp</div>
      </div>
    `;
    el.querySelector('.su-close').addEventListener('click', removeBanner);
    actions?.forEach(a => el.querySelector(`[data-id="${a.id}"]`)?.addEventListener('click', a.onClick));
    if (profiles?.length) attachProfileChips(el, activeProfileId);
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

    const sz = deriveSizes(profile.measurements || {});
    const sizeHero = sz.top    ? sz.top.alpha :
                     sz.bottom ? sz.bottom.label :
                     sz.shoe   ? `UK ${sz.shoe.uk}` : '?';
    const sizeSub  = sz.top    ? sz.top.numeric :
                     sz.bottom ? 'Waist' : '';

    const sharedProps = { profiles: allProfiles, activeProfileId: profile.id };

    if (!matchEl) {
      showBanner({
        accentClass: 'unlisted',
        hero: sizeHero,
        sub: `Not offered on this product`,
        ...sharedProps,
      });
      return;
    }

    if (available) {
      showBanner({
        accentClass: 'avail',
        hero: `${sizeHero} fits ${profile.name}`,
        sub: sizeSub ? `${sizeSub} · highlighted above` : 'Highlighted above',
        actions: [{ id: 'sel', label: 'Select size', primary: true, onClick: () => { matchEl.click(); removeBanner(); } }],
        ...sharedProps,
      });
    } else {
      showBanner({
        accentClass: 'unavail',
        hero: `${sizeHero} out of stock`,
        sub: `${profile.name}'s size isn't available`,
        ...sharedProps,
      });
    }
  }

  async function handleListing(profile, allProfiles) {
    if (site() !== 'myntra') return;

    const category = getMyntraCategory();
    const mapped = getMyntraSizeFacet(profile.measurements || {}, category);
    if (!mapped) return;

    const { sizeLabel, facetValue } = mapped;
    const currentFacet = getCurrentFacet();
    const isFiltered = currentFacet?.toLowerCase() === facetValue.toLowerCase();

    showBar({ profile, allProfiles, sizeLabel, facetValue, isFiltered });
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
