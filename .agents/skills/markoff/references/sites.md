# MarkOFF Site Reference

Signals per retailer (from `sites.js`, README, `dev/selector-notes.md`). Status as of inspection 2026-06.

| Site | Listing signal | Native filter button | Detail warning | Notes |
|---|---|---|---|---|
| Big W | Card: `[data-testid='product-tile']`; badge `[class*='MarketplacePill']` | `button[role='switch'][id='marketplace-items']` (card fallback if absent) | Yes (MarketplacePill) | Test: bigw.com.au/marketplace |
| Woolworths | Angular custom elements `wc-product-tile, shared-product-tile`; shadow-DOM `.seller-name` (shadowBadge); `[class*='everyday-market']` | `[class*='chip-toggle']` — adds `isHideEverydayMarketProducts=true` server-side; secondary to card-level | Yes | Healthylife sellers missed by native button |
| Bunnings | `article[data-locator^='search-product-tile']`; badge `[data-locator='searchproducttile-badge-container']` | — | Yes | data-locator attrs very stable |
| Kmart | Badge `kosmos-ds-Box[role=status]` | — | Yes | |
| JB Hi-Fi | URL param `?excludeMarketplace=true` on collections; card badge on search | — | Yes | |
| Harvey Norman | "ONLINE ONLY" flag = Customer Direct items | — | Yes | Product URLs end .html → needs detailUrlPattern |
| Myer (Myer Market) | Listing pages don't expose seller identity | — | Yes | Platform migration 2026 — expect breakage |
| Kogan | Detail-page detection with own-seller suppression | — | Yes | |
| THE ICONIC | `data-track-affiliation` / `.sponsored-message` on cards | — | Yes | Seller identity hidden on listings entirely |

## Config keys in sites.js entries
- `id`, `name`, `domain`, `active`, `inspected`
- `selectors.card` / `.badge` / `.detail` / `.shadowBadge` (optional)
- `filterButton` / `filterButtonText` — native hide control to auto-click first
- `listingPatterns` — path fragments marking listing pages
- `detailUrlPattern` — optional regex; wins over listing patterns
- `notes`

## Dev loop
1. Load unpacked from repo root (Chrome or Edge developer mode).
2. Edit `sites.js`, save, reload via console: `chrome.runtime.sendMessage({ type: "MARKOFF_RELOAD" })`.
3. Verify on a live listing page containing marketplace items; use `dev/devtools-probe.js` to discover selectors.
4. Update `dev/selector-notes.md` with date + test URL; flip `inspected: true`.

## Packaging
`node dev/build.js` → `dist/markoff-chrome-<ver>.zip` + `dist/markoff-firefox-<ver>.zip`. Sources packaged: manifest.json, background.js, sites.js, content/filter.js, popup/*, icons/*. Firefox build uses the `browser_specific_settings.gecko` block already in manifest.json (min Gecko 109).
