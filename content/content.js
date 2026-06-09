/**
 * SizeUp content script.
 * Runs on Myntra, Amazon India, Flipkart.
 * Depends on: size-charts.js, storage.js (loaded before this via manifest).
 */
(function () {
  'use strict';

  const BANNER_ID = 'sizeup-banner';
  const STYLES_ID = 'sizeup-styles';

  // ── Injected CSS ────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
      #sizeup-banner {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #fff;
        border: 1.5px solid #E5E7EB;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.13);
        padding: 12px 14px;
        max-width: 270px;
        min-width: 220px;
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
      #sizeup-banner .su-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
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
      #sizeup-banner .su-brand {
        font-size: 10px; color: #9CA3AF; text-align: right;
        margin-top: 8px; letter-spacing: 0.3px;
      }
      .sizeup-match {
        outline: 2.5px solid #5C35E8 !important;
        outline-offset: 2px;
      }
      /* Learn-mode size picker */
      #sizeup-banner .su-learn-sizes {
        display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;
      }
      #sizeup-banner .su-size-opt {
        height: 30px; padding: 0 12px;
        border: 1.5px solid #E5E7EB; border-radius: 6px;
        background: #fff; cursor: pointer;
        font-size: 12px; font-weight: 500; font-family: inherit;
        color: #111827;
        transition: border-color 0.12s, background 0.12s;
      }
      #sizeup-banner .su-size-opt:hover {
        border-color: #5C35E8; background: #EDE9FE; color: #5C35E8;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Banner ──────────────────────────────────────────────────────────────────

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  /**
   * @param {{ icon: string, msg: string, sub?: string, actions?: Array }} opts
   */
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
          ${actions.map(a => `
            <button class="su-btn ${a.primary ? 'su-primary' : 'su-secondary'}" data-id="${a.id}">
              ${a.label}
            </button>`).join('')}
        </div>` : ''}
      <div class="su-brand">SizeUp</div>
    `;

    el.querySelector('.su-close').addEventListener('click', removeBanner);
    actions?.forEach(a => {
      el.querySelector(`[data-id="${a.id}"]`)?.addEventListener('click', a.onClick);
    });

    document.body.appendChild(el);
  }

  // ── Highlights ──────────────────────────────────────────────────────────────

  function clearHighlights() {
    document.querySelectorAll('.sizeup-match').forEach(el => el.classList.remove('sizeup-match'));
  }

  // ── Site detection ──────────────────────────────────────────────────────────

  const host = location.hostname;

  function site() {
    if (host.includes('myntra.com'))  return 'myntra';
    if (host.includes('amazon.in'))   return 'amazon';
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
      case 'myntra':   return !onProductPage() && location.pathname.length > 1;
      case 'amazon':   return /^\/s/.test(location.pathname) || location.search.includes('k=');
      case 'flipkart': return location.pathname === '/search' || /\/[a-z-]+\/pr\b/i.test(location.pathname);
    }
    return false;
  }

  // ── Size element finders ────────────────────────────────────────────────────

  function findSizeElements() {
    switch (site()) {
      case 'myntra':
        return document.querySelectorAll('.size-buttons-unified-size .size-buttons-size-button');

      case 'amazon': {
        // Button tile grid (most clothing)
        const grid = document.querySelectorAll('#variation_size_name .a-button:not(.a-button-toggle)');
        if (grid.length) return grid;
        // Native dropdown fallback
        const sel = document.querySelector('#native_dropdown_selected_size_name, #variation_size_name select');
        return sel ? sel.querySelectorAll('option:not([value=""])') : [];
      }

      case 'flipkart': {
        // Try known class patterns; they change periodically
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

  /** Semantic fallback: find button-like elements near a "Size" label. */
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
    const cls = el.className || '';
    switch (site()) {
      case 'myntra':
        return cls.includes('size-buttons-size-button-not-available') ||
               (el.parentElement?.className || '').includes('size-buttons-size-button-not-available');
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

  // ── Page handlers ───────────────────────────────────────────────────────────

  async function handleProduct(profile) {
    await delay(600); // let React/SPA render size options

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
      break; // highlight first match only
    }

    if (!matchEl) return; // not a standard-sized item

    const sz = deriveSizes(profile.measurements || {});
    const label = sz.top  ? `${sz.top.alpha} / ${sz.top.numeric}` :
                  sz.bottom ? sz.bottom.label :
                  sz.shoe   ? `UK ${sz.shoe.uk}` : '';

    if (available) {
      showBanner({
        icon: '🟢',
        msg: `${profile.name}'s size available`,
        sub: label ? `${label} · highlighted above` : 'Highlighted above',
        actions: [{
          id: 'sel', label: 'Select size', primary: true,
          onClick: () => { matchEl.click(); removeBanner(); },
        }],
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
    // URL-based size filter only works reliably on Myntra for MVP
    if (site() !== 'myntra') return;

    const sz = deriveSizes(profile.measurements || {});
    if (!sz.top) return;

    const alpha = sz.top.alpha;
    const url = new URL(location.href);
    const current = (url.searchParams.get('sizes') || '').toLowerCase().split(',').map(s => s.trim());

    if (current.includes(alpha.toLowerCase())) return; // already filtered

    const filtered = new URL(location.href);
    filtered.searchParams.set('sizes', alpha);

    showBanner({
      icon: '📐',
      msg: `Filter for ${profile.name}?`,
      sub: `Show only size ${alpha} products`,
      actions: [
        {
          id: 'apply', label: `Show ${alpha} only`, primary: true,
          onClick: () => { location.href = filtered.toString(); },
        },
        {
          id: 'skip', label: 'Not now', primary: false,
          onClick: removeBanner,
        },
      ],
    });
  }

  // ── Learn-from-purchase ──────────────────────────────────────────────────────

  /** Detects category from a set of size text labels. */
  function detectCategory(texts) {
    const n = texts.map(t => t.toLowerCase().trim());
    if (n.some(t => /uk\s*\d/.test(t))) return 'shoe';
    // Bottoms: all-numeric in typical waist range (24–44)
    if (n.length > 0 && n.every(t => /^\d{2}$/.test(t) && +t >= 24 && +t <= 44)) return 'bottom';
    return 'top';
  }

  async function handleLearnMode(learnData) {
    if (!onProductPage()) return; // only act on product pages

    await delay(800);

    const els = findSizeElements();
    if (!els.length) return;

    // Collect only available sizes
    const available = [];
    for (const el of els) {
      const text = sizeText(el);
      if (text && !isSizeUnavailable(el)) available.push(text);
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

  // ── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    if (!site()) return;

    // Learn-mode takes priority over regular filtering
    const data = await getStorageData();
    if (data.learnMode) {
      await handleLearnMode(data.learnMode);
      return;
    }

    const profile = await getActiveProfile();
    if (!profile) return;

    injectStyles();
    clearHighlights();

    if (onProductPage()) {
      await handleProduct(profile);
    } else if (onListingPage()) {
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
      removeBanner();
      clearHighlights();
      init();
    }
  }).observe(document.body, { subtree: true, childList: true });

  // Re-run when active profile changes from popup
  chrome.storage.onChanged.addListener(changes => {
    if (changes[STORAGE_KEY]) {
      removeBanner();
      clearHighlights();
      init();
    }
  });

  init();
})();
