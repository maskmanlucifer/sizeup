/**
 * SizeUp UI — injects styles and renders the listing bar + product banner.
 * Pure rendering: no platform or storage dependencies.
 */
const SizeUpUI = (() => {

  const BAR_ID     = 'sizeup-bar';
  const BANNER_ID  = 'sizeup-banner';
  const STYLES_ID  = 'sizeup-styles';

  /** Purple rounded-square brand mark (bar-chart glyph), matching the popup. */
  const MARK = `<span class="su-mark"><svg width="13" height="13" viewBox="0 0 16 16"><g fill="#fff"><rect x="3" y="9" width="2.4" height="4" rx="1.2"/><rect x="6.8" y="6" width="2.4" height="7" rx="1.2"/><rect x="10.6" y="3.5" width="2.4" height="9.5" rx="1.2"/></g></svg></span>`;

  /** Close (✕) icon. */
  const X_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

  /** White check used in the selected filter checkbox. */
  const CHECK_ICON = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`;

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
        background: #fff; color: #1C1E26;
        border: 1px solid #E7E9EF; border-radius: 10px;
        box-shadow: 0 18px 40px -12px rgba(28,28,55,0.34);
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px; overflow: hidden;
        width: 238px;
        animation: su-in 0.18s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes su-in {
        from { transform: translateY(-6px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }

      /* Looping bluish ray that travels around the card border. */
      @property --su-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
      #sizeup-bar::after, #sizeup-banner::after {
        content: ''; position: absolute; inset: 0;
        pointer-events: none; border-radius: inherit; padding: 1.5px;
        background: conic-gradient(from var(--su-angle),
          transparent 0%, transparent 72%,
          rgba(91,141,239,0.0) 78%,
          #5B8DEF 88%, #AFCBFF 93%, #5B8DEF 97%,
          transparent 100%);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        animation: su-ray 3s linear infinite;
      }
      @keyframes su-ray { to { --su-angle: 360deg; } }
      @media (prefers-reduced-motion: reduce) {
        #sizeup-bar::after, #sizeup-banner::after { display: none; }
      }

      /* ── Shared header / footer ── */
      #sizeup-bar .su-head, #sizeup-banner .su-head {
        display: flex; align-items: center; gap: 7px;
        padding: 12px; border-bottom: 1px solid #F0F1F4;
      }
      #sizeup-bar .su-mark, #sizeup-banner .su-mark {
        width: 22px; height: 22px; border-radius: 7px; background: #6C4DF6;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      #sizeup-bar .su-head-title, #sizeup-banner .su-head-title {
        font-size: 12.5px; font-weight: 800; flex: 1; white-space: nowrap;
      }
      #sizeup-bar .su-close, #sizeup-banner .su-close {
        width: 12px; height: 20px; flex-shrink: 0;
        border: none; background: transparent; border-radius: 3px;
        color: #A6ABB5; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: 0.12s;
      }
      #sizeup-bar .su-close:hover, #sizeup-banner .su-close:hover { background: #F1F2F5; color: #5B6170; }
      #sizeup-bar .su-foot, #sizeup-banner .su-foot {
        padding: 8px 12px; border-top: 1px solid #F0F1F4;
        font-size: 10.5px; font-weight: 600; color: #8A909E;
      }

      /* ── Listing filter card ── */
      #sizeup-bar .su-bar-profiles {
        display: flex; flex-direction: column; gap: 2px; padding: 5px 8px 6px;
      }
      #sizeup-bar .su-bar-pcard {
        width: 100%; display: flex; align-items: center; gap: 10px;
        padding: 8px 14px 8px 10px; border: none; border-radius: 5px; background: #fff;
        cursor: pointer; text-align: left; font-family: inherit;
        transition: background 0.12s;
      }
      #sizeup-bar .su-bar-pcard:hover { background: #F4F2FE; }
      #sizeup-bar .su-bar-pcard.active { background: #F4F2FE; }
      #sizeup-bar .su-bar-pcard:hover .su-pcard-size,
      #sizeup-bar .su-bar-pcard.active .su-pcard-size { background: #fff; }
      #sizeup-bar .su-pcard-check {
        width: 17px; height: 17px; flex-shrink: 0;
        border: 1.5px solid #D5D7DF; border-radius: 5px; background: #fff;
        display: flex; align-items: center; justify-content: center; transition: 0.12s;
      }
      #sizeup-bar .su-bar-pcard.active .su-pcard-check { background: #6C4DF6; border-color: #6C4DF6; }
      #sizeup-bar .su-pcard-avatar { font-size: 16px; line-height: 1; flex-shrink: 0; }
      #sizeup-bar .su-pcard-name {
        flex: 1; min-width: 0; font-size: 12.5px; font-weight: 700; color: #1C1E26;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sizeup-bar .su-pcard-size {
        flex-shrink: 0; font-size: 11px; font-weight: 700; color: #5B6170;
        background: #F3F4F7; min-width: 22px; height: 22px; padding: 0 6px;
        border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
      }

      /* ── Product fit banner ── */
      #sizeup-banner .su-banner-profiles { padding: 3px 8px 5px; }
      #sizeup-banner .su-bpc {
        display: flex; align-items: center; gap: 8px; padding: 7px 5px;
      }
      #sizeup-banner .su-bpc-avatar { font-size: 18px; line-height: 1; flex-shrink: 0; }
      #sizeup-banner .su-bpc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      #sizeup-banner .su-bpc-name {
        font-size: 12.5px; font-weight: 700; color: #1C1E26;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sizeup-banner .su-bpc-size { font-size: 10.5px; color: #9AA0AD; }
      #sizeup-banner .su-bpc-tag {
        display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
        font-size: 10.5px; font-weight: 700; padding: 4px 9px;
        border-radius: 999px; white-space: nowrap;
      }
      #sizeup-banner .su-tag-dot { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
      #sizeup-banner .su-bpc-tag.avail    { background: #E4F6EE; color: #0A8F5C; }
      #sizeup-banner .su-bpc-tag.adjacent { background: #FDF1E0; color: #B5710A; }
      #sizeup-banner .su-bpc-tag.unavail  { background: #FCEBEB; color: #D94A4A; }
      #sizeup-banner .su-bpc-tag.unlisted { background: #F1F2F5; color: #8A909E; }
    `;
    document.head.appendChild(style);
  }

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
    const bar = document.createElement('div');
    bar.id    = BAR_ID;

    const cards = cardData.map(({ profile, szLabel, checked }) => `
      <button class="su-bar-pcard${checked ? ' active' : ''}">
        <span class="su-pcard-check">${checked ? CHECK_ICON : ''}</span>
        <span class="su-pcard-avatar">${profile.emoji}</span>
        <span class="su-pcard-name">${profile.name}</span>
        <span class="su-pcard-size">${szLabel}</span>
      </button>`).join('');

    const selN  = cardData.filter(c => c.checked).length;
    const foot  = selN ? `${selN} selected — filtering by size` : 'Select members to filter this page';

    bar.innerHTML = `
      <div class="su-head">
        ${MARK}
        <span class="su-head-title">Filter for</span>
        <button class="su-close" title="Close">${X_ICON}</button>
      </div>
      <div class="su-bar-profiles">${cards}</div>
      <div class="su-foot">${foot}</div>
    `;

    bar.querySelectorAll('.su-bar-pcard').forEach((card, i) => {
      const { facetValue, checked } = cardData[i];
      card.addEventListener('click', () => onCardClick(facetValue, checked));
    });
    bar.querySelector('.su-close').addEventListener('click', () => {
      removeBar();
      onDismiss();
    });

    document.body.appendChild(bar);
  }

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

    const cards = results.map(r => {
      const tagClass = r.status === 'avail' && r.matchType === 'adjacent' ? 'adjacent' : r.status;
      const tagText  = _tagLabel(r.status, r.matchType, r.matchedSize);
      return `
        <div class="su-bpc">
          <span class="su-bpc-avatar">${r.profile.emoji}</span>
          <span class="su-bpc-info">
            <span class="su-bpc-name">${r.profile.name}</span>
            <span class="su-bpc-size">${r.szLabel}</span>
          </span>
          <span class="su-bpc-tag ${tagClass}"><span class="su-tag-dot"></span>${tagText}</span>
        </div>`;
    }).join('');

    const el  = document.createElement('div');
    el.id     = BANNER_ID;
    el.innerHTML = `
      <div class="su-head">
        ${MARK}
        <span class="su-head-title">Fit check</span>
        <button class="su-close" title="Dismiss">${X_ICON}</button>
      </div>
      <div class="su-banner-profiles">${cards}</div>
      <div class="su-foot">Based on your saved measurements</div>
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

  function clearHighlights() {
    document.querySelectorAll('.sizeup-match').forEach(el => el.classList.remove('sizeup-match'));
  }

  return { injectStyles, showBar, removeBar, showBanner, removeBanner, clearHighlights };
})();
