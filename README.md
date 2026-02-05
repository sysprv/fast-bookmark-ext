# Tab Archiver

A browser extension that archives tab metadata to JSON files before you close them.

## Features

- **Page metadata**: Title, URL, domain, pathname
- **Tab timing**: When the tab was opened, session duration
- **Navigation history**: Track how you got to the current page
- **SEO metadata**: Description, keywords, author, canonical URL
- **Open Graph**: Facebook/LinkedIn sharing metadata
- **Twitter Cards**: Twitter sharing metadata
- **Article data**: Published date, author, tags (for blog posts/news)
- **Structured data**: JSON-LD/Schema.org data
- **Discovery info**: RSS feeds, alternate languages, favicons

## Installation

### Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this extension folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file in this folder

**Note**: For permanent Firefox installation, the extension needs to be signed or you need Firefox Developer Edition with `xpinstall.signatures.required` set to `false`.

## Usage

1. Navigate to any webpage you want to archive
2. Click the Tab Archiver extension icon - JSON downloads immediately

Files are saved to your Downloads folder with the naming format:
```
{domain}_{title}_{date}.json
```

## JSON Output Structure

```json
{
  "archive": {
    "version": "1.0",
    "archivedAt": "2024-01-15T10:30:00.000Z",
    "archivedAtLocal": "1/15/2024, 10:30:00 AM"
  },
  "page": {
    "title": "Page Title",
    "url": "https://example.com/page",
    "domain": "example.com",
    "pathname": "/page"
  },
  "tab": {
    "openedAt": "2024-01-15T09:00:00.000Z",
    "sessionDuration": 5400,
    "sessionDurationFormatted": "1h 30m",
    "navigationHistory": [
      { "url": "https://google.com/search?q=...", "timestamp": 1705312800000 },
      { "url": "https://example.com/page", "timestamp": 1705313400000 }
    ]
  },
  "seo": {
    "description": "...",
    "keywords": "..."
  },
  "openGraph": {...},
  "twitter": {...},
  "article": {...},
  "structuredData": [...],
  "discovery": {...}
}
```

## Permissions

- `activeTab`: Access the current tab when you click the extension
- `tabs`: Track tab open times and navigation history
- `downloads`: Save JSON files to your computer
- `scripting`: Inject content script to extract page metadata

## Privacy

All data stays local on your machine. The extension:
- Does NOT send any data to external servers
- Does NOT track your browsing across sites
- Only activates when YOU click the extension icon
- Stores tab timing data only in memory (cleared when browser closes)
