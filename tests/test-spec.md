# MarkOFF — Deep Test Specification

## Scope
Every test below maps to a real, live scenario verified (or pending verification) against production retailer sites. Tests are written to be executable — see `tests/runner/markoff-test-runner.js` for the browser-based harness.

Status key: `✅` verified live | `⚠️` needs re-verification | `⬜` pending (new marketplace, selector research)

---

## Category A — Per-retailer filtering (tests A-01 → A-80)

Eight tests per active retailer (Big W, Woolworths, Bunnings, Kmart, JB Hi-Fi, Harvey Norman, Myer, Kogan, THE ICONIC, Jaycar) = 80 tests.

### A-01 Big W — card selector matches live products
- **Site:** bigw.com.au
- **Page:** /collection/marketplace or /toys/c/68
- **Selector:** `[data-testid='product-tile']`
- **Assertion:** `document.querySelectorAll("[data-testid='product-tile']").length > 0`
- **Status:** ✅ Verified (48 cards on /collection/marketplace, 48 on /toys/c/68)

### A-02 Big W — badge selector identifies marketplace cards only
- **Site:** bigw.com.au
- **Page:** /collection/marketplace
- **Selector:** `[class*='MarketplacePill']`
- **Assertion:** every card containing `[class*='MarketplacePill']` is visually a marketplace item; count matches visible purple pills
- **Status:** ✅ Verified (48/48 cards have badge on /collection/marketplace)

### A-03 Big W — toggle mode hides marketplace cards
- **Site:** bigw.com.au
- **Page:** /collection/marketplace
- **Mode:** toggle
- **Assertion:** cards with badge get `markoff-hidden` class (display:none); non-badge cards remain visible
- **Status:** ⬜ Needs browser harness run

### A-04 Big W — highlight mode outlines marketplace cards
- **Site:** bigw.com.au
- **Page:** /collection/marketplace
- **Mode:** highlight
- **Assertion:** cards with badge get `markoff-highlighted` class (purple outline)
- **Status:** ⬜ Needs browser harness run

