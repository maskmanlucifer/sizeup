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
   * Returns the best size element matching any of `labels`: an in-stock one if
   * present, else the first match, else null. Prevents a sold-out duplicate
   * from masking an available size.
   * @param {NodeList|Element[]} els
   * @param {string[]} labels
   * @param {Object} platform
   * @returns {Element|null}
   */
  function _pickMatch(els, labels, platform) {
    if (!labels.length) return null;
    let firstMatch = null;
    for (const el of els) {
      const text = platform.sizeText(el);
      if (!text || !sizeMatches(text, labels)) continue;
      if (!firstMatch) firstMatch = el;
      if (!platform.isUnavailable(el)) return el;
    }
    return firstMatch;
  }

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

    // Restrict to the page's category so a top's numeric size can't cross-match
    // a bottom's waist size (both use 38/40/42), and vice versa.
    const category = categoryFromPath(location.pathname);

    const results = allProfiles.map(p => {
      const { exact, adjacent } = getSizeLabelsExtended(p.measurements || {}, category);
      if (!exact.length && !adjacent.length) return null;

      const sz = deriveSizes(p.measurements || {});
      const szLabel = category === 'bottom'
        ? (sz.bottom ? `Waist ${sz.bottom.label}` : '?')
        : (sz.top ? `${sz.top.alpha} · ${sz.top.numeric}` : '?');

      // Pick the element(s) matching exact labels, preferring an in-stock one so
      // a sold-out duplicate doesn't mask an available size.
      const exactEl = _pickMatch(els, exact, platform);
      if (exactEl) {
        const avail = !platform.isUnavailable(exactEl);
        return { profile: p, status: avail ? 'avail' : 'unavail', matchType: 'exact', szLabel };
      }

      // Adjacent match — handles brand size variation (e.g. "L" here = "XL" elsewhere)
      const adjEl = _pickMatch(els, adjacent, platform);
      if (adjEl) {
        const avail = !platform.isUnavailable(adjEl);
        return { profile: p, status: avail ? 'avail' : 'unavail', matchType: 'adjacent', szLabel, matchedSize: platform.sizeText(adjEl).toUpperCase() };
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
