const viewHome      = document.getElementById('view-home');
const viewForm      = document.getElementById('view-form');
const membersList   = document.getElementById('members-list');
const emptyState    = document.getElementById('empty-state');
const formTitle     = document.getElementById('form-title');
const previewAvatar = document.getElementById('preview-avatar');
const warnBox       = document.getElementById('measure-warn');
const btnAdd        = document.getElementById('btn-add');
const memberCount   = document.getElementById('member-count');
const fieldsBox     = document.getElementById('fields');
const derTop        = document.getElementById('der-top');
const derWaist      = document.getElementById('der-waist');
const derHip        = document.getElementById('der-hip');
const toastEl       = document.getElementById('toast');
const toastText     = document.getElementById('toast-text');

const MAX_MEMBERS = 10;

/** Measurement fields, in order — with the per-field "how to measure" copy. */
const FIELDS = [
  { key: 'height',   label: 'Height',   placeholder: '175', instruction: 'Stand straight against a wall, barefoot. Measure from the floor to the top of the head.' },
  { key: 'chest',    label: 'Chest',    placeholder: '96',  instruction: 'Measure around the fullest part of the chest, under the arms, keeping the tape level.' },
  { key: 'waist',    label: 'Waist',    placeholder: '80',  instruction: 'Measure around the narrowest part of the natural waist, just above the belly button.' },
  { key: 'hip',      label: 'Hip',      placeholder: '96',  instruction: 'Measure around the fullest part of the hips and seat, with the feet together.' },
  { key: 'shoulder', label: 'Shoulder', placeholder: '44',  instruction: 'Measure across the back, from the tip of one shoulder seam to the other.' },
  { key: 'inseam',   label: 'Inseam',   placeholder: '78',  instruction: 'Measure along the inner leg, from the top of the thigh down to the ankle bone.' },
];

const ICON_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;

const ICON_DELETE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6M14 11v6"/>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`;

const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`;

const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>`;

let editingId     = null;
let selectedEmoji = '🌸';

/**
 * Builds a simple body-diagram SVG with the tape placement for `kind`
 * highlighted in the accent colour. Used inside the per-field "?" tooltip.
 * @param {string} kind - measurement key (height, chest, waist, …)
 * @returns {string} SVG markup
 */
function svgFigure(kind) {
  const a = '#6C4DF6', s = '#D7DCE6';
  const base = `<circle cx="70" cy="22" r="15" fill="${s}"/><rect x="48" y="42" width="44" height="72" rx="18" fill="${s}"/><rect x="30" y="46" width="12" height="58" rx="6" fill="${s}"/><rect x="98" y="46" width="12" height="58" rx="6" fill="${s}"/><rect x="51" y="108" width="16" height="62" rx="8" fill="${s}"/><rect x="73" y="108" width="16" height="62" rx="8" fill="${s}"/>`;
  const h = (y, x1, x2) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/><line x1="${x1}" y1="${y - 5}" x2="${x1}" y2="${y + 5}" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/><line x1="${x2}" y1="${y - 5}" x2="${x2}" y2="${y + 5}" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/>`;
  const v = (x, y1, y2) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/><line x1="${x - 5}" y1="${y1}" x2="${x + 5}" y2="${y1}" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/><line x1="${x - 5}" y1="${y2}" x2="${x + 5}" y2="${y2}" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/>`;
  const tapes = {
    height:   v(124, 8, 170),
    chest:    h(64, 42, 98),
    waist:    h(92, 48, 92),
    hip:      h(110, 46, 94),
    shoulder: h(46, 40, 100),
    inseam:   v(70, 112, 168),
  };
  return `<svg viewBox="0 0 140 180" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${base}${tapes[kind] || ''}</svg>`;
}

async function boot() {
  buildFields();
  attachListeners();
  await renderHome();
}