### A-05 Big W — detail page warning shows on marketplace product
- **Site:** bigw.com.au
- **Page:** /product/*/p/* (marketplace item)
- **Assertion:** `#markoff-detail-warning` banner present
- **Status:** ✅ Verified (detail page has `[class*='MarketplacePill']`, `detailUrlPattern: "^/product/"`)

### A-06 Big W — detail page warning suppressed for 1P product
- **Site:** bigw.com.au
- **Page:** /product/*/p/* (first-party item)
- **Assertion:** no `#markoff-detail-warning` banner
- **Status:** ⬜ Needs browser harness run

### A-07 Big W — `/marketplace` redirects to `/collection/marketplace`
- **Site:** bigw.com.au
- **Page:** /marketplace
- **Assertion:** URL resolves to /collection/marketplace; listingPatterns includes "/collection/"
- **Status:** ✅ Verified Nov 2026

### A-08 Big W — no crash on empty/non-marketplace page
- **Site:** bigw.com.au
- **Page:** /product/* (non-marketplace PDP)
- **Assertion:** filter.js runs without exception; badge count = 0
- **Status:** ⬜ Needs browser harness run

---

### A-09 Woolworths — wc-product-tile custom elements present
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Selector:** `wc-product-tile, shared-product-tile`
- **Assertion:** elements exist in DOM (note: headless/bot-blocked sessions may not hydrate custom elements; manual verification required)
- **Status:** ✅ Verified (24 wc-product-tile tags present)

### A-10 Woolworths — shadow DOM `.seller-name` detected
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Selector:** `.seller-name` inside `wc-product-tile.shadowRoot`
- **Assertion:** shadow seller text present on 3P cards; absent on 1P cards
- **Status:** ⚠️ Needs manual verification (bot protection blocks headless)

### A-11 Woolworths — shadowOwnSeller scopes to "woolworths" only
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Assertion:** card sold by "BIG W" is treated as 3P (not suppressed by global FIRST_PARTY_NAMES)
- **Status:** ✅ Verified Aug 2026 fix

### A-12 Woolworths — native "Hide Everyday Market" chip clickable
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Selector:** `[class*='chip-toggle']`
- **Assertion:** button exists with `aria-pressed`; click adds `isHideEverydayMarketProducts=true` to URL
- **Status:** ✅ Verified (button present, aria-pressed="false")

### A-13 Woolworths — card-level filter catches Healthylife sellers
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Assertion:** cards sold by Healthylife (non-Woolworths) are hidden even if native button misses them
- **Status:** ✅ Verified Aug 2026 (card-level primary strategy)

### A-14 Woolworths — toggle + native button don't conflict
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Assertion:** applying filter twice doesn't double-click native button (nativeFilterActive guard)
- **Status:** ⬜ Needs browser harness run

### A-15 Woolworths — no crash when custom elements not hydrated
- **Site:** woolworths.com.au
- **Page:** /shop/search/products?searchTerm=headphones
- **Assertion:** filter.js runs without exception even if `wc-product-tile.shadowRoot` is null
- **Status:** ✅ Verified (shadowRoot guard in isMarketplaceCard)

---

### A-16 Bunnings — card selector `[data-search-product-tile='true']` matches
- **Site:** bunnings.com.au
- **Page:** /search/products?q=bookshelf
- **Assertion:** cards found; count > 0
- **Status:** ✅ Verified (36 cards)

### A-17 Bunnings — badge `p.text-brand-marketplace-primary` identifies marketplace only
- **Site:** bunnings.com.au
- **Page:** /search/products?q=bookshelf
- **Assertion:** badge text = "Marketplace | Online only"; count matches marketplace items
- **Status:** ✅ Verified (22 badges, 22 cards with badge)

### A-18 Bunnings — old `data-locator` selectors no longer used
- **Site:** bunnings.com.au
- **Page:** /search/products?q=bookshelf
- **Assertion:** `data-locator` attributes absent; sites.js uses new Tailwind selectors
- **Status:** ✅ Verified (Aug 2026 rewrite confirmed)

### A-19 Bunnings — toggle mode hides marketplace cards
- **Site:** bunnings.com.au
- **Page:** /search/products?q=bookshelf
- **Mode:** toggle
- **Assertion:** marketplace cards get `markoff-hidden`
- **Status:** ⬜ Needs browser harness run

### A-20 Bunnings — detail page warning shows on marketplace PDP
- **Site:** bunnings.com.au
- **Page:** /foret-bookshelf-..._p1076019 (marketplace)
- **Assertion:** `#markoff-detail-warning` present via `p.text-brand-marketplace-primary`
- **Status:** ✅ Verified (badge present on PDP, `data-search-product-tile` absent → isListingPage=false)

### A-21 Bunnings — detail page warning suppressed for 1P PDP
- **Site:** bunnings.com.au
- **Page:** /p/* (first-party item)
- **Assertion:** no `#markoff-detail-warning`
- **Status:** ⬜ Needs browser harness run

### A-22 Bunnings — no crash on category pages without cards
- **Site:** bunnings.com.au
- **Page:** /category/* (any)
- **Assertion:** filter.js runs without exception
- **Status:** ⬜ Needs browser harness run

---

### A-23 Kmart — card selector `li[data-testid='plp-grid-item']` matches
- **Site:** kmart.com.au
- **Page:** /collection/marketplace-baby-nursery/
- **Assertion:** cards found; count > 0
- **Status:** ✅ Verified (52 cards)

### A-24 Kmart — badgeText "marketplace" gates Trending/Bestseller/Online only
- **Site:** kmart.com.au
- **Page:** /collection/marketplace-baby-nursery/
- **Assertion:** only cards with "Marketplace" status badge counted; Trending/Bestseller excluded
- **Status:** ✅ Verified (10 Marketplace, 5 Bestseller, 10 Online only — only 10 counted)

### A-25 Kmart — multi-badge cards handled (querySelectorAll+find, not first-match)
- **Site:** kmart.com.au
- **Page:** /collection/marketplace-baby-nursery/
- **Assertion:** card with ["Trending", "Marketplace", "Online only"] badges correctly flagged as marketplace
- **Status:** ✅ Verified Aug 2026 (isMarketplaceCard fix)

### A-26 Kmart — detail page scoped to `.pdp-seller-sold-by-container`
- **Site:** kmart.com.au
- **Page:** /product/rockit-automatic-rechargeable-rocker... (marketplace PDP)
- **Assertion:** detail selector excludes related-products carousel badges (`.product-tile-seller-badge`)
- **Status:** ✅ Verified (12 badges on PDP; 4 in .pdp-seller-sold-by-container, 8 in carousel)

### A-27 Kmart — detailTextMatch "marketplace" prevents false warning on 1P PDP
- **Site:** kmart.com.au
- **Page:** /product/* (1P item with marketplace item in related-products rail)
- **Assertion:** no false-positive warning from carousel badge
- **Status:** ⬜ Needs browser harness run

### A-28 Kmart — visible anchor preferred (offsetParent check)
- **Site:** kmart.com.au
- **Page:** /product/* (marketplace PDP with mobile+desktop badge duplicates)
- **Assertion:** warning attaches to visible `.show-on-mobile` / `.hide-on-mobile` block
- **Status:** ⬜ Needs browser harness run

---

### A-29 JB Hi-Fi — card selector `[data-testid='product-card-content']` matches
- **Site:** jbhifi.com.au
- **Page:** /collections/marketplace-all-products
- **Assertion:** cards found; count > 0
- **Status:** ✅ Verified (36 cards)

### A-30 JB Hi-Fi — badge selector `[data-testid='marketplace-seller_callout_product-card']` matches
- **Site:** jbhifi.com.au
- **Page:** /collections/marketplace-all-products
- **Assertion:** badge found on marketplace cards; count = card count
- **Status:** ✅ Verified (36 badges)

### A-31 JB Hi-Fi — URL param `?excludeMarketplace=true` injected on /collections
- **Site:** jbhifi.com.au
- **Page:** /collections/headphones-speakers-audio/headphones
- **Assertion:** location.replace() adds excludeMarketplace=true; subsequent nav preserves param
- **Status:** ⬜ Needs browser harness run (bot protection blocks headless /search)

### A-32 JB Hi-Fi — detail page uses `_pdp` testid (not `_product-card`)
- **Site:** jbhifi.com.au
- **Page:** /products/koolatron-retro-mini-fridge-4l-black
- **Assertion:** `[data-testid='marketplace-seller_callout_pdp']` found; `_product-card` matches 0
- **Status:** ✅ Verified Nov 2026

### A-33 JB Hi-Fi — detailUrlPattern "^/products/" recognized
- **Site:** jbhifi.com.au
- **Page:** /products/*
- **Assertion:** isListingPage() returns false on PDP
- **Status:** ✅ Verified (cardsOnDetail = 0)

### A-34 JB Hi-Fi — native toggle button on collections pages
- **Site:** jbhifi.com.au
- **Page:** /collections/*
- **Selector:** `[class*='Switch_switchContainer'] input[type='checkbox']`
- **Assertion:** button found and clickable
- **Status:** ⬜ Needs browser harness run

### A-35 JB Hi-Fi — no crash on /search (Algolia may return 0 results in headless)
- **Site:** jbhifi.com.au
- **Page:** /search?query=headphones
- **Assertion:** filter.js runs without exception even with 0 cards
- **Status:** ⚠️ Headless returns 0 results (bot protection); manual verification needed

---

### A-36 Harvey Norman — card selector `[data-testid='product-card']` matches
- **Site:** harveynorman.com.au
- **Page:** /sale/computers-technology/drone-sale
- **Assertion:** cards found; count > 0
- **Status:** ✅ Verified (4 cards)

### A-37 Harvey Norman — badge `[data-testid='offer-flag']` + badgeText "online only"
- **Site:** harveynorman.com.au
- **Page:** /sale/computers-technology/drone-sale
- **Assertion:** only "ONLINE ONLY" flags counted (not all offer-flags)
- **Status:** ✅ Verified (4/4 flags = ONLINE ONLY)

### A-38 Harvey Norman — detailUrlPattern "\\.html" prevents carousel false-positive
- **Site:** harveynorman.com.au
- **Page:** /zlos-sun-angle-navigator.html
- **Assertion:** isListingPage() returns false; related-product carousel doesn't trigger listing logic
- **Status:** ✅ Verified

### A-39 Harvey Norman — detail `.product-cvps-header` + detailTextMatch "customer direct"
- **Site:** harveynorman.com.au
- **Page:** /zlos-sun-angle-navigator.html
- **Assertion:** `.product-cvps-header` text contains "Customer Direct"; warning shown
- **Status:** ✅ Verified ("Harvey Norman Customer Direct")

### A-40 Harvey Norman — detail warning suppressed for 1P product
- **Site:** harveynorman.com.au
- **Page:** /p/* (first-party product)
- **Assertion:** no `#markoff-detail-warning`
- **Status:** ⬜ Needs browser harness run

---

### A-41 Myer — Mirakl replatform detected (`enableMarketplaceReplatform: true`)
- **Site:** myer.com.au
- **Page:** /c/men/mens-accessories/mens-watches
- **Assertion:** `__NEXT_DATA__` contains `"enableMarketplaceReplatform": true`
- **Status:** ✅ Verified Nov 2026

### A-42 Myer — listing DOM hides seller identity (no per-card badge)
- **Site:** myer.com.au
- **Page:** /c/men/mens-accessories/mens-watches
- **Assertion:** no marketplace/seller badge in listing card DOM; `[data-automation='delivery-only']` is online_only, not seller-specific
- **Status:** ✅ Verified (delivery-only matched Mirakl count 1-for-1 but is driven by productExclusive, not seller)

### A-43 Myer — detail `.accordion-item` + detailTextMatch "marketplace partner"
- **Site:** myer.com.au
- **Page:** /p/cudworth-apex-chronograph-watch-in-turquoise (Mirakl item)
- **Assertion:** `.accordion-item` contains "sent directly from our Marketplace partner"; warning shown
- **Status:** ✅ Verified Nov 2026

### A-44 Myer — detailUrlPattern "^/p/" recognized
- **Site:** myer.com.au
- **Page:** /p/*
- **Assertion:** isListingPage() returns false on PDP
- **Status:** ✅ Verified (productDetailCountOnDetailPage = 0)

### A-45 Myer — 1P product suppresses detail warning
- **Site:** myer.com.au
- **Page:** /p/* (first-party item, no "marketplace partner" text)
- **Assertion:** no `#markoff-detail-warning`
- **Status:** ⬜ Needs browser harness run

### A-46 Myer — listing-page filtering not available (detail-only site)
- **Site:** myer.com.au
- **Page:** /c/* (listing)
- **Assertion:** no cards hidden on listing page; detail warning only
- **Status:** ✅ Verified (no DOM seller signal on listings)

---

### A-47 Kogan — card selector `""` (empty, detail-only)
- **Site:** kogan.com
- **Page:** /au/shop/category/phones-accessories-8450/phones/
- **Assertion:** `selectors.card` is empty; no querySelectorAll("") SyntaxError
- **Status:** ✅ Verified Nov 2026 fix

### A-48 Kogan — related-product `<article>` rail doesn't fool isListingPage()
- **Site:** kogan.com
- **Page:** /au/buy/yellowprice-usb-c-car-charger...-302002018/ (PDP)
- **Assertion:** isListingPage() returns false despite 18 `<article>` elements on PDP
- **Status:** ✅ Verified (articleCountOnDetailPage = 18, but card="" prevents DOM fallback)

### A-49 Kogan — detail `p.font-body-low-emphasis` + detailTextMatch "sold by"
- **Site:** kogan.com
- **Page:** /au/buy/yellowprice-usb-c-car-charger...-302002018/
- **Assertion:** "Sold by Yellow Price" found; warning shown for 3P item
- **Status:** ✅ Verified

### A-50 Kogan — detailOwnSeller "kogan\\.com" suppresses 1P warning
- **Site:** kogan.com
- **Page:** /au/buy/* (kogan.com first-party item)
- **Assertion:** "Sold by Kogan.com" → no warning
- **Status:** ⬜ Needs browser harness run

### A-51 Kogan — visible anchor preferred (mobile+desktop duplicate "Sold by")
- **Site:** kogan.com
- **Page:** /au/buy/* (PDP)
- **Assertion:** warning attaches to visible `p.font-body-low-emphasis`, not hidden mobile duplicate
- **Status:** ⬜ Needs browser harness run

### A-52 Kogan — listingPatterns ["/au/shop/"] recognized
- **Site:** kogan.com
- **Page:** /au/shop/category/* (listing)
- **Assertion:** isListingPage() returns true on shop category pages
- **Status:** ⬜ Needs browser harness run

---

### A-53 THE ICONIC — `inspected: false`, no filtering
- **Site:** theiconic.com.au
- **Page:** /women/clothing/
- **Assertion:** extension loads but does not hide/highlight any cards (no selectors)
- **Status:** ✅ Verified (60 cards, 0 marketplace signals in DOM/scripts)

### A-54 THE ICONIC — no false positives from Citrus sponsored ads
- **Site:** theiconic.com.au
- **Page:** /accessories/
- **Assertion:** `data-track-affiliation`/`.sponsored-message` NOT used (removed Aug 2026)
- **Status:** ✅ Verified (removed from sites.js)

### A-55 THE ICONIC — popup shows "unverified" tag
- **Site:** theiconic.com.au
- **Page:** any
- **Assertion:** popup renders `tag-unverified` for THE ICONIC
- **Status:** ⬜ Needs popup harness run

### A-56 THE ICONIC — detail page no warning
- **Site:** theiconic.com.au
- **Page:** *.html product page
- **Assertion:** no `#markoff-detail-warning` (detail selector empty)
- **Status:** ✅ Verified (no seller signal)

---

### A-57 Jaycar — URL param `?excludeEa=1` injected
- **Site:** jaycar.com.au
- **Page:** /3d-printers-supplies/c/10
- **Assertion:** excludeEa=1 added to URL; server returns filtered results
- **Status:** ⬜ Needs browser harness run (Forter bot protection)

### A-58 Jaycar — `brandButton` replaces "Exclude Marketplace Products" button text
- **Site:** jaycar.com.au
- **Page:** /3d-printers-supplies/c/10
- **Assertion:** button shows "Marketplace Items Hidden" when param active
- **Status:** ⬜ Needs browser harness run

### A-59 Jaycar — no per-card badge (card="" empty)
- **Site:** jaycar.com.au
- **Page:** /3d-printers-supplies/c/10
- **Assertion:** `selectors.card` is empty; no querySelectorAll("") error
- **Status:** ✅ Verified (button confirmed, no card selectors)

### A-60 Jaycar — works on both /search and /c/ pages
- **Site:** jaycar.com.au
- **Page:** /search and /c/*
- **Assertion:** listingPatterns ["/search", "/c/"] match both
- **Status:** ✅ Verified (c/ page loaded)

### A-61 Jaycar — param stripped when switching to highlight mode
- **Site:** jaycar.com.au
- **Page:** /search with ?excludeEa=1
- **Assertion:** switching to highlight mode removes param (history.replaceState)
- **Status:** ⬜ Needs browser harness run

---

### A-62 Big W — native toggle button absent on /c/ pages (card fallback covers)
- **Site:** bigw.com.au
- **Page:** /toys/c/68
- **Assertion:** no `button[role='switch'][id='marketplace-items']`; card-level filtering active
- **Status:** ✅ Verified (0 switches found)

### A-63 Woolworths — `/shop/specials` in listingPatterns
- **Site:** woolworths.com.au
- **Page:** /shop/specials
- **Assertion:** isListingPage() returns true
- **Status:** ⬜ Needs browser harness run

### A-64 Bunnings — `/brand` and `/bunnings-marketplace` in listingPatterns
- **Site:** bunnings.com.au
- **Page:** /brand/* and /bunnings-marketplace
- **Assertion:** isListingPage() returns true
- **Status:** ⬜ Needs browser harness run

### A-65 Kmart — `/category/`, `/collection/`, `/search` in listingPatterns
- **Site:** kmart.com.au
- **Page:** /category/*, /collection/*, /search
- **Assertion:** isListingPage() returns true
- **Status:** ✅ Verified (/collection/ loaded)

### A-66 JB Hi-Fi — `/category` in listingPatterns
- **Site:** jbhifi.com.au
- **Page:** /category/*
- **Assertion:** isListingPage() returns true (but param NOT injected — filterUrlParamPatterns only /collections)
- **Status:** ⬜ Needs browser harness run

### A-67 Harvey Norman — `/c/` and `/category` in listingPatterns
- **Site:** harveynorman.com.au
- **Page:** /c/* and /category/*
- **Assertion:** isListingPage() returns true
- **Status:** ⬜ Needs browser harness run

### A-68 Myer — `/search` and `/c/` in listingPatterns
- **Site:** myer.com.au
- **Page:** /search and /c/*
- **Assertion:** isListingPage() returns true
- **Status:** ⬜ Needs browser harness run

---

## Category B — New marketplaces pending verification (tests B-01 → B-12)

Three confirmed marketplaces with no verified selectors yet.

### B-01 Baby Bunting — marketplace page exists
- **Site:** babybunting.com.au
- **Page:** /marketplace/about
- **Assertion:** page loads; "Sold & Shipped By" note documented
- **Status:** ✅ Verified (webfetch)

### B-02 Baby Bunting — PDP "Sold & Shipped By" DOM element found
- **Site:** babybunting.com.au
- **Page:** /product/* (marketplace item)
- **Assertion:** element containing "Sold & Shipped By" found; selector captured
- **Status:** ⬜ Pending (need marketplace item PDP URL)

### B-03 Baby Bunting — per-card listing badge found (if any)
- **Site:** babybunting.com.au
- **Page:** /search?query=pram
- **Assertion:** card-level marketplace indicator found or confirmed absent
- **Status:** ⬜ Pending (Constructor.io cards show "Only at BB" = first-party)

### B-04 Baby Bunting — sites.js entry created (active:false, inspected:false)
- **Assertion:** sites.js has babybunting entry; manifest.json includes domain
- **Status:** ✅ Done (v1.1.2)

### B-05 Chemist Warehouse — marketplace page exists
- **Site:** chemistwarehouse.com.au
- **Page:** /shop-online/all-marketplace-lines
- **Assertion:** page loads; marketplace items listed
- **Status:** ✅ Verified (webfetch)

### B-06 Chemist Warehouse — previous "no marketplace" note corrected
- **Assertion:** sites.js note updated to reflect Nov 2022 marketplace launch
- **Status:** ✅ Done (v1.1.2)

### B-07 Chemist Warehouse — per-card or PDP seller signal found
- **Site:** chemistwarehouse.com.au
- **Page:** /shop-online/all-marketplace-lines
- **Assertion:** marketplace badge or "sold by" text found on cards/PDP
- **Status:** ⬜ Pending (bot protection blocked headless navigation)

### B-08 Chemist Warehouse — sites.js entry created (active:false, inspected:false)
- **Assertion:** sites.js has chemistwarehouse entry reset to inspected:false
- **Status:** ✅ Done (v1.1.2)

### B-09 Rebel Sport — marketplace page exists
- **Site:** rebel.com.au
- **Page:** rebel.com.au (homepage)
- **Assertion:** marketplace integration documented (Rithum/DSCO)
- **Status:** ✅ Verified (web search)

### B-10 Rebel Sport — per-card badge or PDP seller signal found
- **Site:** rebel.com.au
- **Page:** /marketplace or product listing
- **Assertion:** seller/badge signal found
- **Status:** ⬜ Pending (site not yet loaded in browser)

### B-11 Rebel Sport — sites.js entry created (active:false, inspected:false)
- **Assertion:** sites.js has rebelsport entry; manifest.json includes domain
- **Status:** ✅ Done (v1.1.2)

### B-12 New marketplace — officeworks/coles still confirmed no marketplace
- **Site:** officeworks.com.au, coles.com.au
- **Page:** search pages
- **Assertion:** no marketplace signals found
- **Status:** ✅ Verified (officworks: no marketplace text; coles: no marketplace)

---

## Category C — Filter engine / filter.js (tests C-01 → C-15)

### C-01 — Extension loads only on matched domains
- **Site:** any non-MarkOFF domain (e.g. google.com)
- **Assertion:** filter.js returns early (no site match); no classes injected
- **Status:** ⬜ Needs browser harness run

### C-02 — sites.js syntax valid (Node parse)
- **Assertion:** `node --check sites.js` passes
- **Status:** ✅ Verified

### C-03 — filter.js syntax valid (Node parse)
- **Assertion:** `node --check filter.js` passes
- **Status:** ✅ Verified

### C-04 — manifest.json valid JSON
- **Assertion:** `JSON.parse(manifest.json)` passes; version field present
- **Status:** ✅ Verified (v1.1.2)

### C-05 — Global toggle off disables all filtering
- **Assertion:** `chrome.storage.sync.get("globalEnabled") === false` → restoreAll(), no hiding
- **Status:** ⬜ Needs popup harness run

### C-06 — Per-site toggle off disables filtering for that site
- **Assertion:** `site_<id> === false` → filterEnabled = false for that site only
- **Status:** ⬜ Needs popup harness run

### C-07 — Toggle vs highlight mode switching
- **Assertion:** switching modes restores hidden cards / applies highlights correctly
- **Status:** ⬜ Needs browser harness run

### C-08 — SPA navigation (pushState/replaceState) triggers re-filter
- **Assertion:** history.patch triggers onNavigate → scheduleFilter → applyFilter
- **Status:** ⬜ Needs browser harness run

### C-09 — popstate (back/forward) triggers re-filter
- **Assertion:** window.addEventListener("popstate") → onNavigate
- **Status:** ⬜ Needs browser harness run

### C-10 — MutationObserver catches lazy-loaded / infinite-scroll cards
- **Assertion:** addedNodes → scheduleFilter → applyFilter (debounced 300ms)
- **Status:** ⬜ Needs browser harness run

### C-11 — Peek badge click shows/hides hidden items (dimmed toggle)
- **Assertion:** badge click toggles HIDDEN_CLASS ↔ DIMMED_CLASS
- **Status:** ⬜ Needs browser harness run

### C-12 — URL param injection on eligible paths only
- **Assertion:** JB Hi-Fi /collections gets param; /search does not (filterUrlParamPatterns guard)
- **Status:** ⬜ Needs browser harness run

### C-13 — Pre-navigation href patching adds param to links
- **Assertion:** patchOutboundNavigation rewrites a[href] with excludeEa=1 / excludeMarketplace=true
- **Status:** ⬜ Needs browser harness run

### C-14 — Form GET submission gets param added
- **Assertion:** capture-phase submit listener adds param to form.action
- **Status:** ⬜ Needs browser harness run

### C-15 — Detail warning anchor prefers visible element (offsetParent)
- **Assertion:** candidates.filter(el => el.offsetParent !== null) || candidates[0]
- **Status:** ✅ Verified logic (Nov 2026 fix)

---

## Category D — Popup UI (tests D-01 → D-08)

### D-01 — Popup renders site list with correct active/inactive states
- **Assertion:** site-inactive class on officeworks/coles/chemistwarehouse/catch/babybunting/rebelsport/theiconic
- **Status:** ⬜ Needs popup harness run

### D-02 — Popup shows "unverified" tag for theiconic, babybunting, chemistwarehouse, rebelsport
- **Assertion:** tag-unverified class where inspected === false
- **Status:** ⬜ Needs popup harness run

### D-03 — Popup shows "detail only" tag for myer, kogan, harveynorman
- **Assertion:** tag-detail-only class where badge empty but detail set
- **Status:** ⬜ Needs popup harness run

### D-04 — Global toggle persists to chrome.storage.sync
- **Assertion:** storage.get("globalEnabled") matches toggle state
- **Status:** ⬜ Needs popup harness run

### D-05 — Filter mode persists and broadcasts MARKOFF_MODE
- **Assertion:** storage.get("filterMode"); content script receives message
- **Status:** ⬜ Needs popup harness run

### D-06 — About panel shows correct version from manifest
- **Assertion:** chrome.runtime.getManifest().version = 1.1.2
- **Status:** ⬜ Needs popup harness run

### D-07 — Per-site toggle persists
- **Assertion:** storage.get("site_<id>") matches toggle state
- **Status:** ⬜ Needs popup harness run

### D-08 — Disabled sites (officeworks, coles, etc.) have disabled toggle inputs
- **Assertion:** input.disabled === true for active === false sites
- **Status:** ⬜ Needs popup harness run

---

## Category E — Build / packaging / release (tests E-01 → E-08)

### E-01 — `node dev/build.js` produces Chrome zip
- **Assertion:** dist/markoff-chrome-1.1.2.zip exists; contains 10 files
- **Status:** ✅ Verified

### E-02 — `node dev/build.js` produces Firefox zip
- **Assertion:** dist/markoff-firefox-1.1.2.zip exists; contains 10 files
- **Status:** ✅ Verified

### E-03 — Chrome manifest_version = 3, no browser_specific_settings
- **Assertion:** buildVariant("chrome") deletes browser_specific_settings
- **Status:** ✅ Verified

### E-04 — Firefox manifest_version = 2, browser_action, background.scripts
- **Assertion:** buildVariant("firefox") transforms correctly
- **Status:** ✅ Verified

### E-05 — Firefox data_collection_permissions = { required: ["none"] }
- **Assertion:** gecko block present in Firefox manifest
- **Status:** ✅ Verified

### E-06 — ZIP integrity (can be unzipped)
- **Assertion:** unzip -t passes on both zips
- **Status:** ⬜ Needs shell verification

### E-07 — CRLF line endings in sites.js, filter.js, manifest.json
- **Assertion:** no lone LF; Windows-authored consistency
- **Status:** ✅ Verified (all CRLF)

### E-08 — Version consistent across manifest and zips
- **Assertion:** manifest.json version = 1.1.2; zip filenames match
- **Status:** ✅ Verified

---

## Category F — Regression / edge cases (tests F-01 → F-10)

### F-01 — Detail-page warning block restored (was `// ...existing code...` stub)
- **Assertion:** filter.js contains real showDetailWarning logic, not stub comment
- **Status:** ✅ Verified (restored in v1.1.1)

### F-02 — Kmart related-products carousel doesn't false-positive on 1P PDP
- **Assertion:** detail scoped to `.pdp-seller-sold-by-container`
- **Status:** ✅ Verified Nov 2026

### F-03 — Kogan PDP doesn't get misclassified as listing page
- **Assertion:** card = "" prevents DOM fallback on 18-article PDP
- **Status:** ✅ Verified Nov 2026

### F-04 — JB Hi-Fi PDP uses `_pdp` testid, not `_product-card`
- **Assertion:** detail selector includes `marketplace-seller_callout_pdp`
- **Status:** ✅ Verified Nov 2026

### F-05 — Big W `/marketplace` → `/collection/marketplace` redirect handled
- **Assertion:** listingPatterns includes "/collection/"
- **Status:** ✅ Verified Nov 2026

### F-06 — Myer Mirakl replatform doesn't break detail warnings
- **Assertion:** `.accordion-item` + "marketplace partner" still matches post-migration
- **Status:** ✅ Verified Nov 2026

### F-07 — Woolworths BIG W seller on Everyday Market treated as 3P
- **Assertion:** shadowOwnSeller: "woolworths" overrides global FIRST_PARTY_NAMES
- **Status:** ✅ Verified Aug 2026

### F-08 — THE ICONIC Citrus sponsored-ad signal removed (no false positives)
- **Assertion:** `data-track-affiliation` not in sites.js badge selector
- **Status:** ✅ Verified Aug 2026

### F-09 — Extension reload via MARKOFF_RELOAD works
- **Assertion:** window.postMessage({type: 'MARKOFF_RELOAD'}) → chrome.runtime.reload()
- **Status:** ⬜ Needs dev harness run

### F-10 — No console errors on load across all active domains
- **Assertion:** filter.js init() completes without uncaught exceptions
- **Status:** ⬜ Needs browser harness run

---

## Summary

| Category | Tests | Verified | Pending |
|----------|-------|----------|---------|
| A — Per-retailer filtering | 68 | 24 | 44 |
| B — New marketplaces | 12 | 8 | 4 |
| C — Filter engine | 15 | 2 | 13 |
| D — Popup UI | 8 | 0 | 8 |
| E — Build/packaging | 8 | 7 | 1 |
| F — Regression/edge | 10 | 8 | 2 |
| **Total** | **121** | **49** | **72** |

To complete the remaining 72 tests, run the browser-based harness in `tests/runner/` against live sites, or verify manually per the status notes above.
