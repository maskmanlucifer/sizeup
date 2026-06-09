/**
 * SizeUp UI — injects styles and renders the listing bar + product banner.
 * Pure rendering: no platform or storage dependencies.
 */
const SizeUpUI = (() => {

  const BAR_ID     = 'sizeup-bar';
  const BANNER_ID  = 'sizeup-banner';
  const STYLES_ID  = 'sizeup-styles';

  // ── Styles ──────────────────────────────────────────────────────────────────

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
        min-width: 260px; max-width: 300px;
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
        opacity: 0.7; text-transform: uppercase; flex: 1;
      }
      #sizeup-bar .su-bar-close {
        background: none; border: none; cursor: pointer;
        color: rgba(255,255,255,0.45); font-size: 13px; padding: 0; line-height: 1; flex-shrink: 0;
      }
      #sizeup-bar .su-bar-close:hover { color: #fff; }
      /* profile cards */
      #sizeup-bar .su-bar-profiles {
        display: flex; flex-direction: column; gap: 5px;
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
      #sizeup-banner .su-accent { height: 4px; }
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
        border: 1px solid #F0EEFF; border-radius: 10px;
        padding: 10px 12px; background: #FAFAFF;
      }
      #sizeup-banner .su-bpc-dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      }
      #sizeup-banner .su-bpc-dot.avail    { background: #22C55E; }
      #sizeup-banner .su-bpc-dot.unavail  { background: #EF4444; }
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
      #sizeup-banner .su-bpc-tag.avail    { background: #DCFCE7; color: #15803D; }
      #sizeup-banner .su-bpc-tag.adjacent { background: #FEF3C7; color: #92400E; }
      #sizeup-banner .su-bpc-tag.unavail  { background: #FEE2E2; color: #B91C1C; }
      #sizeup-banner .su-bpc-tag.unlisted { background: #F3F4F6; color: #6B7280; }
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

  // ── Listing bar ─────────────────────────────────────────────────────────────

  function removeBar() {
    document.getElementById(BAR_ID)?.remove();
  }

  /**
   * Renders the listing bar with multi-select profile cards and a dismiss button.
   *
   * @param {{
   *   cardData:    Array<{ profile: Object, szLabel: string, facetValue: string, checked: boolean }>,
   *   onCardClick: (facetValue: string, checked: boolean) => void,
   *   onDismiss:   () => void
   * }} opts
   */
  function showBar({ cardData, onCardClick, onDismiss }) {
    removeBar();
    const bar     = document.createElement('div');
    bar.id        = BAR_ID;
    const iconUrl = chrome.runtime.getURL('icons/icon48.png');

    const cards = cardData.map(({ profile, szLabel, checked }) => `
      <div class="su-bar-pcard${checked ? ' active' : ''}">
        <span class="su-pcard-check">${checked ? '✓' : ''}</span>
        <span class="su-pcard-avatar">${profile.emoji}</span>
        <span class="su-pcard-name">${profile.name}</span>
        <span class="su-pcard-size-big">${szLabel}</span>
      </div>`).join('');

    bar.innerHTML = `
      <div class="su-bar-head">
        <div class="su-bar-logo"><img src="${iconUrl}" alt="" /></div>
        <span class="su-bar-heading">Filter for</span>
        <button class="su-bar-close" title="Dismiss">✕</button>
      </div>
      <div class="su-bar-profiles">${cards}</div>
    `;

    bar.querySelectorAll('.su-bar-pcard').forEach((card, i) => {
      const { facetValue, checked } = cardData[i];
      card.addEventListener('click', () => onCardClick(facetValue, checked));
    });
    bar.querySelector('.su-bar-close').addEventListener('click', () => {
      removeBar();
      onDismiss();
    });

    document.body.appendChild(bar);
  }

  // ── Product banner ──────────────────────────────────────────────────────────

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  /**
   * Renders the floating product banner showing fit status for each profile.
   *
   * @param {{
   *   results:   Array<{ profile: Object, status: 'avail'|'unavail'|'unlisted', matchType: 'exact'|'adjacent', szLabel: string }>,
   *   onDismiss: () => void
   * }} opts
   */
  function showBanner({ results, onDismiss }) {
    removeBanner();
    if (!results.length) return;

    const best = results.find(r => r.status === 'avail') ||
                 results.find(r => r.status === 'unavail') ||
                 results[0];

    const cards = results.map(r => {
      const tagClass = r.status === 'avail' && r.matchType === 'adjacent' ? 'adjacent' : r.status;
      const tagText  = _tagLabel(r.status, r.matchType, r.matchedSize);
      return `
        <div class="su-bpc">
          <span class="su-bpc-dot ${r.status}"></span>
          <span class="su-bpc-avatar">${r.profile.emoji}</span>
          <span class="su-bpc-info">
            <span class="su-bpc-name">${r.profile.name}</span>
            <span class="su-bpc-size">${r.szLabel}</span>
          </span>
          <span class="su-bpc-tag ${tagClass}">${tagText}</span>
        </div>`;
    }).join('');

    const el  = document.createElement('div');
    el.id     = BANNER_ID;
    el.innerHTML = `
      <div class="su-accent ${best.status}"></div>
      <div class="su-banner-body">
        <div class="su-top-row">
          <span class="su-heading">Fits available for</span>
          <button class="su-close" title="Dismiss">✕</button>
        </div>
        <div class="su-banner-profiles">${cards}</div>
        <div class="su-brand">SizeUp</div>
      </div>
    `;

    el.querySelector('.su-close').addEventListener('click', () => {
      removeBanner();
      onDismiss();
    });
    document.body.appendChild(el);
  }

  /**
   * @param {'avail'|'unavail'|'unlisted'} status
   * @param {'exact'|'adjacent'} matchType
   * @param {string} [matchedSize] - the size label found on the page (adjacent only)
   * @returns {string}
   */
  function _tagLabel(status, matchType, matchedSize) {
    if (status === 'unlisted') return 'Not offered';
    if (status === 'unavail')  return 'Out of stock';
    if (matchType === 'adjacent') return matchedSize ? `May fit (${matchedSize})` : 'May fit';
    return 'Fits';
  }

  // ── Highlights ──────────────────────────────────────────────────────────────

  function clearHighlights() {
    document.querySelectorAll('.sizeup-match').forEach(el => el.classList.remove('sizeup-match'));
  }

  // ── Public interface ────────────────────────────────────────────────────────

  return { injectStyles, showBar, removeBar, showBanner, removeBanner, clearHighlights };
})();
