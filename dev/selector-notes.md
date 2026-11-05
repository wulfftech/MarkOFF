# MarkOFF — DOM Selector Inspection Notes

Status key:  ✅ Verified   ⏳ Needs inspection   ⚠ Partial

---

## ✅ Big W — bigw.com.au

**Inspected:** 2026-06, re-verified 2026-11  
**Test URL:** https://www.bigw.com.au/collection/marketplace (`/marketplace` redirects here)

**Card:** `[data-testid='product-tile']` (article element)  
**Badge:** `[class*='MarketplacePill']`  
**Detail:** `[class*='MarketplacePill']` + `detailUrlPattern: "^/product/"`  

**Notes:**
- Purple "Marketplace" badge rendered via `MarketplacePill` React component
- Class prefix is stable - same on listing AND detail pages
- Nov 2026: 48/48 marketplace cards matched on `/collection/marketplace`; 48 cards / 1 marketplace card matched on `/toys/c/68`; detail page `/product/.../p/9900826728` matched `[class*='MarketplacePill']` cleanly. Added `"/collection/"` to `listingPatterns` and `detailUrlPattern: "^/product/"`.

---

## ✅ Bunnings — bunnings.com.au

**Inspected:** 2026-06, re-inspected 2026-08 (frontend rewrite broke the old selectors)  
**Test URL:** https://www.bunnings.com.au/search/products?q=bookshelf

**Card:** `[data-search-product-tile='true']` (plain div)  
**Badge:** `p.text-brand-marketplace-primary`  
**Detail:** `p.text-brand-marketplace-primary`  

