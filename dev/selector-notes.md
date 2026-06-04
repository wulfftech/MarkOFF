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

**Inspected:** 2026-06  
**Test URL:** https://www.bunnings.com.au/bunnings-marketplace

**Card:** `article[data-locator^='search-product-tile']`  
**Badge:** `[data-locator='searchproducttile-badge-container']`  
**Detail:** `[data-locator='searchproducttile-badge-container']`  

**Notes:**
- `data-locator` attributes are from Bunnings' own component library — extremely stable
- Badge div contains `div.badgeContent > div.badgeText` with text "Marketplace"
- `/bunnings-marketplace` is the correct marketplace landing page URL

---

## ✅ Kmart — kmart.com.au

**Inspected:** 2026-06  
**Test URL:** https://www.kmart.com.au/collection/marketplace-baby-nursery/

**Card:** `li[data-testid='plp-grid-item']`  
**Badge:** `[class*='kosmos-ds-Box'][role='status']`  
**Detail:** `[class*='kosmos-ds-Box'][role='status']`  

**Notes:**
- Marketplace is live as of FY26
- Badge structure: `span.sc-jOiSOi > div.kosmos-ds-Box > div.kosmos-ds-Box[role=status] > span.kosmos-ds-Typography-labelLarge` → text: "Marketplace"
- `kosmos-ds-` prefix comes from Kmart's Kosmos design system — stable
- `role='status'` on the inner Box is the most specific stable hook
- Valid marketplace collection URLs follow `/collection/marketplace-*/` pattern

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

## ⏳ Chemist Warehouse — chemistwarehouse.com.au

**Status:** Not inspected  
**Test URL:** https://www.chemistwarehouse.com.au/Search?q=vitamins

**Notes:**
- Confirm marketplace is actually embedded in search results (vs a separate site)
- Look for "Sold by" or "Marketplace" badge on product cards

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

## ⚠ THE ICONIC — theiconic.com.au

**Status:** Not inspected  
**Test URL:** https://www.theiconic.com.au/search/?q=sneakers

**Notes:**
- THE ICONIC presents 1P and 3P products identically on listing pages (confirmed by research)
- ~42% of GMV is 3P as of 2025
- Primary protection = detail-page warning
- Check detail page for any "Sold by", "Dispatched by", or "Fulfilled by" element
- Check JSON-LD structured data (`script[type="application/ld+json"]`) for seller field

---

## Inspection workflow

1. Open test URL in Chrome DevTools
2. Open DevTools console, paste `_dev/devtools-probe.js`
3. Review output — note card root selector and badge selector
4. Verify with: `document.querySelectorAll('CARD_SEL').length` vs page product count
5. Verify with: `document.querySelectorAll('BADGE_SEL').length` vs visible marketplace items
6. Update `sites.js`: set confirmed selectors, set `inspected: true`
7. Update this file with findings
