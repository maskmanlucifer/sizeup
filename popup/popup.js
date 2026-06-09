/**
 * Popup controller.
 * Depends on size-charts.js and storage.js loaded via script tags.
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────

const viewHome   = document.getElementById('view-home');
const viewForm   = document.getElementById('view-form');
const membersList = document.getElementById('members-list');
const emptyState  = document.getElementById('empty-state');
const profileSelect = document.getElementById('profile-select');
const formTitle   = document.getElementById('form-title');
const derivedBox  = document.getElementById('derived-box');
const derivedChips = document.getElementById('derived-chips');

// ── State ─────────────────────────────────────────────────────────────────────

let editingId = null;
let selectedEmoji = '👨';

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

  // Populate profile selector
  profileSelect.innerHTML = '<option value="">None</option>';
  for (const p of profiles) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.emoji} ${p.name}`;
    opt.selected = p.id === activeProfileId;
    profileSelect.appendChild(opt);
  }

  // Render member cards
  membersList.innerHTML = '';
  if (!profiles.length) {
    emptyState.hidden = false;
    membersList.hidden = true;
  } else {
    emptyState.hidden = true;
    membersList.hidden = false;
    for (const p of profiles) {
      membersList.appendChild(buildMemberCard(p, p.id === activeProfileId));
    }
  }
}

function buildMemberCard(profile, isActive) {
  const card = document.createElement('div');
  card.className = 'member-card' + (isActive ? ' is-active' : '');

  const sizes = deriveSizes(profile.measurements || {});
  const chips = buildChips(sizes);

  card.innerHTML = `
    <div class="member-emoji">${profile.emoji}</div>
    <div class="member-info">
      <div class="member-name">${esc(profile.name)}</div>
      <div class="member-chips">${chips}</div>
    </div>
    <div class="member-actions">
      <button class="btn-icon" data-action="edit"   title="Edit">✏️</button>
      <button class="btn-icon danger" data-action="delete" title="Remove">🗑</button>
    </div>
  `;

  card.querySelector('[data-action="edit"]').addEventListener('click', () => showForm(profile));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => handleDelete(profile.id, profile.name));

  return card;
}

function buildChips(sizes) {
  const parts = [];
  if (sizes.top)    parts.push(`<span class="chip">Tops: ${sizes.top.alpha} / ${sizes.top.numeric}</span>`);
  if (sizes.bottom) parts.push(`<span class="chip">Bottoms: ${sizes.bottom.label}</span>`);
  if (sizes.shoe)   parts.push(`<span class="chip">Shoes: UK ${sizes.shoe.uk}</span>`);
  if (!parts.length) parts.push(`<span class="chip chip-empty">No measurements</span>`);
  return parts.join('');
}

// ── Form view ─────────────────────────────────────────────────────────────────

function showForm(profile = null) {
  editingId = profile?.id || null;
  formTitle.textContent = profile ? 'Edit member' : 'Add member';

  // Reset
  document.getElementById('field-id').value    = editingId || '';
  document.getElementById('field-name').value  = profile?.name || '';

  const fields = ['height', 'chest', 'waist', 'hip', 'shoulder', 'inseam', 'shoeLength'];
  const m = profile?.measurements || {};
  for (const f of fields) {
    document.getElementById(`field-${f}`).value = m[f] || '';
  }

  // Emoji
  selectedEmoji = profile?.emoji || '👨';
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

/** Shows a warning if any measurement looks like a clothing size, not a body cm value. */
function refreshWarnings(m) {
  const existing = document.getElementById('measure-warn');
  if (existing) existing.remove();

  const suspicious = [];
  if (m.chest && m.chest < 60)      suspicious.push(`Chest ${m.chest} cm seems too small — did you enter a clothing size (e.g. 38) instead of body measurement (~96 cm)?`);
  if (m.waist && m.waist < 40)      suspicious.push(`Waist ${m.waist} cm seems too small — enter body measurement in cm (e.g. 80), not pant size (e.g. 30).`);
  if (m.shoeLength && m.shoeLength < 15) suspicious.push(`Shoe foot length ${m.shoeLength} cm seems too small — measure your foot heel to toe (e.g. 26.5 cm).`);

  if (!suspicious.length) return;

  const box = document.createElement('div');
  box.id = 'measure-warn';
  box.className = 'warn-box';
  box.innerHTML = `<span>⚠️</span><span>${suspicious[0]}</span>`;

  // Insert before derived-box
  derivedBox.before(box);
}

function refreshDerived() {
  const m = readMeasurements();
  refreshWarnings(m);
  const sizes = deriveSizes(m);
  const hasAny = sizes.top || sizes.bottom || sizes.shoe;

  derivedBox.hidden = !hasAny;
  if (!hasAny) return;

  const chips = [];
  if (sizes.top) {
    chips.push(`<div class="derived-chip"><span class="dim">Tops </span>${sizes.top.alpha} · ${sizes.top.numeric}</div>`);
  }
  if (sizes.bottom) {
    chips.push(`<div class="derived-chip"><span class="dim">Bottoms </span>${sizes.bottom.label}</div>`);
  }
  if (sizes.shoe) {
    chips.push(`<div class="derived-chip"><span class="dim">Shoe </span>UK ${sizes.shoe.uk} · EU ${sizes.shoe.eu} · US ${sizes.shoe.usM}</div>`);
  }
  derivedChips.innerHTML = chips.join('');
}