**Notes:**
- Aug 2026: Bunnings rewrote the tile component in Tailwind. The old `data-locator` attributes
  ("extremely stable" as of Jun 2026 — narrator: it wasn't) are gone entirely. Card root changed
  from `<article data-locator='search-product-tile...'>` to a plain `<div data-search-product-tile='true'>`.
- New badge text is always "Marketplace | Online only" — no ambiguity, no badgeText needed
- Re-verified 36 cards / 24 marketplace items on a live search page, 0 mismatches with the new selectors
- Confirmed the new badge selector also works unchanged on product detail pages

---

## ✅ Kmart — kmart.com.au

**Inspected:** 2026-06, re-inspected 2026-08, re-inspected 2026-11 (scoped detail selector)  
**Test URL:** https://www.kmart.com.au/collection/marketplace-baby-nursery/

**Card:** `li[data-testid='plp-grid-item']`  
**Badge:** `[class*='kosmos-ds-Box'][role='status']` + `badgeText: "marketplace"`  
**Detail:** `.pdp-seller-sold-by-container [class*='kosmos-ds-Box'][role='status']` + `detailTextMatch: "marketplace"` + `detailUrlPattern: "^/product/"`  

**Notes:**
- Marketplace is live as of FY26
- Badge structure: `span.sc-jOiSOi > div.kosmos-ds-Box > div.kosmos-ds-Box[role=status] > span.kosmos-ds-Typography-labelLarge` → text: "Marketplace"
- `kosmos-ds-` prefix comes from Kmart's Kosmos design system — stable
- `role='status'` on the inner Box is the most specific stable hook
- Valid marketplace collection URLs follow `/collection/marketplace-*/` pattern
- Aug 2026: the same `role='status'` Box component now also renders "Trending", "Bestseller",
  "Online only", "Kmart", and "KmartTarget" labels — without `badgeText`, any status badge was
  being treated as marketplace. Confirmed live: 5 of 10 flagged cards on one category page were
  false positives (Trending/Bestseller). Detail pages have the same problem via a related-products
  rail, hence `detailTextMatch` too.
- Adding `badgeText` alone surfaced a second, separate bug in `filter.js`: some cards carry
  *multiple* status badges in DOM order `["Trending"|"Bestseller", "Marketplace", "Online only"]`.
  The old badge-matching code took only the first `querySelector` hit per card, so `badgeText`
  tested against "Trending"/"Bestseller" and missed 5 genuinely-marketplace cards entirely
  (false negative). Fixed in `filter.js`'s `isMarketplaceCard()` to search all matching badges in
  the card for one whose text matches `badgeText`, instead of just the first one found. Re-verified
  on the same page: 10/10 marketplace cards correctly flagged, 0 false positives, 0 missed.
- Nov 2026: on product detail pages (`/product/...`), `[class*='kosmos-ds-Box'][role='status']`
  matched 12 elements - 4 on the main product (mobile + desktop `.pdp-seller-sold-by-container` and
  `Online only`) and 8 inside the related-products carousel (`li[data-testid='scrollable-product-list-item'] .product-tile-seller-badge`),
  which included a `Marketplace` badge on a related item. An unscoped detail selector would
  false-positive on any 1P Kmart product page whose related-products rail contained a marketplace
  item. Scoped `selectors.detail` to `.pdp-seller-sold-by-container [class*='kosmos-ds-Box'][role='status']`
  and updated `filter.js` to prefer the visible (`offsetParent !== null`) match so the banner
  attaches to whichever of `.show-on-mobile` / `.hide-on-mobile` is active.

---

## ✅ Woolworths — woolworths.com.au  (button strategy)

**Inspected:** 2026-06  
**Test URL:** https://www.woolworths.com.au/shop/search/products?searchTerm=headphones

**Native filter button:** `button.chip.chip-toggle.chip-secondary` containing text "Hide Everyday Market"  
**Card:** `wc-product-tile` (Angular custom element)  
**Badge (fallback):** `[class*='everyday-market']` — TBD, not confirmed on individual cards yet  

**Notes:**
- Woolworths provides a NATIVE "Hide Everyday Market" toggle chip on search/browse pages
- filter.js auto-clicks this button when `filterButton` is defined in sites.js
- The button has `aria-pressed` attribute to track state — filter.js checks before clicking
- Per-card badge selector not yet confirmed — the button strategy supersedes this
- Angular app using `<wc-product-tile>` and `<shared-product-tile>` custom elements
- Site times out under repeated scripted requests — test manually
- **Aug 2026 bug fix:** the shadow-DOM `.seller-name` own-seller check was reusing the global
  `FIRST_PARTY_NAMES` list (shared with every other site's fallback text heuristic). That list
  includes "big w", "bunnings", "kmart", etc. — so a card sold by BIG W on Woolworths' own
  Everyday Market was being waved through as "first party" and never hidden. "First party" is
  site-relative, not global. Confirmed live: a headphones search had a card sold by "BIG W" among
  12 distinct third-party sellers. Fixed via a new per-site `shadowOwnSeller: "woolworths"` regex
  in sites.js, used only for this site's shadow-badge check instead of the shared list. Verified:
  old logic flagged 16/24 seller-tagged cards as marketplace, new logic correctly flags 17/24
  (catches the BIG W card too), 0 false suppressions on the same page.

---

## ✅ JB Hi-Fi — jbhifi.com.au

**Inspected:** 2026-06, re-inspected 2026-11 (fixed PDP detail selector)  
**Test URL:** https://www.jbhifi.com.au/collections/marketplace-all-products ; https://www.jbhifi.com.au/products/koolatron-retro-mini-fridge-4l-black

**Card:** `[data-testid='product-card-content']`  
**Badge:** `[data-testid='marketplace-seller_callout_product-card']`  
**Detail:** `[data-testid='marketplace-seller_callout_pdp'], [data-testid='marketplace-seller_callout_product-card']` + `detailUrlPattern: "^/products/"`  

**Notes:**
- Shopify-based frontend - data-testid values are very stable
- Badge `<p>` contains `<strong>JB Hi-Fi Marketplace:</strong> Sold and sent by [seller]`
- The `data-testid='product-card-content'` is one level inside the card root but wraps all visible content - safe to hide
- 36 marketplace badges confirmed visible on /collections/marketplace-all-products
- Nov 2026: product detail pages (`/products/...`) use `data-testid="marketplace-seller_callout_pdp"` rather than `marketplace-seller_callout_product-card` (which matched 0 elements on PDP). Updated `selectors.detail` and added `detailUrlPattern: "^/products/"`.

---

## ⏳ Coles — coles.com.au

**Partial inspection:** 2026-06  
**Test URL:** https://www.coles.com.au/search?q=air+fryer

**Card:** `section[data-testid='product-tile']` ✅ confirmed  
**Badge:** Not visible on listing pages as of Jun 2026 — needs re-inspection  
**Detail:** Unknown — inspect a Coles marketplace product detail page  

**Notes:**
- Coles marketplace products do NOT show a marketplace badge on search/listing pages
- Text fallback in filter.js ("Marketplace", "Sold by") may be the only listing-page signal
- `[data-testid='product-hat']` is the label container inside each card — check this on a product known to be marketplace
- Use Coles app or search for specific marketplace brands to find a known 3P product
- `coles-targeting-` prefix is their CSS module naming convention

---

## ✅ Chemist Warehouse — chemistwarehouse.com.au

**Inspected:** Jun 2026, spot-checked again Aug 2026 — no marketplace found either time.

**Notes:**
- This file previously said "Not inspected" while sites.js said inspected:true — sites.js was right, this file just hadn't been updated. Reconciled Aug 2026.
- If marketplace ever launches here, re-check for a "Sold by" or "Marketplace" badge on product cards.

---

## ✅ Kogan — kogan.com

**Inspected:** 2026-06, re-inspected 2026-11 (fixed `isListingPage()` collision on PDPs)  
**Test URL:** https://www.kogan.com/au/shop/category/phones-accessories-8450/phones/ ; https://www.kogan.com/au/buy/yellowprice-usb-c-car-charger-2-sockets-cigarette-lighter-splitter-1224v-80w-dual-usb-led-302002018/

**Card:** `""` (detail-only)  
**Badge:** `""` (not exposed on listing cards)  
**Detail:** `p.font-body-low-emphasis` + `detailTextMatch: "sold by"` + `detailOwnSeller: "kogan\\.com"`  

**Notes:**
- Listing cards expose no seller or marketplace signal in the DOM.
- Product detail pages render `p.font-body-low-emphasis` with `"Sold by [Seller]"` (twice in the DOM - once for desktop, once for mobile). `detailOwnSeller: "kogan\\.com"` suppresses warnings on 1P items.
- Nov 2026 bug fix: `selectors.card` was previously set to `"article"` with `listingPatterns: []`. Kogan product detail pages render 18 `<article>` elements in the related-products rail, so `isListingPage()`'s DOM fallback (`document.querySelector(site.selectors.card) !== null`) returned `true` on every product page and blocked the detail warning from ever running. Set `card: ""` and `listingPatterns: ["/au/shop/"]`.

---

## ✅ Myer — myer.com.au

**Inspected:** 2026-06, re-inspected 2026-11 (post-Mirakl replatform)  
**Test URL:** https://www.myer.com.au/c/men/mens-accessories/mens-watches ; https://www.myer.com.au/p/cudworth-apex-chronograph-watch-in-turquoise

**Card:** `[class*='product-detail']`  
**Badge:** `""` (not exposed in listing DOM)  
**Detail:** `.accordion-item` + `detailTextMatch: "marketplace partner"` + `detailUrlPattern: "^/p/"`  

**Notes:**
- Nov 2026: Myer's Mirakl migration (`"enableMarketplaceReplatform": true` in `#__NEXT_DATA__`) is now live. SSR `#__NEXT_DATA__` carries `miraklSkuId` on variants and `merchCategory: "MK MrktPlc Mirkl Cnc/..."`, but the rendered listing card DOM still has no marketplace badge (`[data-automation='delivery-only']` is driven by `productExclusive === "online_only"` in Myer's Next.js bundle, not seller identity).
- Detail pages on Mirakl items continue to render `.accordion-item` containing `"This item is sent directly from our Marketplace partner: [Seller]"` (verified on `/p/cudworth-apex-chronograph-watch-in-turquoise`, partner: Renniks Group). Added `detailUrlPattern: "^/p/"`.

---

## ⏳ Officeworks — officeworks.com.au

**Status:** Not inspected  
**Test URL:** https://www.officeworks.com.au/search?q=headphones

**Notes:**
- Wesfarmers group (same parent as Bunnings/Kmart)
- May share similar tech stack — check for `data-locator` attributes like Bunnings

---

## ✅ Harvey Norman — harveynorman.com.au

**Inspected:** 2026-06, re-inspected 2026-08 (card selector broke, this file was never updated the first time)  
**Test URL:** https://www.harveynorman.com.au/sale/computers-technology/drone-sale (any category sale page with 3P items works — this one had "ONLINE ONLY" hits)

**Card:** `[data-testid='product-card']`  
**Badge:** `[data-testid='offer-flag']` + `badgeText: "online only"`  
**Detail:** `.product-cvps-header` + `detailTextMatch: "customer direct"`

**Notes:**
- Aug 2026: `data-testid` lost its per-SKU suffix — was `product-card_{SKU}`, now a static
  `product-card` (SKU moved to a separate `data-product-sku` attribute, itself comma-separated
  for multi-variant listings). The old prefix-match selector matched 0 of 40 cards on a live page.
- Re-verified end to end: 40/40 cards matched, 10/40 correctly flagged via the "ONLINE ONLY" offer-flag
- Detail page for a flagged item showed `.product-cvps-header` = "Harvey Norman Customer Direct",
  matching `detailTextMatch` correctly. `detailUrlPattern: "\\.html"` still correct — the new card
  selector also returns 0 matches on detail pages so the DOM fallback agrees independently.

---

## ⚠ THE ICONIC — theiconic.com.au

**Status:** Re-inspected 2026-08 — found and removed a wrong signal, no replacement found yet.  
**Test URL:** https://www.theiconic.com.au/accessories/ (listing); any `.html` product page (detail)

**Notes:**
- The previously-shipped badge selector (`[data-track-affiliation='citrus'], .sponsored-message`)
  was NOT a marketplace signal — confirmed live it flags Citrus retail-media **sponsored ad**
  placements (the element's own text is literally "Sponsored"). On a single-brand ("On" running
  shoes) listing page, 8/60 cards were flagged purely via this signal, on a page where genuine 3P
  marketplace items are implausible. Removed from sites.js; `inspected` flipped to `false`.
- Looked for a replacement and came up empty:
  - JSON-LD `Product` blocks have no `seller` field (checked a normal item and a clearly
    dropship-style listing — a generic-brand "KAJA Clothing" yoga mat)
  - The "Delivery & Returns" accordion only renders a generic postcode delivery-estimate widget
    and boilerplate returns text — no seller/dispatch/fulfilment wording, even on the dropship item
  - THE ICONIC's own `/sell-with-us/` page names three marketplace fulfilment types ("Fulfilled By
    THE ICONIC", "Shipped By THE ICONIC", "Dropship") — none of that terminology appears anywhere
    in the product-page DOM that was checked
- THE ICONIC presents 1P and 3P products identically on listing pages (confirmed by research);
  ~42% of GMV is 3P as of 2025 — this site currently has no known working detection, listing or
  detail-page
- Next things worth trying: the mobile app's API responses (may expose seller data the web
  frontend hides), a delivery-estimate diff after actually entering a postcode (dropship items may
  quote longer windows), or diffing the network requests behind "Add to Bag" for a seller ID

