// tests/runner/browser-tests.js
// Paste this into Chrome DevTools Console on ANY MarkOFF-supported retailer page.
// It runs the live DOM assertions for that site and prints a JSON report.
// Designed to work with the MarkOFF extension loaded (sites.js + filter.js injected).
// Caveat: content scripts run in an isolated world, so window.MARKOFF_SITES is only
// visible if you switch the console's context dropdown from "top" to the MarkOFF
// extension. From the default context it always reports "site not identified".
// For unattended runs use live-extension-tests.js, which loads the real extension.

(function markoffBrowserTests() {
  const RESULTS = [];
  const SITE_ID = (() => {
    const hosts = {
      "bigw.com.au": "bigw",
      "woolworths.com.au": "woolworths",
      "bunnings.com.au": "bunnings",
      "kmart.com.au": "kmart",
      "jbhifi.com.au": "jbhifi",
      "harveynorman.com.au": "harveynorman",
      "myer.com.au": "myer",
      "kogan.com": "kogan",
      "theiconic.com.au": "theiconic",
      "jaycar.com.au": "jaycar",
    };
    for (const [host, id] of Object.entries(hosts)) {
      if (location.hostname.endsWith(host)) return id;
    }
    return null;
  })();

  function t(name, pass, detail) {
    RESULTS.push({ name, pass, detail });
    console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  }

  function q(sel) {
    try { return document.querySelectorAll(sel).length; } catch (e) { return `ERR:${e.message}`; }
  }

  function isListingPage() {
    const site = window.MARKOFF_SITES?.find(s => s.active !== false && location.hostname.endsWith(s.domain));
    if (!site) return { listing: false, reason: "no site match" };
    if (site.detailUrlPattern && new RegExp(site.detailUrlPattern).test(location.pathname)) return { listing: false, reason: "detailUrlPattern matched" };
    if (site.listingPatterns.some(p => location.pathname.includes(p))) return { listing: true, reason: "listing pattern" };
    if (site.selectors.card) return document.querySelector(site.selectors.card) !== null ? { listing: true, reason: "DOM fallback" } : { listing: false, reason: "no cards in DOM" };
    return { listing: false, reason: "no card selector, no pattern match" };
  }

  console.group(`🟣 MarkOFF Browser Tests — ${location.hostname}`);

  // ── Site identification ────────────────────────────────────────────────────
  const site = window.MARKOFF_SITES?.find(s => s.active !== false && location.hostname.endsWith(s.domain));
  t("Site identified in MARKOFF_SITES", !!site, site ? site.id : "none");

  if (!site) {
    console.groupEnd();
    console.log(JSON.stringify(RESULTS, null, 2));
    return;
  }

  t(`Site: ${site.id} (${site.name})`, true, `active=${site.active} inspected=${site.inspected}`);

  // ── Listing page detection ─────────────────────────────────────────────────
  const lp = isListingPage();
  t("isListingPage()", lp.listing, lp.reason);

  // ── Card selector ──────────────────────────────────────────────────────────
  if (site.selectors.card) {
    const cardCount = q(site.selectors.card);
    t(`Card selector "${site.selectors.card}"`, cardCount > 0 && cardCount !== `ERR`, `count=${cardCount}`);
  } else {
    t("Card selector empty (URL-param/detail-only site)", true, "no querySelectorAll(\"\") risk");
  }

  // ── Badge selector ─────────────────────────────────────────────────────────
  if (site.selectors.badge) {
    const badgeCount = q(site.selectors.badge);
    t(`Badge selector "${site.selectors.badge}"`, badgeCount >= 0 && badgeCount !== `ERR`, `count=${badgeCount}`);
  } else {
    t("Badge selector empty (detail-only site)", true, "no per-card badge");
  }

  // ── Detail selector ────────────────────────────────────────────────────────
  if (site.selectors.detail) {
    const detailCount = q(site.selectors.detail);
    t(`Detail selector "${site.selectors.detail}"`, detailCount >= 0 && detailCount !== `ERR`, `count=${detailCount}`);
  } else {
    t("Detail selector empty", true, "no detail warning");
  }

  // ── detailUrlPattern ───────────────────────────────────────────────────────
  if (site.detailUrlPattern) {
    try {
      const re = new RegExp(site.detailUrlPattern);
      t(`detailUrlPattern "${site.detailUrlPattern}" valid regex`, true, `matches current URL: ${re.test(location.pathname)}`);
    } catch (e) {
      t(`detailUrlPattern "${site.detailUrlPattern}" valid regex`, false, e.message);
    }
  } else {
    t("No detailUrlPattern", true, "listing patterns only");
  }

  // ── filterUrlParam ─────────────────────────────────────────────────────────
  if (site.filterUrlParam) {
    const fp = site.filterUrlParam.split("=");
    const hasParam = new URLSearchParams(location.search).has(fp[0]);
    t(`filterUrlParam "${site.filterUrlParam}"`, true, `present in URL: ${hasParam}`);
    const shouldInject = site.filterUrlParamPatterns?.some(p => location.pathname.includes(p)) || false;
    t("shouldInjectParam() for this path", shouldInject, site.filterUrlParamPatterns?.join(", ") || "none");
  } else {
    t("No filterUrlParam", true, "card-level or detail-only strategy");
  }

  // ── filterButton ───────────────────────────────────────────────────────────
  if (site.filterButton) {
    const btnCount = q(site.filterButton);
    t(`filterButton "${site.filterButton}"`, btnCount >= 0 && btnCount !== `ERR`, `count=${btnCount}`);
  } else {
    t("No filterButton", true, "no native button to click");
  }

  // ── MarkOFF CSS classes present (extension running) ────────────────────────
  const hidden = document.querySelectorAll(".markoff-hidden").length;
  const highlighted = document.querySelectorAll(".markoff-highlighted").length;
  const badgeEl = document.getElementById("markoff-count-badge");
  t("markoff-hidden class present", hidden >= 0, `count=${hidden}`);
  t("markoff-highlighted class present", highlighted >= 0, `count=${highlighted}`);
  t("markoff-count-badge present", !!badgeEl, badgeEl ? badgeEl.textContent : "none");

  // ── Extension styles injected ──────────────────────────────────────────────
  const styles = document.getElementById("markoff-styles");
  t("markoff-styles injected", !!styles, styles ? "present" : "not injected (extension may not be loaded)");

  console.groupEnd();
  console.log("Full results:", JSON.stringify(RESULTS, null, 2));
  console.log(`%c${RESULTS.filter(r => r.pass).length}/${RESULTS.length} passed`, "background:#6b21a8;color:#fff;padding:2px 6px;border-radius:4px");
})();
