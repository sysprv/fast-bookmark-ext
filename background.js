// Background script - handles tab tracking and one-click archive

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
      tabOpenTimes.set(tab.id, now);
      tabHistory.set(tab.id, tab.url ? [{ url: tab.url, timestamp: now }] : []);
    }
  });
});

// Handle extension icon click - immediately archive the tab
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
      console.log('fast-bookmark-ext: Cannot archive browser internal pages');
      return;
    }

    // Get page metadata from content script
    let pageMetadata = {};
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' });
      if (response && response.success) {
        pageMetadata = response.metadata;
      }
    } catch (e) {
      // Content script not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' });
        if (response && response.success) {
          pageMetadata = response.metadata;
        }
      } catch (injectError) {
        console.warn('fast-bookmark-ext: Could not inject content script:', injectError);
      }
    }

    // Get tab timing info
    const tabInfo = {
      openedAt: tabOpenTimes.get(tab.id) || null,
      openedAtISO: tabOpenTimes.has(tab.id)
        ? new Date(tabOpenTimes.get(tab.id)).toISOString()
        : null,
      navigationHistory: tabHistory.get(tab.id) || [],
    };

    // Build archive data
    const now = new Date();
    const domain = pageMetadata.domain || new URL(tab.url).hostname;
    const title = pageMetadata.title || tab.title;

    const archiveData = {
      archive: {
        version: '1.0',
        archivedAt: now.toISOString(),
        archivedAtLocal: now.toLocaleString(),
      },
      page: {
        title: title,
        url: pageMetadata.url || tab.url,
        domain: domain,
        pathname: pageMetadata.pathname || new URL(tab.url).pathname,
      },
      tab: {
        openedAt: tabInfo.openedAtISO,
        sessionDuration: tabInfo.openedAt
          ? Math.round((Date.now() - tabInfo.openedAt) / 1000)
          : null,
        sessionDurationFormatted: tabInfo.openedAt
          ? formatDuration(Date.now() - tabInfo.openedAt)
          : 'Unknown',
        navigationHistory: tabInfo.navigationHistory,
      },
      seo: pageMetadata.meta || {},
      openGraph: pageMetadata.openGraph || {},
      twitter: pageMetadata.twitter || {},
      article: pageMetadata.article || {},
      structuredData: pageMetadata.jsonLd || null,
      discovery: pageMetadata.discovery || {},
    };

    // Generate filename and download
    const filename = generateFilename(domain, title);
    const jsonString = JSON.stringify(archiveData, null, 2);
    const dataUrl = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(jsonString)));

    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false,
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('fast-bookmark-ext: Download failed:', chrome.runtime.lastError.message);
      } else {
        console.log('fast-bookmark-ext: Saved', filename);
      }
    });

  } catch (error) {
    console.error('fast-bookmark-ext: Error archiving tab:', error);
  }
});

function generateFilename(domain, title) {
  let cleanDomain = domain.replace(/^www\./, '').replace(/\.[^.]+$/, '');
  let cleanTitle = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .replace(/_+$/, '');

  const timestamp = new Date().toISOString().slice(0, 10);
  return `${cleanDomain}_${cleanTitle}_${timestamp}.arc.json`;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
