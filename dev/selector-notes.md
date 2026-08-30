# MarkOFF — DOM Selector Inspection Notes

Status key:  ✅ Verified   ⏳ Needs inspection   ⚠ Partial

---

## ✅ Big W — bigw.com.au

**Inspected:** 2026-06  
**Test URL:** https://www.bigw.com.au/marketplace

**Card:** `[data-testid='product-tile']` (article element)  
**Badge:** `[class*='MarketplacePill']`  
**Detail:** `[class*='MarketplacePill']` (same component used on detail pages)  

**Notes:**
- Purple "Marketplace" badge rendered via `MarketplacePill` React component
- Class prefix is stable — same on listing AND detail pages
- 16/16 marketplace cards correctly identified on /marketplace page

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

**Inspected:** 2026-06, re-inspected 2026-08 (added badgeText/detailTextMatch after a false-positive was found)  
**Test URL:** https://www.kmart.com.au/collection/marketplace-baby-nursery/

**Card:** `li[data-testid='plp-grid-item']`  
**Badge:** `[class*='kosmos-ds-Box'][role='status']` + `badgeText: "marketplace"`  
**Detail:** `[class*='kosmos-ds-Box'][role='status']` + `detailTextMatch: "marketplace"`  

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

**Inspected:** 2026-06  
**Test URL:** https://www.jbhifi.com.au/collections/marketplace-all-products

**Card:** `[data-testid='product-card-content']`  
**Badge:** `[data-testid='marketplace-seller_callout_product-card']`  
**Detail:** `[data-testid='marketplace-seller_callout_product-card']`  

**Notes:**
- Shopify-based frontend — data-testid values are very stable
- Badge `<p>` contains `<strong>JB Hi-Fi Marketplace:</strong> Sold and sent by [seller]`
- The `data-testid='product-card-content'` is one level inside the card root but wraps all visible content — safe to hide
- 36 marketplace badges confirmed visible on /collections/marketplace-all-products

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

## ⏳ Kogan — kogan.com

**Status:** Not inspected  
**Test URL:** https://www.kogan.com/au/buy/phones/

**Notes:**
- Kogan is a marketplace-first site; most products are 3P
- First-party products show "Sold by Kogan.com"
- Need to find the "Sold by" element on a product card for both Kogan and 3P sellers
- May require inverting the logic: hide cards where seller ≠ "Kogan.com"

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

## Inspection workflow

1. Open test URL in Chrome DevTools
2. Open DevTools console, paste `_dev/devtools-probe.js`
3. Review output — note card root selector and badge selector
4. Verify with: `document.querySelectorAll('CARD_SEL').length` vs page product count
5. Verify with: `document.querySelectorAll('BADGE_SEL').length` vs visible marketplace items
6. Update `sites.js`: set confirmed selectors, set `inspected: true`
7. Update this file with findings
