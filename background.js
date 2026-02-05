// Background service worker - handles tab tracking and downloads

// Store tab open times (tab ID -> timestamp)
const tabOpenTimes = new Map();
// Store tab navigation history (tab ID -> array of URLs)
const tabHistory = new Map();

// Track when tabs are created
chrome.tabs.onCreated.addListener((tab) => {
  tabOpenTimes.set(tab.id, Date.now());
  tabHistory.set(tab.id, []);
});

// Track navigation within tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const history = tabHistory.get(tabId) || [];
    // Avoid duplicate consecutive entries
    if (history.length === 0 || history[history.length - 1].url !== changeInfo.url) {
      history.push({
        url: changeInfo.url,
        timestamp: Date.now(),
      });
      tabHistory.set(tabId, history);
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabOpenTimes.delete(tabId);
  tabHistory.delete(tabId);
});

// Initialize tracking for existing tabs when extension loads
chrome.tabs.query({}, (tabs) => {
  const now = Date.now();
  tabs.forEach((tab) => {
    if (!tabOpenTimes.has(tab.id)) {
      // We don't know when it was opened, use extension load time as approximation
      tabOpenTimes.set(tab.id, now);
      tabHistory.set(tab.id, tab.url ? [{ url: tab.url, timestamp: now }] : []);
    }
  });
});

// Generate a safe filename from the domain and title
function generateFilename(domain, title) {
  // Clean up domain (remove www., etc.)
  let cleanDomain = domain.replace(/^www\./, '').replace(/\.[^.]+$/, '');

  // Clean up title - remove special characters, limit length
  let cleanTitle = title
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .substring(0, 50)              // Limit length
    .replace(/_+$/, '');           // Remove trailing underscores

  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return `${cleanDomain}_${cleanTitle}_${timestamp}.json`;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    const tabId = request.tabId;

    const tabInfo = {
      openedAt: tabOpenTimes.get(tabId) || null,
      openedAtISO: tabOpenTimes.has(tabId)
        ? new Date(tabOpenTimes.get(tabId)).toISOString()
        : null,
      navigationHistory: tabHistory.get(tabId) || [],
      trackedSinceExtensionLoad: !tabOpenTimes.has(tabId) ||
        (Date.now() - tabOpenTimes.get(tabId)) < 1000,
    };

    sendResponse({ success: true, tabInfo });
    return true;
  }

  if (request.action === 'downloadArchive') {
    const { data, domain, title } = request;
    const filename = generateFilename(domain, title);
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Convert blob to data URL for download
    const reader = new FileReader();
    reader.onload = () => {
      chrome.downloads.download({
        url: reader.result,
        filename: `tab-archives/${filename}`,
        saveAs: false,
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId, filename });
        }
      });
    };
    reader.readAsDataURL(blob);

    return true; // Keep message channel open for async response
  }
});