function readMeasurements() {
  const fields = ['height', 'chest', 'waist', 'hip', 'shoulder', 'inseam', 'shoeLength'];
  const m = {};
  for (const f of fields) {
    const v = parseFloat(document.getElementById(`field-${f}`).value);
    if (!isNaN(v) && v > 0) m[f] = v;
  }
  return m;
}

// ── Save / Delete ─────────────────────────────────────────────────────────────

async function handleSave() {
  const nameEl = document.getElementById('field-name');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  const profile = {
    id: editingId || generateId(),
    name,
    emoji: selectedEmoji,
    measurements: readMeasurements(),
  };

  await saveProfile(profile);
  showHome();
}

async function handleDelete(id, name) {
  if (!confirm(`Remove ${name}?`)) return;
  await deleteProfile(id);
  renderHome();
}

// ── Learn-from-purchase ───────────────────────────────────────────────────────

const SUPPORTED_LEARN_HOSTS = ['www.myntra.com', 'www.amazon.in', 'www.flipkart.com'];

async function handleLearnFetch() {
  const input = document.getElementById('field-learn-url');
  const statusEl = document.getElementById('learn-status');
  const url = input.value.trim();

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
    // Save the profile first so we have an ID to attach to
    statusEl.textContent = 'Save the profile first, then fetch.';
    statusEl.classList.add('err');
    return;
  }

  await setLearnMode(profileId);
  chrome.tabs.create({ url });
  statusEl.textContent = '✓ Opening page… pick your size there, then come back.';
  statusEl.classList.add('ok');
}

/** Called on boot — shows the modal if a learned size is pending. */
async function checkForLearned() {
  const data = await getStorageData();
  if (!data.learnedResult) return;
  showLearnModal(data.learnedResult, data.profiles);
}

function showLearnModal(result, profiles) {
  const modal = document.getElementById('learn-modal');
  const body  = document.getElementById('learn-modal-body');
  const profile = profiles.find(p => p.id === result.profileId);
  if (!profile) { clearLearned(); return; }

  const catLabel = { top: 'Tops', bottom: 'Bottoms', shoe: 'Shoes' }[result.category] || result.category;
  const midpoint = getSizeMidpoint(result.size, result.category);
  const field    = CATEGORY_FIELD[result.category]; // 'chest' | 'waist' | 'shoeLength'
  const existing = (profile.measurements || {})[field];
  const hasExisting = existing != null && existing > 0;

  const avgValue = hasExisting && midpoint ? ((existing + midpoint) / 2).toFixed(1) : null;

  body.innerHTML = `
    <strong>${profile.emoji} ${esc(profile.name)}</strong> bought size
    <strong>${esc(result.size)}</strong> in <strong>${catLabel}</strong>.
    <div class="modal-sub">
      ${hasExisting
        ? `Current ${field}: <strong>${existing} cm</strong>.
           ${midpoint ? `Midpoint for ${result.size}: <strong>${midpoint} cm</strong>.` : ''}
           ${avgValue ? `Average would be <strong>${avgValue} cm</strong>.` : ''}`
        : midpoint
          ? `No ${field} stored yet. Override will set it to <strong>${midpoint} cm</strong> (midpoint of size ${result.size}).`
          : `No measurement to compute — skip or update manually.`
      }
    </div>
  `;

  // Disable Average if no existing value to average with
  document.getElementById('btn-lm-average').disabled = !avgValue;

  modal.hidden = false;

  // Wire buttons
  document.getElementById('btn-lm-skip').onclick = async () => {
    await clearLearned();
    modal.hidden = true;
  };

  document.getElementById('btn-lm-average').onclick = async () => {
    if (!avgValue || !field) return;
    const updated = { ...(profile.measurements || {}), [field]: parseFloat(avgValue) };
    await saveProfile({ ...profile, measurements: updated });
    await clearLearned();
    modal.hidden = true;
    await renderHome();
  };

  document.getElementById('btn-lm-override').onclick = async () => {
    if (!midpoint || !field) { await clearLearned(); modal.hidden = true; return; }
    const updated = { ...(profile.measurements || {}), [field]: midpoint };
    await saveProfile({ ...profile, measurements: updated });
    await clearLearned();
    modal.hidden = true;
    await renderHome();
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
  });

  // Live derived sizes on measurement input
  ['field-chest', 'field-waist', 'field-shoeLength'].forEach(id => {
    document.getElementById(id).addEventListener('input', refreshDerived);
  });

  // Learn fetch button
  document.getElementById('btn-learn').addEventListener('click', handleLearnFetch);
}

// ── Util ──────────────────────────────────────────────────────────────────────

function esc(str) {
  return str.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

boot();
