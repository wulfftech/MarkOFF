---
name: markoff
description: Fixing/extending the MarkOFF marketplace extension. 
---

# MarkOFF Skill

MarkOFF is a dependency-free Chrome/Edge/Firefox MV3 extension that hides or highlights third-party marketplace items on 9 Australian retail sites (Big W, Woolworths, Bunnings, Kmart, JB Hi-Fi, Harvey Norman, Myer, Kogan, THE ICONIC). All retailer knowledge lives in one config file; the content script is generic.

## When to Use
- Fixing broken filtering on a site (almost always a CSS selector change in `sites.js`)
- Adding a new supported retailer
- Building/packaging zips for Chrome Web Store / AMO
- Debugging content-script behavior (SPA navigation, shadow DOM, detail-page warnings)

## Architecture
- `sites.js` — single source of truth: array of per-retailer configs (selectors, listing patterns, filter buttons, notes), injected before filter.js via manifest.
- `content/filter.js` — injected on all matched domains at `document_idle`; reads `MARKOFF_SITES`, applies Remove/Highlight mode, handles SPA re-runs and detail-page warnings.
- `popup/` — UI for global/per-site enable + toggle/highlight mode (`chrome.storage.sync`).
- `background.js` — MV3 service worker: install defaults + programmatic self-reload message handler.
- `dev/build.js` — zero-dependency Node zip packer writing to `dist/`.

## Commands
```bash
# Build store zips (Chrome + Firefox) — only "build" step, no deps beyond Node
node dev/build.js

# Run locally: chrome://extensions -> Developer Mode -> Load unpacked -> repo folder
# (edge://extensions same deal on Edge)

# Reload extension without chrome://extensions during dev:
chrome.runtime.sendMessage({ type: "MARKOFF_RELOAD" })
# or from any injected page: window.postMessage({ type: 'MARKOFF_RELOAD' }, '*')

# Discover new selectors: paste dev/devtools-probe.js into a retailer's console
# on a search/browse page containing marketplace items
```
No test suite, no package.json, no linter — verification is manual against live sites.

## Key Files
| Path | Role |
|---|---|
| `sites.js` | All retailer configs — fix selectors here |
| `content/filter.js` | The actual filtering engine (~530 lines) |
| `manifest.json` | MV3 manifest; domain match list must be updated for new sites |
| `dev/devtools-probe.js` | Console script for finding new selectors |
| `dev/selector-notes.md` | Per-site inspection history with verified dates/test URLs |
| `dev/build.js` | Zip packer → `dist/markoff-{chrome,firefox}-{ver}.zip` |
| `popup/popup.js` | Settings UI; shows `inspected: false` sites as unverified |

## Workflows
1. **Broken site**: open a listing page with marketplace items → run `dev/devtools-probe.js` → update card/badge/detail selectors in `sites.js` → set `inspected: true` after verifying → reload extension → confirm on live site. Record findings in `dev/selector-notes.md`.
2. **New retailer**: add config object in `sites.js`, add domain to `manifest.json` matches, probe selectors, verify listing vs detail behavior.
3. **Release**: bump `version` in `manifest.json`, run `node dev/build.js`, zips land in `dist/`.

## Pitfalls
- Retailers rewrite frontends constantly; hashed CSS-module class names break `[class*='...']` selectors — prefer stable attributes (`data-testid`, `data-locator`) where available.
- Woolworths renders product tiles inside **shadow roots** — normal querySelector can't see `.seller-name`; handled via `shadowBadge` config key.
- SPA navigation: filter relies on pathname+search change detection; URL-only changes trigger re-runs, but new DOM may arrive after the check (MutationObserver-dependent).
- Detail-page detection: `detailUrlPattern` takes priority over listing patterns — otherwise related-product carousels fool the DOM fallback (.html URLs at Harvey Norman/THE ICONIC).
- Myer is migrating marketplace platforms in 2026 — its selectors will likely need rework.
- CRLF line endings in `sites.js`/`filter.js` (Windows-authored) — keep consistent when editing.
- After updating selectors set `inspected: true`, or the popup flags the site as unverified.

See [references/sites.md](references/sites.md) for the full per-site selector inventory and signals table.
