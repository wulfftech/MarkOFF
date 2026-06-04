// MarkOFF — service worker (MV3 background)

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.sync.set({ globalEnabled: true, filterMode: "toggle" });
  }
});

// Allow programmatic self-reload from any content script or devtools console:
//   chrome.runtime.sendMessage({ type: "MARKOFF_RELOAD" })
// Used by the development workflow to reload the extension without opening
// chrome://extensions manually.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "MARKOFF_RELOAD") {
    chrome.runtime.reload();
  }
});