---

## ✅ Jaycar — jaycar.com.au

**Inspected:** 2026-09  
**Test URL:** https://www.jaycar.com.au/search?text=led ; https://www.jaycar.com.au/3d-printers-supplies/c/10

**Strategy:** Server-side URL param `?excludeEa=1` (no card/badge/detail selectors)  

**Notes:**
- Jaycar launched a marketplace in 2026 ("Extended Assortment" — hence `excludeEa`). Brands
  include Monocure, Playseat, Logitech, Bluetti, Ultimate Ears, Swann.
- The "Exclude Marketplace Products" button on listing pages is a wrapper: clicking it navigates
  to `?excludeEa=1`. Confirmed live — button markup is
  `button.ProductListFilters_filterBtn__*[role='button']`, no `aria-pressed`/`aria-checked`,
  state is entirely URL-driven.
- No per-card marketplace badge exists. The only "marketplace" text on a listing page is the
  footer nav link + the button itself. Card tags (`[data-test-id='tag']`) only render
  "On special"/"Clearance".
- Detail pages expose seller via JSON-LD `Product.seller` (`{"@type":"Brand","name":"ELEEGO"}`)
  rather than any visible DOM text — no "sold by"/"dispatched by" wording. Detail-page warnings
  left disabled; the URL param covers listing filtering.
