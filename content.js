// Content script - extracts metadata from the current page

function extractPageMetadata() {
  const metadata = {
    // Basic page info
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname,
    pathname: window.location.pathname,

    // Standard meta tags
    meta: {
      description: getMetaContent('description'),
      keywords: getMetaContent('keywords'),
      author: getMetaContent('author'),
      robots: getMetaContent('robots'),
      canonical: getCanonicalUrl(),
    },

    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
      title: getMetaContent('og:title', 'property'),
      description: getMetaContent('og:description', 'property'),
      type: getMetaContent('og:type', 'property'),
      url: getMetaContent('og:url', 'property'),
      image: getMetaContent('og:image', 'property'),
      siteName: getMetaContent('og:site_name', 'property'),
      locale: getMetaContent('og:locale', 'property'),
    },

    // Twitter Card
    twitter: {
      card: getMetaContent('twitter:card'),
      site: getMetaContent('twitter:site'),
      creator: getMetaContent('twitter:creator'),
      title: getMetaContent('twitter:title'),
      description: getMetaContent('twitter:description'),
      image: getMetaContent('twitter:image'),
    },

    // Schema.org / JSON-LD structured data
    jsonLd: extractJsonLd(),

    // Additional discovery metadata
    discovery: {
      rssFeeds: extractRssFeeds(),
      alternateLanguages: extractAlternateLanguages(),
      appleTouchIcon: getAppleTouchIcon(),
      favicon: getFavicon(),
      themeColor: getMetaContent('theme-color'),
    },

    // Article-specific metadata (for blog posts, news, etc.)
    article: {
      publishedTime: getMetaContent('article:published_time', 'property'),
      modifiedTime: getMetaContent('article:modified_time', 'property'),
      author: getMetaContent('article:author', 'property'),
      section: getMetaContent('article:section', 'property'),
      tags: getMetaContentAll('article:tag', 'property'),
    },
  };

  // Clean up empty values
  return cleanObject(metadata);
}

function getMetaContent(name, attribute = 'name') {
  const selector = `meta[${attribute}="${name}"]`;
  const element = document.querySelector(selector);
  return element ? element.getAttribute('content') : null;
}

function getMetaContentAll(name, attribute = 'name') {
  const selector = `meta[${attribute}="${name}"]`;
  const elements = document.querySelectorAll(selector);
  const values = Array.from(elements).map(el => el.getAttribute('content')).filter(Boolean);
  return values.length > 0 ? values : null;
}

function getCanonicalUrl() {
  const link = document.querySelector('link[rel="canonical"]');
  return link ? link.getAttribute('href') : null;
}

function extractJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const data = [];

  scripts.forEach(script => {
    try {
      const parsed = JSON.parse(script.textContent);
      data.push(parsed);
    } catch (e) {
      // Invalid JSON-LD, skip
    }
  });

  return data.length > 0 ? data : null;
}

function extractRssFeeds() {
  const feeds = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
  const feedList = Array.from(feeds).map(feed => ({
    title: feed.getAttribute('title'),
    href: feed.getAttribute('href'),
    type: feed.getAttribute('type'),
  }));
  return feedList.length > 0 ? feedList : null;
}

function extractAlternateLanguages() {
  const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
  const langs = Array.from(alternates).map(link => ({
    lang: link.getAttribute('hreflang'),
    href: link.getAttribute('href'),
  }));
  return langs.length > 0 ? langs : null;
}

function getAppleTouchIcon() {
  const icon = document.querySelector('link[rel="apple-touch-icon"]');
  return icon ? icon.getAttribute('href') : null;
}

function getFavicon() {
  const icon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  return icon ? icon.getAttribute('href') : null;
}

function cleanObject(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    const cleaned = obj.map(cleanObject).filter(v => v !== null);
    return cleaned.length > 0 ? cleaned : null;
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }
  return obj;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageMetadata') {
    const metadata = extractPageMetadata();
    sendResponse({ success: true, metadata });
  }
  return true; // Keep the message channel open for async response
});
