# Fast Bookmark

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

### Firefox (enterprise policy — all profiles)

Use a system-wide policy to force-install the extension across all Firefox profiles. This works on release Firefox and bypasses signing.

1. Build the XPI: `make xpi`
2. Create `/etc/firefox/policies/policies.json`:
   ```json
   {
     "policies": {
       "ExtensionSettings": {
         "fast-bookmark-ext@local": {
           "installation_mode": "force_installed",
           "install_url": "file:///path/to/fast-bookmark-ext.xpi"
         }
       }
     }
   }
   ```
   Replace `/path/to` with the actual absolute path to the XPI.
3. Restart Firefox

### Firefox (per-profile)

Requires Firefox Developer Edition or Nightly (`xpinstall.signatures.required` must be set to `false` in `about:config`). This setting is ignored in release Firefox since version 48.

1. Build the XPI: `make xpi`
2. Copy or symlink it into your profile's extensions directory, named by the extension ID:
   ```
   cp fast-bookmark-ext.xpi /path/to/profile/extensions/fast-bookmark-ext@local.xpi
   ```
3. Restart Firefox

### Firefox (temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` — the extension is removed when Firefox closes

### Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this extension folder

## Usage

1. Navigate to any webpage you want to archive
2. Click the Fast Bookmark extension icon - JSON downloads immediately

Files are saved to your Downloads folder with the naming format:
```
{domain}_{title}_{date}.arc.json
```

Glob with `*.arc.json` to find all archived tabs.

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