- Configured via `filterUrlParam: "excludeEa=1"` + `listingPatterns: ["/search", "/c/"]` — same
  mechanism as JB Hi-Fi's `?excludeMarketplace=true`. Works on both search and category pages.
- Note: `?text=` search param isn't honored on direct navigation (site returns a fallback grid),
  and Jaycar runs Forter bot-protection that trips on rapid scripted requests — verify manually.

---

## ⚠ Baby Bunting — babybunting.com.au (marketplace confirmed, selector not yet verified)

**Status:** Marketplace confirmed live — not yet inspected for DOM selectors  
**Test URL:** https://www.babybunting.com.au/marketplace/about ; https://www.babybunting.com.au/search?query=pram

**Notes:**
- Baby Bunting marketplace is live (Mirakl-powered, announced via /marketplace/about). Site docs state: "you will notice a 'Sold & Shipped By' note on the product display page which indicates that the product is sold and delivered by a Marketplace seller."
- 10,000+ marketplace products online per site marketing.
- Listing pages render Constructor.io `article` cards (`data-cnstrc-item-*`). First-party cards show "Only at BB" badge. Marketplace cards have no confirmed per-card badge yet.
- PDP "Sold & Shipped By" element not yet captured — needs direct inspection of a marketplace product page.
- Tracked in `sites.js` as `active: false, inspected: false`. Add PDP detail selector (`detail` + `detailTextMatch: "sold & shipped"`) once verified.

