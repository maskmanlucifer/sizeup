/**
 * SizeUp content script — orchestrator.
 * Depends on (loaded before this via manifest):
 *   utils/size-charts.js, utils/storage.js,
 *   content/platforms/myntra.js, content/platforms/flipkart.js,
 *   content/platforms/amazon.js, content/ui.js
 */
(function () {
  'use strict';

  // ── Platform registry ───────────────────────────────────────────────────────

  const PLATFORMS = {
    myntra:   MyntraPlatform,
    flipkart: FlipkartPlatform,
    amazon:   AmazonPlatform,
  };

  /** @returns {Object|null} the adapter for the current hostname */
  function getPlatform() {
    const host = location.hostname;
    if (host.includes('myntra.com'))   return PLATFORMS.myntra;
    if (host.includes('amazon.in'))    return PLATFORMS.amazon;
    if (host.includes('flipkart.com')) return PLATFORMS.flipkart;
    return null;
  }

  // ── Session dismissal state ─────────────────────────────────────────────────

  // Once a widget is dismissed, it stays hidden for the rest of the tab session
  let _barDismissed    = false;
  let _bannerDismissed = false;

  // ── Product page handler ────────────────────────────────────────────────────

  /**
   * Finds size elements for all profiles, matches using exact then adjacent size
   * labels to handle brand-specific size variation, and shows the banner.
   *
   * @param {Object}   profile     - active profile
   * @param {Object[]} allProfiles - all profiles to display
   */
  async function handleProduct(profile, allProfiles) {
    // Amazon renders its size twister late — give it extra time
    const platform = getPlatform();
    const isAmazon = location.hostname.includes('amazon');
    await _delay(isAmazon ? 1500 : 900);

    let els = platform.findSizeElements();
    // One retry for pages that render size widgets slowly
    if (!els.length) {
      await _delay(800);
      els = platform.findSizeElements();
    }
    if (!els.length) return;

    const results = allProfiles.map(p => {
      const { exact, adjacent } = getSizeLabelsExtended(p.measurements || {});
      if (!exact.length && !adjacent.length) return null;

      const sz      = deriveSizes(p.measurements || {});
      const szLabel = sz.top    ? `${sz.top.alpha} · ${sz.top.numeric}` :
                      sz.bottom ? `Waist ${sz.bottom.label}` :
                      sz.shoe   ? `UK ${sz.shoe.uk}` : '?';

      // Try exact match first
      for (const el of els) {
        const text = platform.sizeText(el);
        if (!text || !sizeMatches(text, exact)) continue;
        const avail = !platform.isUnavailable(el);
        if (p.id === profile.id) el.classList.add('sizeup-match');
        return { profile: p, status: avail ? 'avail' : 'unavail', matchType: 'exact', szLabel };
      }

      // Adjacent match — handles brand size variation (e.g. "L" here = "XL" on another brand)
      for (const el of els) {
        const text = platform.sizeText(el);
        if (!text || !sizeMatches(text, adjacent)) continue;
        const avail = !platform.isUnavailable(el);
        return { profile: p, status: avail ? 'avail' : 'unavail', matchType: 'adjacent', szLabel, matchedSize: text.toUpperCase() };
      }

      return { profile: p, status: 'unlisted', matchType: 'exact', szLabel };
    }).filter(Boolean);

    if (!results.length) return;

    SizeUpUI.showBanner({
      results,
      onDismiss() { _bannerDismissed = true; },
    });
  }

  // ── Listing page handler ────────────────────────────────────────────────────

  /**
   * Builds profile card data for the listing bar and wires up toggle clicks.
   * Each card click toggles that profile's size facet in/out of the URL filter.
   *
   * @param {Object}   profile     - active profile
   * @param {Object[]} allProfiles
   */
  async function handleListing(profile, allProfiles) {
    const platform = getPlatform();

    // Only show bar when the platform supports listing filters
    if (!platform.getSizeFacet(profile.measurements || {})) return;

    const activeFacets = platform.getCurrentFilters();

    const cardData = allProfiles.map(p => {
      const facet = platform.getSizeFacet(p.measurements || {});
      if (!facet) return null;
      const sz      = deriveSizes(p.measurements || {});
      const szLabel = sz.top ? sz.top.alpha : sz.bottom ? sz.bottom.label : sz.shoe ? `UK${sz.shoe.uk}` : '?';
      return {
        profile:    p,
        szLabel,
        facetValue: facet.facetValue,
        checked:    activeFacets.has(facet.facetValue.toLowerCase()),
      };
    }).filter(Boolean);

    if (!cardData.length) return;

    SizeUpUI.showBar({
      cardData,
      onDismiss() { _barDismissed = true; },
      onCardClick(facetValue, checked) {
        _navigating = true;
        const next = new Set(activeFacets);
        if (checked) next.delete(facetValue.toLowerCase());
        else         next.add(facetValue.toLowerCase());
        const nextValues = cardData
          .filter(cd => next.has(cd.facetValue.toLowerCase()))
          .map(cd => cd.facetValue);
        location.href = platform.buildFilterUrl(nextValues);
      },
    });
  }

  // ── Init + SPA watcher ──────────────────────────────────────────────────────

  function cleanup() {
    SizeUpUI.removeBar();
    SizeUpUI.removeBanner();
    SizeUpUI.clearHighlights();
  }

  async function init() {
    const platform = getPlatform();
    if (!platform) return;

    const data = await getStorageData();
    if (data.learnMode) await clearLearnMode();

    const { profiles, activeProfileId } = data;
    const profile = profiles?.find(p => p.id === activeProfileId);
    if (!profile) { cleanup(); return; }

    SizeUpUI.injectStyles();
    SizeUpUI.clearHighlights();

    if (platform.onProductPage()) {
      SizeUpUI.removeBar();
      if (!_bannerDismissed) await handleProduct(profile, profiles);
    } else if (platform.onListingPage()) {
      SizeUpUI.removeBanner();
      if (!_barDismissed) await handleListing(profile, profiles);
    }
  }

  function _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Suppress re-init when intentionally navigating away via filter card click
  let _navigating = false;

  // Re-run on SPA navigation (debounced so rapid DOM mutations don't multi-fire)
  let _lastUrl  = location.href;
  let _navTimer = null;
  new MutationObserver(() => {
    if (_navigating) return;
    if (location.href !== _lastUrl) {
      _lastUrl = location.href;
      clearTimeout(_navTimer);
      _navTimer = setTimeout(() => { cleanup(); init(); }, 120);
    }
  }).observe(document.body, { subtree: true, childList: true });

  // Re-run when active profile changes from the popup
  chrome.storage.onChanged.addListener(changes => {
    if (_navigating) return;
    if (changes[STORAGE_KEY]) { cleanup(); init(); }
  });

  init();
})();
