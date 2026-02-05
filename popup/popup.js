// Popup script - UI for archiving tabs

let archiveData = null;
let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  const previewEl = document.getElementById('preview');
  const archiveBtn = document.getElementById('archiveBtn');
  const copyBtn = document.getElementById('copyBtn');
  const statusEl = document.getElementById('status');

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      showError(previewEl, 'Cannot archive browser internal pages');
      return;
    }

    // Gather all the data
    archiveData = await gatherArchiveData(tab);

    // Show preview
    renderPreview(previewEl, archiveData);

    // Enable buttons
    archiveBtn.disabled = false;
    copyBtn.disabled = false;

  } catch (error) {
    console.error('Error gathering data:', error);
    showError(previewEl, `Error: ${error.message}`);
  }

  // Archive button click
  archiveBtn.addEventListener('click', async () => {
    if (!archiveData) return;

    archiveBtn.disabled = true;
    archiveBtn.textContent = 'Archiving...';

    try {
      const filename = generateFilename(archiveData.page.domain, archiveData.page.title);
      const jsonString = JSON.stringify(archiveData, null, 2);

      // Create blob and download using a link element (most reliable cross-browser)
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus(statusEl, 'success', `Saved: ${filename}`);
    } catch (error) {
      showStatus(statusEl, 'error', `Error: ${error.message}`);
    }

    archiveBtn.disabled = false;
    archiveBtn.innerHTML = '<span class="btn-icon">📥</span> Archive Tab';
  });

  // Copy button click
  copyBtn.addEventListener('click', async () => {
    if (!archiveData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(archiveData, null, 2));
      showStatus(statusEl, 'success', 'JSON copied to clipboard!');
    } catch (error) {
      showStatus(statusEl, 'error', `Copy failed: ${error.message}`);
    }
  });
});

async function gatherArchiveData(tab) {
  // Get page metadata from content script
  let pageMetadata = {};
  try {
    const metaResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' });
    if (metaResponse && metaResponse.success) {
      pageMetadata = metaResponse.metadata;
    }
  } catch (e) {
    // Content script might not be loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      const metaResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' });
      if (metaResponse && metaResponse.success) {
        pageMetadata = metaResponse.metadata;
      }
    } catch (injectError) {
      console.warn('Could not inject content script:', injectError);
    }
  }

  // Get tab info from background
  let tabInfo = {};
  try {
    const tabResponse = await chrome.runtime.sendMessage({
      action: 'getTabInfo',
      tabId: tab.id,
    });
    if (tabResponse && tabResponse.success) {
      tabInfo = tabResponse.tabInfo;
    }
  } catch (e) {
    console.warn('Could not get tab info:', e);
  }

  // Build the complete archive object
  const now = new Date();

  return {
    // Archive metadata
    archive: {
      version: '1.0',
      archivedAt: now.toISOString(),
      archivedAtLocal: now.toLocaleString(),
      extensionVersion: chrome.runtime.getManifest().version,
    },

    // Basic page info
    page: {
      title: pageMetadata.title || tab.title,
      url: pageMetadata.url || tab.url,
      domain: pageMetadata.domain || new URL(tab.url).hostname,
      pathname: pageMetadata.pathname || new URL(tab.url).pathname,
    },

    // Tab timing and history
    tab: {
      id: tab.id,
      index: tab.index,
      windowId: tab.windowId,
      openedAt: tabInfo.openedAtISO,
      openedTimestamp: tabInfo.openedAt,
      navigationHistory: tabInfo.navigationHistory,
      sessionDuration: tabInfo.openedAt
        ? Math.round((Date.now() - tabInfo.openedAt) / 1000)
        : null,
      sessionDurationFormatted: tabInfo.openedAt
        ? formatDuration(Date.now() - tabInfo.openedAt)
        : 'Unknown',
    },

    // SEO and discovery metadata
    seo: pageMetadata.meta || {},
    openGraph: pageMetadata.openGraph || {},
    twitter: pageMetadata.twitter || {},
    article: pageMetadata.article || {},
    structuredData: pageMetadata.jsonLd || null,
    discovery: pageMetadata.discovery || {},
  };
}

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

function renderPreview(container, data) {
  const items = [];

  // Title
  items.push(previewItem('Title', data.page.title));

  // URL
  items.push(previewItem('URL', data.page.url, 'url'));

  // Session duration
  items.push(previewItem('Tab Open', data.tab.sessionDurationFormatted));

  // Archive time
  items.push(previewItem('Archive Time', data.archive.archivedAtLocal));

  // Section: SEO Metadata
  const seoItems = [];

  if (data.seo.description) {
    seoItems.push(previewItem('Description', data.seo.description));
  }

  if (data.seo.keywords) {
    seoItems.push(previewItem('Keywords', data.seo.keywords));
  }

  if (data.openGraph.siteName) {
    seoItems.push(previewItem('Site Name', data.openGraph.siteName));
  }

  if (data.openGraph.type) {
    seoItems.push(previewItem('Type', data.openGraph.type));
  }

  if (data.article.publishedTime) {
    seoItems.push(previewItem('Published', new Date(data.article.publishedTime).toLocaleDateString()));
  }

  // Navigation history count
  if (data.tab.navigationHistory && data.tab.navigationHistory.length > 1) {
    seoItems.push(previewItem('Navigation Steps', `${data.tab.navigationHistory.length} pages visited`));
  }

  let html = items.join('');

  if (seoItems.length > 0) {
    html += `<div class="section-divider"><div class="section-title">Metadata Found</div>${seoItems.join('')}</div>`;
  }

  container.innerHTML = html;
}

function previewItem(label, value, className = '') {
  const displayValue = value || '<span class="empty">Not available</span>';
  const valueClass = className ? `preview-value ${className}` : 'preview-value';

  return `
    <div class="preview-item">
      <div class="preview-label">${label}</div>
      <div class="${valueClass}">${escapeHtml(displayValue)}</div>
    </div>
  `;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(container, message) {
  container.innerHTML = `<div class="preview-value empty">${escapeHtml(message)}</div>`;
}

function showStatus(element, type, message) {
  element.className = `status ${type}`;
  element.textContent = message;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    element.className = 'status';
  }, 3000);
}
