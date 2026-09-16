// filter.js — injected into every supported retailer page
// reads sites.js (loaded first by manifest), finds the marketplace cards, deals with them
// if something breaks here, it's probably a selector change in sites.js, not this file

(() => {
  // css classes we add to cards — these map to styles injected later
  const HIDDEN_CLASS    = "markoff-hidden";
  const DIMMED_CLASS    = "markoff-dimmed";    // visible but faded — used during peek
  const HIGHLIGHT_CLASS = "markoff-highlighted";
  const BADGE_ID        = "markoff-count-badge";
  const STYLES_ID       = "markoff-styles";
  const WARNING_ID      = "markoff-detail-warning";

  // ── 1. work out which site we're on ───────────────────────────────────────
  // if the domain doesn't match anything in sites.js, bail out immediately
  const site = window.MARKOFF_SITES?.find((s) =>
    s.active !== false && location.hostname.endsWith(s.domain)
  );
  if (!site) return;

  // ── 2. load stored prefs, then start ─────────────────────────────────────
  // storage is async, everything else waits for this
  let filterEnabled = true;
  let filterMode    = "toggle"; // "toggle" = remove/button, "highlight" = purple overlay

  chrome.storage.sync.get(["globalEnabled", "filterMode", `site_${site.id}`], (prefs) => {
    if (prefs.globalEnabled === false)      filterEnabled = false;
    if (prefs[`site_${site.id}`] === false) filterEnabled = false;
    if (prefs.filterMode)                   filterMode    = prefs.filterMode;
    init();
  });

  // ── 3. url helpers ────────────────────────────────────────────────────────
  let lastPathname = location.pathname;

  function isListingPage(pathname = location.pathname) {
    // detailUrlPattern takes priority — if the url matches, it's a product page, not a listing
    // harvey norman and the iconic both have product urls ending in .html
    // without this check, related-product carousels would fool the DOM fallback below
    if (site.detailUrlPattern && new RegExp(site.detailUrlPattern).test(pathname)) return false;

    // known listing path fragments from sites.js
    if (site.listingPatterns.some((p) => pathname.includes(p))) return true;

    // DOM fallback — handles category URLs that don't fit a neat pattern
    // big w: /womens-clothing/c/6923100102 doesn't match anything in listingPatterns
    // but if product cards are in the DOM, it's a listing page
    if (site.selectors.card) return document.querySelector(site.selectors.card) !== null;
    return false;
  }

  function urlChanged() {
    // spa navigation check — pathname + search so ?query=x changes trigger a rerun
    const current = location.pathname + location.search;
    if (lastPathname === current) return false;
    lastPathname = current;
    return true;
  }

  // ── 4. the main filter ────────────────────────────────────────────────────
  function applyFilter() {
    // don't run while the user is peeking at hidden items
    // mutationobserver and react re-renders will keep firing — this stops them
    // from re-hiding cards mid-peek
    if (temporarilyShowing) return;

    if (!filterEnabled) {
      restoreAll();
      updateBadge(0, 0);
      return;
    }

    // strategy a0 — url param injection
    // if the site uses a filter param (e.g. jb hi-fi ?excludeMarketplace=true)
    // and it's missing, location.replace() fires here and the rest of this run is skipped
    if (filterMode === "toggle") ensureUrlParam();

    // strategy a0.5 — patch outbound links/forms so the next navigation already
    // has the param (avoids the load-then-reload flash on subsequent pages)
    if (filterMode === "toggle") patchOutboundNavigation();

    const { selectors } = site;
    let hiddenCount = 0, highlightCount = 0;

    if (isListingPage()) {

      if (filterMode === "toggle") {
        // strategy a — card hiding (primary)
        // runs first so sellers that slip past the native filter (e.g. woolworths healthylife)
        // are still caught by badge/shadow/text detection
        // guarded because sites with a url-param-only strategy (jb hi-fi on collections,
        // jaycar) ship an empty card selector — querySelectorAll("") throws SyntaxError
        if (selectors.card) document.querySelectorAll(selectors.card).forEach((card) => {
          const isMP = isMarketplaceCard(card);
          card.classList.toggle(HIDDEN_CLASS, isMP);
          card.classList.remove(HIGHLIGHT_CLASS);
          if (isMP) hiddenCount++;
        });

        // strategy a1 — native button (secondary)
        // server-side filter means no grid holes on the next load — supplements card hiding
        // if it triggers a page reload, card hiding re-runs on the cleaner result set
        if (site.filterButton) clickNativeFilterButton();

      } else {
        // strategy c — highlight mode
        // restore any previously hidden cards, then mark marketplace cards with purple overlay
        // user asked to see everything, just call attention to the third-party ones
        document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach(el => {
          el.classList.remove(HIDDEN_CLASS);
          el.classList.remove(DIMMED_CLASS);
        });
        // guarded same as strategy a — empty card selector throws
        if (selectors.card) document.querySelectorAll(selectors.card).forEach((card) => {
          const isMP = isMarketplaceCard(card);
          card.classList.toggle(HIGHLIGHT_CLASS, isMP);
          if (isMP) highlightCount++;
        });
      }

    } else {
      // detail page — clean up any stale classes from listing-page browsing
      document.querySelectorAll(`.${HIDDEN_CLASS}, .${DIMMED_CLASS}, .${HIGHLIGHT_CLASS}`)
        .forEach(el => el.classList.remove(HIDDEN_CLASS, DIMMED_CLASS, HIGHLIGHT_CLASS));
    }

    // detail page warning banner
    // shown when listing-page filtering isn't possible (myer, kogan, harvey norman)
    removeDetailWarning();
    if (!isListingPage() && selectors.detail) {
      // ...existing code...
    }

    // brand the native filter button when markoff's param is doing the filtering
    brandFilterButton();

    updateBadge(hiddenCount, highlightCount);
  }

  // ── 4a. decide if a card is marketplace ───────────────────────────────────
  function isMarketplaceCard(card) {
    const { selectors } = site;
    if (selectors.badge) {
      // check root element first — the iconic puts data-track-affiliation on the card div itself
      // not on a child, so card.matches() needs to run before querySelector
      // a card can carry more than one badge (kmart: Bestseller + Marketplace + Online only) —
      // querySelectorAll + find so badgeText isn't just tested against whichever comes first in the DOM
      const badgeEls = card.matches(selectors.badge) ? [card] : Array.from(card.querySelectorAll(selectors.badge));
      const badgeEl = selectors.badgeText
        ? badgeEls.find(el => new RegExp(selectors.badgeText, "i").test(el.textContent))
        : badgeEls[0];
      if (badgeEl) return true;
    }
    // shadow DOM check — woolworths wc-product-tile renders seller info inside a shadow root
    // normal querySelector/textContent on the host element can't reach it
    // third-party cards have a .seller-name span; first-party cards don't have one at all
    if (selectors.shadowBadge && card.shadowRoot) {
      const shadowEl = card.shadowRoot.querySelector(selectors.shadowBadge);
      if (shadowEl) {
        const text = shadowEl.textContent.trim();
        // "own seller" is site-relative, not global — Big W selling on Woolworths' Everyday
        // Market is third-party here even though FIRST_PARTY_NAMES treats "big w" as first-party
        // elsewhere. shadowOwnSeller scopes the check to this site's own name specifically.
        const isOwnStore = site.shadowOwnSeller && new RegExp(site.shadowOwnSeller, "i").test(text);
        if (!isOwnStore) return true;
      }
    }
    // no badge found — try the text heuristic as a last resort
    return cardHasMarketplaceText(card);
  }

  // ── 4b. native filter button ──────────────────────────────────────────────
  let nativeFilterActive = false;

  // build the text matcher once — uses site-specific text if provided, generic fallback otherwise
  const FILTER_BTN_TEXT_RE = site.filterButtonText
    ? new RegExp(site.filterButtonText, "i")
    : /hide everyday market|exclude marketplace|marketplace items/i;

  // returns true if the button was found and activated
  // returns false if not found on this page (caller falls through to card hiding)
  function clickNativeFilterButton() {
    if (nativeFilterActive) return true; // already clicked it, don't click again

    const candidates = Array.from(document.querySelectorAll(site.filterButton));
    const target = candidates.find(el => {
      // checkboxes need their label text checked, not the input's own text
      if (el.type === "checkbox") {
        const container = el.closest("label, [class*='Switch'], [class*='filter'], [class*='Filter']") || el.parentElement;
        return container ? FILTER_BTN_TEXT_RE.test(container.textContent) : false;
      }
      // aria-switch elements — check aria-labelledby first, then element text
      if (el.getAttribute("role") === "switch") {
        const labelId  = el.getAttribute("aria-labelledby");
        const labelEl  = labelId ? document.getElementById(labelId) : null;
        return FILTER_BTN_TEXT_RE.test(labelEl ? labelEl.textContent : el.textContent);
      }
      return FILTER_BTN_TEXT_RE.test(el.textContent);
    });

    if (!target) return false;

    // check if the filter is already active before clicking
    const alreadyOn =
      target.type === "checkbox"                     ? target.checked :
      target.getAttribute("aria-checked") === "true" ? true :
      target.getAttribute("aria-pressed") === "true" ? true : false;

    if (!alreadyOn) target.click();
    nativeFilterActive = true;
    return true;
  }

  // ── 4d. brand the native filter button ────────────────────────────────────
  // jaycar's "Exclude Marketplace Products" button is pure url-driven — no
  // aria-pressed/checked, renders unchecked even when ?excludeEa=1 is active,
  // so it looks broken once markoff is doing the filtering. swap its contents
  // for markoff branding so it reads as an active "filtered by markoff" state.
  // matches are narrowed by /marketplace/i because jaycar renders the
  // "in-stock at store" button with the same css-module class.
  const BRAND_ATTR = "data-markoff-branded";

  function brandFilterButton() {
    if (!site.brandButton) return;
    const btns = Array.from(document.querySelectorAll(site.brandButton))
      .filter(b => /marketplace/i.test(b.textContent));
    const eligible = filterEnabled && filterMode === "toggle" && hasFilterParam();

    btns.forEach((btn) => {
      if (eligible) {
        if (btn.hasAttribute(BRAND_ATTR)) return;
        if (!btn.dataset.markoffOriginal) btn.dataset.markoffOriginal = btn.innerHTML;
        btn.setAttribute(BRAND_ATTR, "");
        btn.innerHTML =
          `<div style="display:flex;gap:8px;align-items:center;pointer-events:none;">` +
          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" ` +
          `stroke="#6b21a8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
          `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"></path>` +
          `<line x1="7" y1="7" x2="7.01" y2="7"></line>` +
          `<line x1="3" y1="21" x2="21" y2="3"></line>` +
          `</svg>` +
          `<span style="color:#6b21a8;">${site.brandButtonText || "Marketplace Items Hidden"}</span>` +
          `</div>`;
        // clicking it would just strip the param, which markoff re-adds — pointless
        btn.style.pointerEvents = "none";
      } else if (btn.hasAttribute(BRAND_ATTR)) {
        btn.innerHTML = btn.dataset.markoffOriginal;
        delete btn.dataset.markoffOriginal;
        btn.removeAttribute(BRAND_ATTR);
        btn.style.pointerEvents = "";
      }
    });
  }

  // ── 4c. detail page text guards ───────────────────────────────────────────

  // suppress warning when the product is sold by the retailer itself
  // kogan sells its own products under kogan.com — detailOwnSeller catches those
  function isOwnSeller(el) {
    if (!site.detailOwnSeller) return false;
    return new RegExp(site.detailOwnSeller, "i").test(el.textContent);
  }

  // some sites use a generic selector that matches all products
  // detailTextMatch narrows it — e.g. myer's ".accordion-item" is everywhere,
  // but "marketplace partner" only appears on 3P listings
  function hasDetailTextMatch(el) {
    if (!site.detailTextMatch) return true;
    return new RegExp(site.detailTextMatch, "i").test(el.textContent);
  }

  // ── 5. text heuristic fallback ────────────────────────────────────────────
  // last-ditch attempt when no badge selector matched
  // checks shallow children for "marketplace" or "sold by [someone else]" text
  // not exact — but catches cases where badge selectors break before sites.js is updated
  const FIRST_PARTY_NAMES = [
    "big w", "bigw", "woolworths", "bunnings", "kmart", "coles",
    "officeworks", "jb hi-fi", "jbhifi", "chemist warehouse",
    "kogan.com", "the iconic",
  ];
  const SOLD_BY_RE     = /\bsold\s+by\b/i;
  const MARKETPLACE_RE = /\bmarketplace\b/i;

  function cardHasMarketplaceText(card) {
    for (const child of card.children) {
      const text = child.textContent.trim().toLowerCase();
      if (MARKETPLACE_RE.test(text)) return true;
      if (SOLD_BY_RE.test(text)) {
        // "sold by kogan.com" is fine, "sold by some random dropshipper" is not
        const isOwnStore = FIRST_PARTY_NAMES.some(name => text.includes(name));
        if (!isOwnStore) return true;
      }
    }
    return false;
  }

  // ── 6. restore helpers ────────────────────────────────────────────────────
  function restoreAll() {
    document.querySelectorAll(`.${HIDDEN_CLASS}, .${DIMMED_CLASS}, .${HIGHLIGHT_CLASS}`)
      .forEach(el => el.classList.remove(HIDDEN_CLASS, DIMMED_CLASS, HIGHLIGHT_CLASS));
    removeDetailWarning();
  }

  // ── 7. count badge ────────────────────────────────────────────────────────
  // the purple pill in the corner — shows how many items were filtered
  // clicking it in toggle mode peeks at the hidden items
  let temporarilyShowing = false;

  function updateBadge(hiddenCount, highlightCount = 0) {
    const count = hiddenCount + highlightCount;
    let badge = document.getElementById(BADGE_ID);
    if (count === 0) { badge?.remove(); temporarilyShowing = false; return; }

    if (!badge) {
      badge = document.createElement("div");
      badge.id = BADGE_ID;
      badge.addEventListener("click", handleBadgeClick);
      document.body.appendChild(badge);
    }

    if (!temporarilyShowing) {
      if (hiddenCount > 0) {
        badge.textContent = `MarkOFF: ${hiddenCount} marketplace item${hiddenCount === 1 ? "" : "s"} hidden — click to peek`;
      } else {
        // highlight mode — badge is informational, clicking does nothing
        badge.textContent = `MarkOFF: ${highlightCount} marketplace item${highlightCount === 1 ? "" : "s"} highlighted`;
        badge.style.cursor = "default";
      }
    }
  }

  function handleBadgeClick() {
    if (filterMode !== "toggle") return; // highlight mode — badge is read-only

    temporarilyShowing = !temporarilyShowing;
    const badge = document.getElementById(BADGE_ID);

    if (temporarilyShowing) {
      // swap hidden → dimmed so items are visible but clearly labelled
      document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach(el => {
        el.classList.remove(HIDDEN_CLASS);
        el.classList.add(DIMMED_CLASS);
      });
      if (badge) badge.textContent = "MarkOFF: showing marketplace items — click to re-hide";
    } else {
      // swap dimmed → hidden again
      document.querySelectorAll(`.${DIMMED_CLASS}`).forEach(el => {
        el.classList.remove(DIMMED_CLASS);
        el.classList.add(HIDDEN_CLASS);
      });
      applyFilter();
    }
  }

  // ── 8. detail page warning banner ─────────────────────────────────────────
  // inserted before the matching element (seller info, returns section, etc.)
  // only appears when listing-page filtering isn't available for this site
  function showDetailWarning(anchorEl) {
    if (document.getElementById(WARNING_ID)) return;
    const banner = document.createElement("div");
    banner.id = WARNING_ID;
    banner.innerHTML =
      `<strong>MarkOFF:</strong> This product is sold by a third-party marketplace seller, ` +
      `not ${site.name} directly. Warranty, returns, and consumer law protections may differ. ` +
      `<a href="https://www.accc.gov.au/consumers/buying-products-and-services/buying-online" ` +
      `target="_blank" rel="noopener noreferrer">ACCC guidance ↗</a>`;
    anchorEl.insertAdjacentElement("beforebegin", banner);
  }

  function removeDetailWarning() { document.getElementById(WARNING_ID)?.remove(); }

  // ── 9. styles ─────────────────────────────────────────────────────────────
  // injected once into document.head — all the visual bits live here
  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const s = document.createElement("style");
    s.id = STYLES_ID;
    s.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }

      .${DIMMED_CLASS} {
        opacity: 0.3 !important; pointer-events: none !important;
        position: relative !important; filter: grayscale(60%) !important;
      }
      .${DIMMED_CLASS}::after {
        content: "Marketplace seller";
        position: absolute; top: 8px; left: 8px;
        background: #6b21a8; color: #fff;
        font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px;
        pointer-events: none; z-index: 10;
      }

      .${HIGHLIGHT_CLASS} {
        position: relative !important;
        outline: 2px solid #7c3aed !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
      }
      .${HIGHLIGHT_CLASS}::before {
        content: "Marketplace seller";
        position: absolute; top: 0; left: 0; right: 0;
        background: rgba(109,40,168,0.12);
        color: #6b21a8; font-family: system-ui, sans-serif;
        font-size: 11px; font-weight: 700; text-align: center;
        padding: 3px 0; z-index: 10; pointer-events: none;
        border-radius: 4px 4px 0 0;
      }

      #${BADGE_ID} {
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        background: #6b21a8; color: #fff;
        font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600;
        padding: 8px 16px; border-radius: 24px;
        box-shadow: 0 3px 12px rgba(107,33,168,0.35);
        cursor: pointer; user-select: none;
        transition: background 0.15s, transform 0.1s; white-space: nowrap;
      }
      #${BADGE_ID}:hover { background: #7e22ce; transform: translateY(-1px); }
      #${BADGE_ID}:active { transform: translateY(0); }

      #${WARNING_ID} {
        background: #fef3c7; border: 1px solid #f59e0b; border-left: 4px solid #f59e0b;
        color: #78350f; font-family: system-ui, sans-serif;
        font-size: 14px; padding: 12px 16px; border-radius: 6px;
        margin: 12px 0; line-height: 1.5;
      }
      #${WARNING_ID} strong { color: #6b21a8; }
      #${WARNING_ID} a { color: #78350f; font-weight: 600; }
    `;
    document.head.appendChild(s);
  }

  // ── 10. url param injection ───────────────────────────────────────────────
  // for sites that support a server-side filter param (jb hi-fi: ?excludeMarketplace=true)
  // injecting at the url level is cleaner than hiding cards — server returns pre-filtered results

  function parseFilterParam() {
    if (!site.filterUrlParam) return null;
    const eq = site.filterUrlParam.indexOf("=");
    return eq === -1
      ? { key: site.filterUrlParam, val: "true" }
      : { key: site.filterUrlParam.slice(0, eq), val: site.filterUrlParam.slice(eq + 1) };
  }

  function addFilterParam(urlStr) {
    try {
      const fp = parseFilterParam();
      if (!fp) return urlStr;
      const u = new URL(urlStr, location.origin);
      if (u.searchParams.get(fp.key) === fp.val) return urlStr; // already there
      u.searchParams.set(fp.key, fp.val);
      return u.toString();
    } catch (_) { return urlStr; }
  }

  function hasFilterParam(urlStr = location.href) {
    try {
      const fp = parseFilterParam();
      if (!fp) return true; // no param needed for this site
      return new URL(urlStr, location.origin).searchParams.get(fp.key) === fp.val;
    } catch (_) { return false; }
  }

  // only inject the param on paths that support it
  // jb hi-fi ?excludeMarketplace=true works on /collections but breaks /search entirely
  // filterUrlParamPatterns scopes it to safe paths
  function shouldInjectParam(pathname = location.pathname) {
    if (!site.filterUrlParam) return false;
    if (site.filterUrlParamPatterns?.length) {
      return site.filterUrlParamPatterns.some(p => pathname.includes(p));
    }
    return isListingPage(pathname);
  }

  function ensureUrlParam() {
    if (!filterEnabled || filterMode !== "toggle") return;
    if (!shouldInjectParam()) return;
    if (hasFilterParam()) return;
    location.replace(addFilterParam(location.href));
  }

  // ── 10a. pre-navigation param injection ───────────────────────────────────
  // ensureUrlParam() fires after the page has loaded, so a cold navigation to a
  // listing page renders unfiltered results first, then location.replace()s —
  // a visible reload flash. instead, rewrite the navigation *before* it happens:
  //   - link hrefs get the param patched in, so the browser requests the filtered url directly
  //   - form submissions get the param added to the action url at capture phase
  //   - pushState/replaceState are patched in patchHistory() for spa navigations
  // the only remaining redirect is a typed/bookmarked url without the param —
  // unavoidable without a network-level redirect (declarativeNetRequest can't
  // express "url lacks param", RE2 has no lookahead — it'd redirect-loop).
  function patchOutboundNavigation() {
    if (!site.filterUrlParam) return;

    // rewrite hrefs on listing-page links pointing at other listing pages
    // runs on every applyFilter via the mutationobserver debounce — cheap enough
    // reversible: original href is stashed, restored when filtering is off/highlight mode
    const fp = parseFilterParam();
    const eligible = filterEnabled && filterMode === "toggle";
    document.querySelectorAll("a[href]").forEach((a) => {
      // restore previously patched links when no longer eligible
      if (a.dataset.markoffOriginalHref) {
        if (!eligible) {
          a.setAttribute("href", a.dataset.markoffOriginalHref);
          delete a.dataset.markoffOriginalHref;
        }
        return;
      }
      if (!eligible) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      try {
        const u = new URL(href, location.origin);
        if (u.origin !== location.origin) return;
        if (!shouldInjectParam(u.pathname)) return;
        if (u.searchParams.get(fp.key) === fp.val) return;
        a.dataset.markoffOriginalHref = href;
        u.searchParams.set(fp.key, fp.val);
        a.setAttribute("href", u.pathname + u.search + u.hash);
      } catch (_) {}
    });

    // capture-phase submit listener — adds the param to the form action before
    // the browser builds the request. jaycar's search form does a GET to /search.
    if (!window.__markoffSubmitPatched) {
      document.addEventListener("submit", (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement) || form.method?.toLowerCase() !== "get") return;
        try {
          const u = new URL(form.action || location.href, location.origin);
          if (u.origin !== location.origin || !shouldInjectParam(u.pathname)) return;
          if (u.searchParams.get(parseFilterParam().key) !== parseFilterParam().val) {
            u.searchParams.set(parseFilterParam().key, parseFilterParam().val);
            form.action = u.toString();
          }
        } catch (_) {}
      }, true);
      window.__markoffSubmitPatched = true;
    }
  }

  // ── 11. spa navigation ────────────────────────────────────────────────────
  // react / angular / next apps swap pages without a real navigation event
  // monkey-patch history.pushState + history.replaceState to catch those
  // popstate catches browser back/forward
  let debounceTimer = null;

  function scheduleFilter() {
    // debounce because mutationobserver fires a lot during renders
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilter, 300);
  }

  function onNavigate() {
    if (!urlChanged()) return;
    temporarilyShowing = false; // reset peek state on every page change
    restoreAll();
    nativeFilterActive = false; // button state is per-page, not per-session
    scheduleFilter();
  }

  function patchHistory() {
    const wrap = (method) => {
      const original = history[method];
      history[method] = function (state, title, url) {
        // also inject the filter param into spa navigations where applicable
        if (url && site.filterUrlParam && filterEnabled && filterMode === "toggle") {
          try {
            const u = new URL(url, location.origin);
            if (shouldInjectParam(u.pathname)) {
              url = addFilterParam(u.toString());
            }
          } catch (_) {}
        }
        original.call(this, state, title, url);
        onNavigate();
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", onNavigate);
  }

  // ── 12. mutationobserver ──────────────────────────────────────────────────
  // catches lazy-loaded cards and infinite scroll additions
  // debounced so it doesn't hammer applyFilter on every individual dom mutation
  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.addedNodes.length > 0)) scheduleFilter();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── 13. dev reload bridge ─────────────────────────────────────────────────
  // javascript_tool runs in the page context, not the extension context
  // it can't call chrome.runtime directly, so we relay through this listener
  // usage: window.postMessage({ type: 'MARKOFF_RELOAD' }, '*')
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (e.data?.type === "MARKOFF_RELOAD") chrome.runtime.sendMessage({ type: "MARKOFF_RELOAD" });
  });

  // ── 14. popup message listener ────────────────────────────────────────────
  // receives toggle/mode changes from popup.js without requiring a page reload
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "MARKOFF_TOGGLE") {
      filterEnabled = msg.enabled;
      filterEnabled ? applyFilter() : (restoreAll(), updateBadge(0, 0));
    }
    if (msg.type === "MARKOFF_MODE") {
      filterMode = msg.mode;
      nativeFilterActive = false;
      // switching away from toggle mode — strip the url param so server returns unfiltered results
      if (filterMode !== "toggle" && site.filterUrlParam) {
        try {
          const fp = parseFilterParam();
          const u = new URL(location.href);
          if (fp && u.searchParams.has(fp.key)) {
            u.searchParams.delete(fp.key);
            history.replaceState(null, "", u.toString());
          }
        } catch (_) {}
      }
      restoreAll();
      applyFilter();
    }
  });

  // ── bootstrap ─────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    patchHistory();
    startObserver();
    applyFilter();
  }
})();
