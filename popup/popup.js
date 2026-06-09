// ── DOM refs ──────────────────────────────────────────────────────────────────

const viewHome      = document.getElementById('view-home');
const viewForm      = document.getElementById('view-form');
const membersList   = document.getElementById('members-list');
const emptyState    = document.getElementById('empty-state');
const profileSelect = document.getElementById('profile-select');
const formTitle     = document.getElementById('form-title');
const derivedBox    = document.getElementById('derived-box');
const derivedText   = document.getElementById('derived-sizes-text');
const previewEmoji  = document.getElementById('preview-emoji');
const warnBox       = document.getElementById('measure-warn');

// ── SVG icons ─────────────────────────────────────────────────────────────────

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

// ── State ─────────────────────────────────────────────────────────────────────

let editingId     = null;
let selectedEmoji = '🌸';

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  attachListeners();
  await checkForLearned();
  await renderHome();
}

// ── Home view ─────────────────────────────────────────────────────────────────

async function renderHome() {
  const data = await getStorageData();
  const { profiles, activeProfileId } = data;

  profileSelect.innerHTML = '<option value="">None</option>';
  for (const p of profiles) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.emoji} ${p.name}`;
    opt.selected = p.id === activeProfileId;
    profileSelect.appendChild(opt);
  }

  membersList.innerHTML = '';
  if (!profiles.length) {
    emptyState.hidden = false;
    membersList.hidden = true;
  } else {
    emptyState.hidden = true;
    membersList.hidden = false;
    for (const p of profiles) {
      membersList.appendChild(buildMemberCard(p));
    }
  }
}

function buildMemberCard(profile) {
  const card = document.createElement('div');
  card.className = 'member-card';

  const sz = deriveSizes(profile.measurements || {});
  const sizeLine = buildSizeLine(sz);

  card.innerHTML = `
    <div class="member-avatar">${profile.emoji}</div>
    <div class="member-info">
      <div class="member-name">${esc(profile.name)}</div>
      <div class="member-size">${sizeLine}</div>
    </div>
    <div class="member-actions">
      <button class="btn-icon" data-action="edit"   title="Edit">${ICON_EDIT}</button>
      <button class="btn-icon danger" data-action="delete" title="Remove">${ICON_DELETE}</button>
    </div>
  `;

  card.querySelector('[data-action="edit"]').addEventListener('click', () => showForm(profile));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => handleDelete(profile.id, profile.name));
  return card;
}

/** Builds the one-line size summary shown on member cards. */
function buildSizeLine(sizes) {
  const parts = [];
  if (sizes.top)    parts.push(`<strong>${sizes.top.alpha} · ${sizes.top.numeric}</strong>`);
  if (sizes.bottom) parts.push(`Waist <strong>${sizes.bottom.label}</strong>`);
  if (!parts.length) return '<span style="opacity:.5">No measurements yet</span>';
  return parts.join(' &nbsp;·&nbsp; ');
}

// ── Form view ─────────────────────────────────────────────────────────────────

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

// ── Derived sizes preview ─────────────────────────────────────────────────────

function refreshDerived() {
  const m = readMeasurements();
  refreshWarning(m);

  const sizes = deriveSizes(m);
  const hasAny = sizes.top || sizes.bottom;

  derivedBox.hidden = !hasAny;
  if (!hasAny) return;

  previewEmoji.textContent = selectedEmoji;

  const parts = [];
  if (sizes.top)    parts.push(`${sizes.top.alpha} · ${sizes.top.numeric}`);
  if (sizes.bottom) parts.push(`Waist ${sizes.bottom.label}`);
  derivedText.textContent = parts.join('   ');
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

// ── Save / Delete ─────────────────────────────────────────────────────────────

async function handleSave() {
  const nameEl = document.getElementById('field-name');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  const isNew = !editingId;

  const profile = {
    id: editingId || generateId(),
    name,
    emoji: selectedEmoji,
    measurements: readMeasurements(),
  };

  await saveProfile(profile);

  if (isNew) fireConfetti();

  showHome();
}

async function handleDelete(id, name) {
  if (!confirm(`Remove ${name}?`)) return;
  await deleteProfile(id);
  renderHome();
}

// ── Confetti (lazy-loaded from CDN, zero bundle cost) ─────────────────────────

async function fireConfetti() {
  try {
    if (!window.confetti) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    window.confetti({ particleCount: 100, spread: 65, origin: { y: 0.7 } });
  } catch (_) {
    // CDN unavailable — silently skip confetti
  }
}

// ── Learn-from-purchase ───────────────────────────────────────────────────────

const SUPPORTED_LEARN_HOSTS = ['www.myntra.com', 'www.amazon.in', 'www.flipkart.com'];

async function handleLearnFetch() {
  const input    = document.getElementById('field-learn-url');
  const statusEl = document.getElementById('learn-status');
  const url      = input.value.trim();

  statusEl.hidden = false;
  statusEl.className = 'learn-status';

  if (!url) { statusEl.textContent = 'Paste a product URL first.'; return; }

  let parsed;
  try { parsed = new URL(url); } catch {
    statusEl.textContent = 'Not a valid URL.';
    statusEl.classList.add('err');
    return;
  }

  if (!SUPPORTED_LEARN_HOSTS.includes(parsed.hostname)) {
    statusEl.textContent = 'Only Myntra, Amazon India, and Flipkart URLs are supported.';
    statusEl.classList.add('err');
    return;
  }

  const profileId = document.getElementById('field-id').value;
  if (!profileId) {
    statusEl.textContent = 'Save the profile first, then use this feature.';
    statusEl.classList.add('err');
    return;
  }

  await setLearnMode(profileId);
  chrome.tabs.create({ url });
  statusEl.textContent = '✓ Opening page — pick your size there, then come back.';
  statusEl.classList.add('ok');
}

async function checkForLearned() {
  const data = await getStorageData();
  if (!data.learnedResult) return;
  showLearnModal(data.learnedResult, data.profiles);
}

function showLearnModal(result, profiles) {
  const modal   = document.getElementById('learn-modal');
  const body    = document.getElementById('learn-modal-body');
  const profile = profiles.find(p => p.id === result.profileId);
  if (!profile) { clearLearned(); return; }

  const catLabel  = { top: 'Tops', bottom: 'Bottoms', shoe: 'Shoes' }[result.category] || result.category;
  const midpoint  = getSizeMidpoint(result.size, result.category);
  const field     = CATEGORY_FIELD[result.category];
  const existing  = (profile.measurements || {})[field];
  const hasExisting = existing != null && existing > 0;
  const avgValue  = hasExisting && midpoint ? ((existing + midpoint) / 2).toFixed(1) : null;

  body.innerHTML = `
    <strong>${profile.emoji} ${esc(profile.name)}</strong> bought size
    <strong>${esc(result.size)}</strong> in <strong>${catLabel}</strong>.
    <div class="modal-sub">
      ${hasExisting
        ? `Current ${field}: <strong>${existing} cm</strong>.
           ${midpoint ? `Midpoint for ${result.size}: <strong>${midpoint} cm</strong>.` : ''}
           ${avgValue ? `Average: <strong>${avgValue} cm</strong>.` : ''}`
        : midpoint
          ? `No ${field} stored. Override sets it to <strong>${midpoint} cm</strong>.`
          : `No measurement to compute — skip or update manually.`
      }
    </div>
  `;

  document.getElementById('btn-lm-average').disabled = !avgValue;
  modal.hidden = false;

  document.getElementById('btn-lm-skip').onclick = async () => {
    await clearLearned(); modal.hidden = true;
  };
  document.getElementById('btn-lm-average').onclick = async () => {
    if (!avgValue || !field) return;
    const updated = { ...(profile.measurements || {}), [field]: parseFloat(avgValue) };
    await saveProfile({ ...profile, measurements: updated });
    await clearLearned(); modal.hidden = true; renderHome();
  };
  document.getElementById('btn-lm-override').onclick = async () => {
    if (!midpoint || !field) { await clearLearned(); modal.hidden = true; return; }
    const updated = { ...(profile.measurements || {}), [field]: midpoint };
    await saveProfile({ ...profile, measurements: updated });
    await clearLearned(); modal.hidden = true; renderHome();
  };
}

// ── Listeners ─────────────────────────────────────────────────────────────────

function attachListeners() {
  document.getElementById('btn-add').addEventListener('click', () => showForm());
  document.getElementById('btn-back').addEventListener('click', showHome);
  document.getElementById('btn-cancel').addEventListener('click', showHome);
  document.getElementById('btn-save').addEventListener('click', handleSave);

  profileSelect.addEventListener('change', async () => {
    await setActiveProfile(profileSelect.value || null);
    renderHome();
  });

  document.getElementById('emoji-picker').addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    selectedEmoji = btn.dataset.emoji;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('active', b === btn));
    previewEmoji.textContent = selectedEmoji;
  });

  ['field-chest', 'field-waist'].forEach(id => {
    document.getElementById(id).addEventListener('input', refreshDerived);
  });

  document.getElementById('btn-learn').addEventListener('click', handleLearnFetch);
}

// ── Util ──────────────────────────────────────────────────────────────────────

function esc(str) {
  return str.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

boot();