/** Renders the six measurement field rows (with diagram tooltips) into #fields. */
function buildFields() {
  fieldsBox.innerHTML = FIELDS.map((f, idx) => `
    <div class="frow${idx >= 3 ? ' tip-up' : ''}" data-key="${f.key}">
      <div class="frow-head">
        <span class="frow-label">${f.label}</span>
        <button class="qbtn" type="button" aria-label="How to measure ${f.label}">?</button>
      </div>
      <div class="frow-input-wrap">
        <input id="field-${f.key}" class="frow-input" type="number" inputmode="numeric" placeholder="${f.placeholder}" />
        <span class="frow-unit">cm</span>
      </div>
      <div class="tip">
        <div class="tip-caret"></div>
        <div class="tip-fig">${svgFigure(f.key)}</div>
        <div class="tip-body">
          <span class="tip-title">How to measure ${f.label}</span>
          <span class="tip-text">${f.instruction}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Wire the "?" hover/focus tooltips per row.
  fieldsBox.querySelectorAll('.frow').forEach(row => {
    const qbtn = row.querySelector('.qbtn');
    const open  = () => row.classList.add('tip-open');
    const close = () => row.classList.remove('tip-open');
    qbtn.addEventListener('mouseenter', open);
    qbtn.addEventListener('mouseleave', close);
    qbtn.addEventListener('focus', open);
    qbtn.addEventListener('blur', close);
  });
}

/** Shows a brief bottom-centre confirmation toast. */
let _toastTimer;
function showToast(msg) {
  toastText.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2400);
}

async function renderHome() {
  const data = await getStorageData();
  const { profiles } = data;

  // Update add button and count badge
  const atLimit = profiles.length >= MAX_MEMBERS;
  btnAdd.disabled = atLimit;
  btnAdd.title    = atLimit ? `Limit of ${MAX_MEMBERS} members reached` : '';
  memberCount.textContent  = profiles.length ? `${profiles.length} / ${MAX_MEMBERS}` : '';
  memberCount.hidden       = !profiles.length;

  // Empty state carries its own "Add your first member" button; the footer
  // add button only shows once there's a list.
  btnAdd.hidden = !profiles.length;

  membersList.innerHTML = '';
  if (!profiles.length) {
    emptyState.hidden = false;
    membersList.hidden = true;
  } else {
    emptyState.hidden = true;
    membersList.hidden = false;
    for (const p of profiles) membersList.appendChild(buildMemberCard(p));
  }
}

function buildMemberCard(profile) {
  const card = document.createElement('div');
  card.className = 'member-card';

  const chips = buildChips(profile.measurements || {});

  card.innerHTML = `
    <div class="member-avatar">${profile.emoji}</div>
    <div class="member-info">
      <div class="member-name">${esc(profile.name)}</div>
      <div class="member-chips">${chips}</div>
    </div>
    <div class="member-actions">
      <button class="btn-icon" data-action="copy"   title="Copy sizes for AI">${ICON_COPY}</button>
      <button class="btn-icon" data-action="edit"   title="Edit">${ICON_EDIT}</button>
      <button class="btn-icon danger" data-action="delete" title="Remove">${ICON_DELETE}</button>
    </div>
  `;

  card.querySelector('[data-action="copy"]').addEventListener('click', () => copyProfilePrompt(profile, card));
  card.querySelector('[data-action="edit"]').addEventListener('click', () => showForm(profile));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => showInlineConfirm(card, profile.id));
  return card;
}

/** Builds the per-card size chips (Tops · Waist · Hip) from measurements. */
function buildChips(m) {
  const sz    = deriveSizes(m);
  const chips = [];
  if (sz.top) chips.push(`Tops ${sz.top.alpha}`);
  if (m.waist) chips.push(`Waist ${m.waist} cm`);
  if (m.hip)   chips.push(`Hip ${m.hip} cm`);
  if (!chips.length) return '<span class="chip empty">No measurements yet</span>';
  return chips.map(c => `<span class="chip">${c}</span>`).join('');
}


function showForm(profile = null) {
  editingId = profile?.id || null;
  formTitle.textContent = profile ? 'Edit member' : 'Add member';

  document.getElementById('field-id').value   = editingId || '';
  document.getElementById('field-name').value = profile?.name || '';

  const m = profile?.measurements || {};
  ['height', 'chest', 'waist', 'hip', 'shoulder', 'inseam'].forEach(f => {
    document.getElementById(`field-${f}`).value = m[f] || '';
  });

  selectedEmoji = profile?.emoji || '🌸';
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.emoji === selectedEmoji);
  });
  previewAvatar.textContent = selectedEmoji;

  refreshDerived();
  viewHome.hidden = true;
  viewForm.hidden = false;
}

function showHome() {
  viewForm.hidden = true;
  viewHome.hidden = false;
  editingId = null;
  renderHome();
}

function refreshDerived() {
  const m = readMeasurements();
  refreshWarning(m);

  const sizes = deriveSizes(m);
  derTop.textContent   = sizes.top ? sizes.top.alpha : '—';
  derWaist.textContent = m.waist ? `${m.waist} cm` : '—';
  derHip.textContent   = m.hip   ? `${m.hip} cm`   : '—';
}

function refreshWarning(m) {
  warnBox.hidden = true;
  if (m.chest && m.chest < 60) {
    warnBox.hidden = false;
    warnBox.innerHTML = `⚠️ &nbsp;Chest ${m.chest} cm looks too small — enter body measurement (~96 cm), not clothing size (38).`;
  } else if (m.waist && m.waist < 40) {
    warnBox.hidden = false;
    warnBox.innerHTML = `⚠️ &nbsp;Waist ${m.waist} cm looks too small — enter body measurement in cm (e.g. 80), not pant size (30).`;
  }
}

function readMeasurements() {
  const m = {};
  ['height', 'chest', 'waist', 'hip', 'shoulder', 'inseam'].forEach(f => {
    const v = parseFloat(document.getElementById(`field-${f}`).value);
    if (!isNaN(v) && v > 0) m[f] = v;
  });
  return m;
}

async function handleSave() {
  const nameEl = document.getElementById('field-name');
  const name   = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  // Enforce limit only when adding a new profile
  if (!editingId) {
    const data = await getStorageData();
    if (data.profiles.length >= MAX_MEMBERS) return; // button is disabled at limit
  }

  const profile = {
    id:           editingId || generateId(),
    name,
    emoji:        selectedEmoji,
    measurements: readMeasurements(),
  };

  await saveProfile(profile);
  showHome();
}

/**
 * Replaces the card's action buttons with an inline "Remove?" prompt.
 * Reverts on cancel; deletes on confirm.
 */
function showInlineConfirm(card, id) {
  const actions = card.querySelector('.member-actions');
  const original = actions.innerHTML;

  actions.innerHTML = `
    <div class="inline-confirm">
      <button class="btn-inline-cancel">Cancel</button>
      <button class="btn-inline-ok">Remove</button>
    </div>
  `;

  actions.querySelector('.btn-inline-cancel').addEventListener('click', () => {
    actions.innerHTML = original;
    // Re-attach listeners lost when innerHTML was replaced
    const profileId = id;
    const editBtn = actions.querySelector('[data-action="edit"]');
    const delBtn  = actions.querySelector('[data-action="delete"]');
    if (editBtn) editBtn.addEventListener('click', () => {
      getStorageData().then(d => {
        const p = d.profiles.find(p => p.id === profileId);
        if (p) showForm(p);
      });
    });
    if (delBtn) delBtn.addEventListener('click', () => showInlineConfirm(card, profileId));
  });

  actions.querySelector('.btn-inline-ok').addEventListener('click', () => {
    deleteProfile(id).then(renderHome);
  });
}

/**
 * Builds a Gemini/ChatGPT-ready prompt with the profile's measurements and
 * derived sizes, then copies it to the clipboard. The button briefly shows a
 * checkmark to confirm the copy.
 */
function copyProfilePrompt(profile, card) {
  const m   = profile.measurements || {};
  const sz  = deriveSizes(m);
  const prompt = _buildPrompt(profile.name, m, sz);

  navigator.clipboard.writeText(prompt).then(() => {
    const btn = card.querySelector('[data-action="copy"]');
    btn.innerHTML = ICON_CHECK;
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.innerHTML = ICON_COPY;
      btn.style.color = '';
    }, 1500);
    showToast(`Copied ${profile.name}'s sizes to share`);
  });
}

