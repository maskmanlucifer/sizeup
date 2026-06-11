// Opens the welcome page once, right after the extension is installed, to walk
// the user through pinning SizeUp to the toolbar.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/welcome.html') });
  }
});
