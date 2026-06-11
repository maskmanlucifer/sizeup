/**
 * SizeUp content script — orchestrator.
 * Depends on (loaded before this via manifest):
 *   utils/size-charts.js, utils/storage.js,
 *   content/platforms/myntra.js, content/platforms/flipkart.js,
 *   content/platforms/amazon.js, content/ui.js
 */
(function () {
  'use strict';

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

  // Once a widget is dismissed, it stays hidden for the rest of the tab session
  let _barDismissed    = false;
  let _bannerDismissed = false;

  /**
   * Finds size elements for all profiles, matches using exact then adjacent size
   * labels to handle brand-specific size variation, and shows the banner.
   *
   * @param {Object[]} allProfiles - all profiles to display
   */
  async function handleProduct(allProfiles) {
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
                      sz.bottom ? `Waist ${sz.bottom.label}` : '?';

      // Try exact match first
      for (const el of els) {
        const text = platform.sizeText(el);
        if (!text || !sizeMatches(text, exact)) continue;
        const avail = !platform.isUnavailable(el);
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

  /**
   * Builds profile card data for the listing bar and wires up toggle clicks.
   * Each card click toggles that profile's size facet in/out of the URL filter.
   *
   * @param {Object[]} allProfiles
   */
  async function handleListing(allProfiles) {
    const platform = getPlatform();
    const activeFacets = platform.getCurrentFilters();

    const cardData = allProfiles.map(p => {
      const facet = platform.getSizeFacet(p.measurements || {});
      if (!facet) return null;
      const sz      = deriveSizes(p.measurements || {});
      const szLabel = sz.top ? sz.top.alpha : sz.bottom ? sz.bottom.label : '?';
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

    const { profiles } = data;
    if (!profiles?.length) { cleanup(); return; }

    SizeUpUI.injectStyles();
    SizeUpUI.clearHighlights();

    if (platform.onProductPage()) {
      SizeUpUI.removeBar();
      if (!_bannerDismissed) await handleProduct(profiles);
    } else if (platform.onListingPage()) {
      SizeUpUI.removeBanner();
      if (!_barDismissed) await handleListing(profiles);
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