---

## ⚠ Chemist Warehouse — chemistwarehouse.com.au (marketplace confirmed, previous note was wrong)

**Status:** Marketplace confirmed live since Nov 2022 — previous Jun 2026 "no marketplace found" note was incorrect  
**Test URL:** https://www.chemistwarehouse.com.au/shop-online/all-marketplace-lines

**Notes:**
- Chemist Warehouse marketplace launched Nov 2022 (Marketplacer-powered). "All Marketplace Lines" page and "Interested in becoming a Marketplace Seller?" help text are live.
- Previous sites.js entry claimed "Inspected Jun 2026 — no marketplace found" — that inspection missed the marketplace. Entry reset to `inspected: false`.
- Per-card marketplace badge or PDP seller signal not yet verified — needs selector research before enabling.
- Tracked in `sites.js` as `active: false, inspected: false`.

---

## ⚠ Rebel Sport — rebel.com.au (marketplace confirmed, selector not yet verified)

**Status:** Marketplace confirmed live — not yet inspected for DOM selectors  
**Test URL:** https://rebel.com.au ; https://www.rebel.com.au/marketplace

**Notes:**
- Rebel Sport marketplace is live (Rithum/DSCO-powered; seller requirements documented at knowledge.rithum.com).
- Per-card badge and PDP seller signal not yet verified — needs selector research before enabling.
- Tracked in `sites.js` as `active: false, inspected: false`.

---

## Inspection workflow

1. Open test URL in Chrome DevTools
2. Open DevTools console, paste `_dev/devtools-probe.js`
3. Review output — note card root selector and badge selector
4. Verify with: `document.querySelectorAll('CARD_SEL').length` vs page product count
5. Verify with: `document.querySelectorAll('BADGE_SEL').length` vs visible marketplace items
6. Update `sites.js`: set confirmed selectors, set `inspected: true`
7. Update this file with findings