function _buildPrompt(name, m, sz) {
  const lines = [`Here are the body measurements of ${name}:`];

  const measurements = [];
  if (m.height)   measurements.push(`Height: ${m.height} cm`);
  if (m.chest)    measurements.push(`Chest: ${m.chest} cm`);
  if (m.waist)    measurements.push(`Waist: ${m.waist} cm`);
  if (m.hip)      measurements.push(`Hip: ${m.hip} cm`);
  if (m.shoulder) measurements.push(`Shoulder: ${m.shoulder} cm`);
  if (m.inseam)   measurements.push(`Inseam: ${m.inseam} cm`);
  if (measurements.length) lines.push(measurements.join(' | '));

  lines.push('');
  lines.push('Usual sizes on Indian platforms:');
  if (sz.top)    lines.push(`- Tops: ${sz.top.alpha} (Indian numeric ${sz.top.numeric}) — works on Myntra, Flipkart, Amazon India`);
  if (sz.bottom) lines.push(`- Bottoms: Waist ${sz.bottom.label}`);

  return lines.join('\n');
}

function attachListeners() {
  btnAdd.addEventListener('click', () => showForm());
  document.getElementById('btn-add-empty').addEventListener('click', () => showForm());
  document.getElementById('btn-back').addEventListener('click', showHome);
  document.getElementById('btn-cancel').addEventListener('click', showHome);
  document.getElementById('btn-save').addEventListener('click', handleSave);

  document.getElementById('emoji-picker').addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    selectedEmoji = btn.dataset.emoji;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('active', b === btn));
    previewAvatar.textContent = selectedEmoji;
  });

  ['field-chest', 'field-waist', 'field-hip'].forEach(id => {
    document.getElementById(id).addEventListener('input', refreshDerived);
  });
}

function esc(str) {
  return str.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

boot();
