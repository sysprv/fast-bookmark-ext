# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fast Bookmark is a browser extension (Manifest V3) that archives tab metadata to JSON files. When the user clicks the extension icon, it immediately downloads a `.arc.json` file containing page metadata, navigation history, timing data, SEO tags, Open Graph, Twitter Cards, structured data, and more. Targets both Chrome and Firefox.

## Build & Development

**Build (CI):** `zip -r fast-bookmark-ext.zip manifest.json background.js content.js icons/ README.md`

There is no package.json, no bundler, no test framework, and no linter. The extension is vanilla JavaScript loaded directly by the browser.

**Load in Chrome:** `chrome://extensions/` → Developer mode → Load unpacked → select repo folder

**Load in Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`

## Architecture

Two-file architecture with message passing between a background service worker and a content script:

- **`background.js`** — Service worker that coordinates everything. Tracks tab open times and navigation history in `Map` objects (`tabOpenTimes`, `tabHistory`). Listens for `chrome.action.onClicked` to trigger archiving. Sends a message to the content script to extract metadata, builds the final JSON structure, generates a filename (`{domain}_{title}_{date}.arc.json`), and triggers download via Blob URL.

- **`content.js`** — Content script injected on all pages at `document_idle`. Listens for `getPageMetadata` messages from the background script. Extracts metadata from the DOM: meta tags, Open Graph, Twitter Cards, JSON-LD structured data, RSS feeds, alternate languages, and favicons. Returns cleaned data (nulls/empty values stripped via recursive `cleanObject()`).

- **`manifest.json`** — Manifest V3 config. Includes both `service_worker` and `scripts` keys in the background section for Firefox compatibility. Permissions: `activeTab`, `tabs`, `downloads`, `scripting`.

**Core flow:** Icon click → `background.js` sends `getPageMetadata` message → `content.js` extracts and returns metadata → `background.js` assembles archive JSON with tab timing/history → downloads as `.arc.json` file.

## Key Implementation Details

- Blob URLs used for downloads (not data URLs) for Firefox compatibility; cleanup is delayed 1000ms so Firefox can finish the download.
- Tab history and timing are stored in-memory only (Maps in the service worker) and cleaned up on `tabs.onRemoved`.
- Internal browser pages (`chrome://`, `about:`, `moz-extension://`) are detected and skipped with a user-friendly alert.
- Filename generation strips `www.` and TLD from domain, removes invalid filename chars from title, and truncates title to 50 characters.
