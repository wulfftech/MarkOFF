# MarkOFF Site Reference

Signals per retailer (from `sites.js`, README, `dev/selector-notes.md`). Status as of inspection 2026-11.

| Site | Listing signal | Native filter / URL param | Detail warning | Notes |
|---|---|---|---|---|
| Big W | Card: `[data-testid='product-tile']`; badge `[class*='MarketplacePill']` | `button[role='switch'][id='marketplace-items']` | `[class*='MarketplacePill']` | `/marketplace` redirects to `/collection/marketplace` |
| Woolworths | `wc-product-tile, shared-product-tile`; shadow-DOM `.seller-name` (`shadowOwnSeller: "woolworths"`); `[class*='everyday-market']` | `[class*='chip-toggle']` ("Hide Everyday Market") | `[class*='everyday-market'], [class*='everydayMarket']` | Card-level primary catches Healthylife + BIG W sellers |
| Bunnings | Card: `[data-search-product-tile='true']`; badge `p.text-brand-marketplace-primary` | - | `p.text-brand-marketplace-primary` | Tailwind rewrite Aug 2026; verified Nov 2026 |
| Kmart | Card: `li[data-testid='plp-grid-item']`; badge `[class*='kosmos-ds-Box'][role='status']` (`badgeText: "marketplace"`) | - | `.pdp-seller-sold-by-container [class*='kosmos-ds-Box'][role='status']` (`detailTextMatch: "marketplace"`) | Detail scoped to `.pdp-seller-sold-by-container` so related-product rails don't false-positive |
| JB Hi-Fi | Card: `[data-testid='product-card-content']`; badge `[data-testid='marketplace-seller_callout_product-card']` | `?excludeMarketplace=true` on `/collections`; checkbox `[class*='Switch_switchContainer'] input[type='checkbox']` | `[data-testid='marketplace-seller_callout_pdp']` | PDP uses `_pdp` testid, not `_product-card` |
| Harvey Norman | Card: `[data-testid='product-card']`; badge `[data-testid='offer-flag']` (`badgeText: "online only"`) | - | `.product-cvps-header` (`detailTextMatch: "customer direct"`) | Product URLs end `.html` (`detailUrlPattern: "\\.html"`) |
| Myer (Myer Market) | Seller hidden in listing DOM | - | `.accordion-item` (`detailTextMatch: "marketplace partner"`) | Mirakl replatform (`enableMarketplaceReplatform: true`) verified Nov 2026 |
| Kogan | Seller hidden in listing DOM (`card: ""`) | - | `p.font-body-low-emphasis` (`detailTextMatch: "sold by"`, `detailOwnSeller: "kogan\\.com"`) | `card: ""` prevents related-product `<article>` rails on PDPs from fooling `isListingPage()` |
| THE ICONIC | None (`inspected: false`) | - | - | Old Citrus ad signal removed Aug 2026; no client-side seller signal exposed |
| Jaycar | Server-side URL param only (`card: ""`) | `?excludeEa=1`; `brandButton: "[class*='ProductListFilters_filterBtn']"` | - | Extended Assortment marketplace |

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
