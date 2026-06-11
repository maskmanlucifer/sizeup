/**
 * Chrome storage helpers.
 * Uses chrome.storage.sync so profiles are shared across devices.
 * Global functions — used by both content scripts and popup via script tag.
 */

const STORAGE_KEY = 'sizeup_data';

const DEFAULT_DATA = {
  profiles: [],
};

function getStorageData() {
  return new Promise(resolve => {
    chrome.storage.sync.get(STORAGE_KEY, syncResult => {
      if (syncResult[STORAGE_KEY]) {
        resolve(syncResult[STORAGE_KEY]);
        return;
      }
      // One-time migration: if sync is empty, pull from local and promote it
      chrome.storage.local.get(STORAGE_KEY, localResult => {
        const data = localResult[STORAGE_KEY] || { ...DEFAULT_DATA };
        if (localResult[STORAGE_KEY]) {
          chrome.storage.sync.set({ [STORAGE_KEY]: data });
        }
        resolve(data);
      });
    });
  });
}

function setStorageData(data) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ [STORAGE_KEY]: data }, resolve);
  });
}

async function saveProfile(profile) {
  const data = await getStorageData();
  const idx = data.profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) data.profiles[idx] = profile;
  else data.profiles.push(profile);
  await setStorageData(data);
  return data;
}

async function deleteProfile(profileId) {
  const data = await getStorageData();
  data.profiles = data.profiles.filter(p => p.id !== profileId);
  await setStorageData(data);
  return data;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Learn-from-purchase helpers ───────────────────────────────────────────────

async function setLearnMode(profileId) {
  const data = await getStorageData();
  data.learnMode = { profileId };
  await setStorageData(data);
}

async function clearLearnMode() {
  const data = await getStorageData();
  delete data.learnMode;
  await setStorageData(data);
}

/**
 * Called by content script after user picks their size on the product page.
 * @param {string} profileId
 * @param {string} size     - e.g. "M", "32"
 * @param {string} category - "top" | "bottom"
 */
async function saveLearned(profileId, size, category) {
  const data = await getStorageData();
  data.learnedResult = { profileId, size, category };
  delete data.learnMode;
  await setStorageData(data);
}

async function clearLearned() {
  const data = await getStorageData();
  delete data.learnedResult;
  await setStorageData(data);
}
