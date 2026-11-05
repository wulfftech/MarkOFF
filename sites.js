// sites.js — one object per retailer, that's it
// if filtering breaks on a site, this is probably the file to fix
// set inspected: false after updating selectors so it shows up in the popup as unverified

const MARKOFF_SITES = [

  // ── Woolworths Group ──────────────────────────────────────────────────────

  {
    id: "bigw",
    name: "Big W",
    domain: "bigw.com.au",
    active: true,
    inspected: true,
    selectors: {
      card:   "[data-testid='product-tile']",
      // MarketplacePill is a purple SVG logo big w slaps on top of third-party cards
      // the class has a css hash suffix but MarketplacePill is stable enough
      badge:  "[class*='MarketplacePill']",
      detail: "[class*='MarketplacePill']",
    },
    // there's also a native toggle button on search/category pages — clicks that first
    // falls back to card hiding if the button isn't on the page
    filterButton:     "button[role='switch'][id='marketplace-items']",
    filterButtonText: "marketplace items",
    detailUrlPattern: "^/product/",
    listingPatterns: ["/search", "/browse", "/category", "/marketplace", "/collection/", "/c/"],
    notes: "Card-level MarketplacePill primary. /marketplace redirects to /collection/marketplace as of Nov 2026. Category URLs use /[category-path]/c/[id].",
  },

  {
    id: "woolworths",
    name: "Woolworths (Everyday Market)",
    domain: "woolworths.com.au",
    active: true,
    inspected: true,
    selectors: {
      card:        "wc-product-tile, shared-product-tile",
      badge:       "[class*='everyday-market'], [class*='everydayMarket']",
      // wc-product-tile renders its internals in a shadow root — normal querySelector can't reach them
      // third-party seller cards have a .seller-name span inside the shadow root; first-party don't
      // "Sold by Healthylife" is the main case — not Everyday Market, so the native button misses it
      shadowBadge: ".seller-name",
      detail:      "[class*='everyday-market'], [class*='everydayMarket']",
    },
    // scopes the shadowBadge own-seller check to Woolworths itself — a card sold by "BIG W" or
    // any other retailer is genuinely third-party here, even though those names count as
    // first-party on their own sites (see FIRST_PARTY_NAMES in filter.js)
    shadowOwnSeller: "woolworths",
    // woolworths built their own hide button so we just click it
    // clicking it adds isHideEverydayMarketProducts=true to the url which is a server-side filter
    // the css class is a css module hash so [class*='chip-toggle'] is more reliable than the full class
    // note: this is now secondary — card-level runs first and catches what the native filter misses
    filterButton:     "[class*='chip-toggle']",
    filterButtonText: "hide everyday market",
    listingPatterns: ["/shop/search", "/shop/browse", "/shop/specials"],
    notes: "Card-level primary (catches Healthylife + shadow-DOM sellers). Native 'Hide Everyday Market' chip secondary. Angular app with wc-product-tile custom elements.",
  },

  // ── Wesfarmers Group ──────────────────────────────────────────────────────

  {
    id: "bunnings",
    name: "Bunnings",
    domain: "bunnings.com.au",
    active: true,
    inspected: true,
    selectors: {
      // bunnings rewrote the tile component (Tailwind) Aug 2026 — data-locator badge/article are gone
      card:   "[data-search-product-tile='true']",
      badge:  "p.text-brand-marketplace-primary",
      detail: "p.text-brand-marketplace-primary",
    },
    listingPatterns: ["/search", "/category", "/brand", "/bunnings-marketplace"],
    notes: "Rewritten Aug 2026 — old data-locator selectors matched 0 elements. New card root is a plain div[data-search-product-tile='true']; badge text is always 'Marketplace | Online only'.",
  },

  {
    id: "kmart",
    name: "Kmart",
    domain: "kmart.com.au",
    active: true,
    inspected: true,
    selectors: {
      card:   "li[data-testid='plp-grid-item']",
      // kosmos is kmart's design system. role=status narrows it to label/badge elements specifically
      // without this, the class selector would also match layout boxes, not just badges
      // as of Aug 2026 the same component also renders "Trending"/"Bestseller"/"Online only" —
      // badgeText is required or every status badge gets treated as marketplace
      badge:  "[class*='kosmos-ds-Box'][role='status']",
      badgeText: "marketplace",
      // scoped to .pdp-seller-sold-by-container so a marketplace item inside the
      // related-products carousel at the bottom of a 1P product page doesn't trigger a false warning
      detail: ".pdp-seller-sold-by-container [class*='kosmos-ds-Box'][role='status']",
    },
    detailTextMatch: "marketplace",
    detailUrlPattern: "^/product/",
    listingPatterns: ["/category/", "/collection/", "/search"],
    notes: "Kosmos design system. role='status' on the inner Box narrows to label badges only. badgeText/detailTextMatch required since Aug 2026 — same component also carries Trending/Bestseller/Online only/Kmart/KmartTarget labels. Detail selector scoped to .pdp-seller-sold-by-container (Nov 2026) to exclude related-products rails.",
  },

  // ── JB Hi-Fi ──────────────────────────────────────────────────────────────

  {
    id: "jbhifi",
    name: "JB Hi-Fi",
    domain: "jbhifi.com.au",
    active: true,
    inspected: true,
    selectors: {
      card:   "[data-testid='product-card-content']",
      // this testid is on every marketplace card on both search and collection pages
      badge:  "[data-testid='marketplace-seller_callout_product-card']",
      // product detail pages use _pdp instead of _product-card
      detail: "[data-testid='marketplace-seller_callout_pdp'], [data-testid='marketplace-seller_callout_product-card']",
    },
    // on /collections pages, jb actually supports a url param that filters server-side
    // ?excludeMarketplace=true — much cleaner than hiding individual cards
    // only apply this to /collections though, injecting it into /search breaks the results entirely
    filterUrlParam:         "excludeMarketplace=true",
    filterUrlParamPatterns: ["/collections"],
    filterButton:           "[class*='Switch_switchContainer'] input[type='checkbox']",
    filterButtonText:       "exclude marketplace products",
    detailUrlPattern:       "^/products/",
    listingPatterns: ["/search", "/collections", "/category"],
    notes: "Shopify. URL param on /collections (server-side). Search/collection cards use marketplace-seller_callout_product-card; detail pages use marketplace-seller_callout_pdp (updated Nov 2026).",
  },

  // ── Harvey Norman ─────────────────────────────────────────────────────────

  {
    id: "harveynorman",
    name: "Harvey Norman",
    domain: "harveynorman.com.au",
    active: true,
    inspected: true,
    selectors: {
      // harvey norman dropped the per-sku suffix Aug 2026 — testid is now a static "product-card"
      // (sku moved to a separate data-product-sku attribute)
      // don't use [class*='GelBrickProductCard'] — that matches 3+ sub-elements per card
      // and you'd end up hiding 120 things when there are only 40 marketplace items
      card:      "[data-testid='product-card']",
      // all product flags use offer-flag testid — badgeText gates it to "ONLINE ONLY" only
      // ONLINE ONLY == Customer Direct on harvey norman. not guaranteed to stay that way.
      badge:     "[data-testid='offer-flag']",
      badgeText: "online only",
      // .product-cvps-header is the heading of the Customer Direct info section on the detail page
      // the class above it (GelSlabAvailableMessage_gel-slab-availability-message__*) is css-hashed
      // this one isn't, so use it
      detail:    ".product-cvps-header",
    },
    detailTextMatch: "customer direct",
    // product pages end in .html, category pages don't
    // without this, the DOM fallback would fire on detail pages because related-products
    // carousels also use the card selector, confusing listing vs detail detection
    detailUrlPattern: "\\.html",
    listingPatterns: ["/search", "/c/", "/category"],
    notes: "ONLINE ONLY flag = Customer Direct. Card testid lost its SKU suffix Aug 2026 — now static 'product-card'. .product-cvps-header is stable non-hashed class.",
  },

  // ── Myer ──────────────────────────────────────────────────────────────────

  {
    id: "myer",
    name: "Myer (Myer Market)",
    domain: "myer.com.au",
    active: true,
    inspected: true,
    selectors: {
      card:   "[class*='product-detail']",
      // myer hides seller identity on listing pages completely — no badge, nothing
      // so we can't filter at the listing level, only warn on detail pages
      badge:  "",
      // .accordion-item is the container for the returns/shipping section on product pages
      // marketplace items specifically say "sent directly from our Marketplace partner: [seller]"
      // regular products don't have this text, hence the detailTextMatch below
      detail: ".accordion-item",
    },
    // "marketplace partner" only appears for 3P items — regular myer products don't have it
    // without this, we'd show a warning on every product page that has an accordion section
    detailTextMatch: "marketplace partner",
    detailUrlPattern: "^/p/",
    listingPatterns: ["/search", "/c/"],
    notes: "No listing-page badge — seller hidden in DOM even after the 2026 Mirakl migration (enableMarketplaceReplatform: true, verified Nov 2026; 'Delivery Only' badge is online_only, not marketplace-specific). Detail: .accordion-item contains 'sent directly from our Marketplace partner: [Seller]'.",
  },

  // ── Kogan ─────────────────────────────────────────────────────────────────

  {
    id: "kogan",
    name: "Kogan",
    domain: "kogan.com",
    active: true,
    inspected: true,
    selectors: {
      // no seller badge on listing pages — leave card empty so related-product <article>
      // tiles on product pages don't trick isListingPage()'s DOM fallback into skipping the detail warning
      card:   "",
      badge:  "",
      // p.font-body-low-emphasis appears a lot on product pages — size selectors, labels etc
      // detailTextMatch narrows it to the "Sold by X" paragraph specifically
      detail: "p.font-body-low-emphasis",
    },
    // "sold by" finds the right paragraph — without this, querySelector returns "42mm" or similar
    detailTextMatch: "sold by",
    // "sold by kogan.com" = first-party — suppress the warning
    detailOwnSeller: "kogan\\.com",
    listingPatterns: ["/au/shop/"],
    notes: "Detail-only — no seller badge on listing cards. card left empty because Kogan product pages render 18 <article> tiles in related-product rails, which previously fooled the DOM fallback into treating product pages as listing pages (fixed Nov 2026).",
  },

  // ── THE ICONIC ────────────────────────────────────────────────────────────

  {
    id: "theiconic",
    name: "THE ICONIC",
    domain: "theiconic.com.au",
    active: true,
    inspected: false,
    selectors: {
      // AngularJS app — div.product.columns is a stable semantic class
      card:   "div.product.columns",
      // [data-track-affiliation='citrus'] / .sponsored-message were previously (wrongly) used
      // as the marketplace badge — re-inspected Aug 2026 and confirmed it's Citrus retail-media
      // ad tracking (the element literally renders "Sponsored"), unrelated to seller identity.
      // Removed rather than left in: it was flagging paid 1P ad placements as marketplace.
      // No replacement signal found — checked JSON-LD (no seller field), the Delivery & Returns
      // accordion (generic postcode/returns text only, no seller/dispatch mention) on a normal
      // item and on a confirmed dropship-style listing (generic-brand yoga mat). THE ICONIC does
      // not appear to expose per-item seller identity anywhere client-side.
      badge:  "",
      // no reliable detail-page signal found
      // "cannot be returned" applies to ALL non-returnable products, not just marketplace ones
      // so detail-page warnings are disabled for the iconic
      detail: "",
    },
    // product detail pages end in .html — prevents DOM fallback from treating them
    // as listing pages when related-product carousels are present
    detailUrlPattern: "\\.html",
    listingPatterns: ["/women/", "/men/", "/kids/", "/sport/", "/sale/", "/new-arrivals/", "/search/", "/all/"],
    notes: "No working seller signal as of Aug 2026 re-inspection — the old data-track-affiliation/.sponsored-message badge was misidentifying Citrus sponsored-ad placements as marketplace items and has been removed. Site currently provides no marketplace protection; needs fresh research (mobile app API? cookie-gated field?) to find a real signal. ~42% 3P GMV per prior research.",
  },

  // ── Jaycar ────────────────────────────────────────────────────────────────

  {
    id: "jaycar",
    name: "Jaycar",
    domain: "jaycar.com.au",
    active: true,
    inspected: true,
    selectors: {
      // no per-card marketplace badge — jaycar hides seller identity on listing pages
      // the only "marketplace" text on a listing page is the footer nav + the filter button itself
      card:   "",
      badge:  "",
      detail: "",
    },
    // jaycar's "Exclude Marketplace Products" button is just a wrapper for a
    // server-side url param — clicking it navigates to ?excludeEa=1
    // (EA = Extended Assortment, their marketplace program). same pattern as
    // jb hi-fi's ?excludeMarketplace=true, so we inject the param directly
    // instead of hunting for the button. works on search and category pages.
    filterUrlParam: "excludeEa=1",
    // same safe paths as listingPatterns — param injection only on search/category
    filterUrlParamPatterns: ["/search", "/c/"],
    // the button is pure url-driven — no aria state, renders unchecked even when
    // ?excludeEa=1 is active, so it looks broken once markoff does the filtering.
    brandButton: "[class*='ProductListFilters_filterBtn']",
    listingPatterns: ["/search", "/c/"],
    notes: "Server-side filter via ?excludeEa=1 (Extended Assortment). No per-card badge — the 'Exclude Marketplace Products' button (ProductListFilters_filterBtn) just navigates to this param; brandButton replaces it with markoff branding while active. Marketplace brands: Monocure, Playseat, Logitech, Bluetti, Ultimate Ears, Swann.",
  },

  // ── confirmed no marketplace ───────────────────────────────────────────────

  {
    id: "officeworks",
    name: "Officeworks",
    domain: "officeworks.com.au",
    active: false,
    inspected: true,
    selectors: { card: "", badge: "", detail: "" },
    listingPatterns: [],
    notes: "Inspected Jun 2026 — no marketplace found.",
  },

  {
    id: "chemistwarehouse",
    name: "Chemist Warehouse",
    domain: "chemistwarehouse.com.au",
    active: false,
    inspected: false,
    selectors: { card: "", badge: "", detail: "" },
    listingPatterns: [],
    notes: "Marketplace launched Nov 2022 (Marketplacer-powered, 'All Marketplace Lines' page live). Previous Jun 2026 note claiming 'no marketplace found' was incorrect — needs re-inspection for per-card or PDP seller signal before enabling.",
  },

  {
    id: "coles",
    name: "Coles",
    domain: "coles.com.au",
    active: false,
    inspected: true,
    selectors: { card: "", badge: "", detail: "" },
    listingPatterns: [],
    notes: "Confirmed Jun 2026 — no marketplace.",
  },

  {
    id: "babybunting",
    name: "Baby Bunting",
    domain: "babybunting.com.au",
    active: false,
    inspected: false,
    selectors: { card: "", badge: "", detail: "" },
    listingPatterns: [],
    notes: "Marketplace confirmed live (Mirakl-powered, /marketplace/about). PDP shows 'Sold & Shipped By' note for marketplace sellers per site docs. Per-card listing badge and exact PDP DOM selector for 'Sold & Shipped By' not yet verified — needs selector research before enabling.",
  },

  {
    id: "rebelsport",
    name: "Rebel Sport",
    domain: "rebel.com.au",
    active: false,
    inspected: false,
    selectors: { card: "", badge: "", detail: "" },
    listingPatterns: [],
    notes: "Marketplace confirmed live (Rithum/DSCO-powered). Per-card badge and PDP seller signal not yet verified — needs selector research before enabling.",
  },

  {
    id: "catch",
    name: "Catch",
    domain: "catch.com.au",
    active: false,
    inspected: false,
    selectors: { card: "", badge: "", detail: "" },
    listingPatterns: [],
    notes: "Closed January 2025.",
  },

];

// attach to window because content scripts in mv3 don't get es module imports
if (typeof window !== "undefined") {
  window.MARKOFF_SITES = MARKOFF_SITES;
}
