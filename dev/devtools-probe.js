// MarkOFF — DevTools Probe Script
// Paste this into the Chrome DevTools console on any retailer search results page
// to discover the selectors needed for sites.js.
//
// USAGE:
//   1. Navigate to a search/browse results page that contains at least one marketplace product
//   2. Open DevTools (F12) → Console tab
//   3. Paste this entire script and press Enter
//   4. Review the output and copy the findings into sites.js / selector-notes.md

(function probe() {
  console.group("🟣 MarkOFF DOM Probe");

  // ── A. Text-based scan ─────────────────────────────────────────────────────
  // Walk every element and flag ones containing marketplace-indicator text.
  const keywords = [
    "marketplace", "sold by", "dispatched by", "fulfilled by",
    "everyday market", "third party", "third-party",
  ];

  const hits = [];
  document.querySelectorAll("*").forEach((el) => {
    // Only look at leaf-ish nodes (no children, or only text children)
    if (el.children.length > 3) return;
    const text = el.textContent.trim().toLowerCase();
    if (text.length > 100) return; // skip long nodes
    const matched = keywords.find((kw) => text.includes(kw));
    if (matched) hits.push({ el, matched, text: el.textContent.trim() });
  });

  if (hits.length === 0) {
    console.warn("No marketplace-indicator text found. Are you on a page with marketplace items?");
  } else {
    console.log(`Found ${hits.length} element(s) with marketplace text:`);
    hits.forEach(({ el, matched, text }) => {
      console.groupCollapsed(`  "${text}" (keyword: "${matched}")`);
      console.log("Element:", el);
      console.log("Tag:", el.tagName);
      console.log("Classes:", el.className);
      console.log("data-testid:", el.dataset?.testid ?? "(none)");

      // Walk up to find a likely card root (stops at body or after 8 steps)
      let card = el;
      for (let i = 0; i < 8; i++) {
        const p = card.parentElement;
        if (!p || p === document.body) break;
        // A card usually has a large bounding box
        const rect = p.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 150) {
          card = p;
          break;
        }
        card = p;
      }
      console.log("Likely card root:", card);
      console.log("Card tag:", card.tagName);
      console.log("Card classes:", card.className);
      console.log("Card data-testid:", card.dataset?.testid ?? "(none)");
      console.groupEnd();
    });
  }

  // ── B. Suggest card selector ───────────────────────────────────────────────
  // Try to detect a repeated product-card pattern by counting elements per selector.
  console.group("Product card selector candidates (count > 5):");
  const cardCandidates = [
    "[data-testid='product-tile']",
    "[data-testid='product-card']",
    "[data-testid='product']",
    "[class*='ProductTile']",
    "[class*='ProductCard']",
    "[class*='product-tile']",
    "[class*='product-card']",
    "[class*='product-item']",
    "[class*='product_tile']",
    "[class*='shelf-product']",
    ".product-tile",
    ".product-card",
    ".product",
    "article",
    "li[class*='product']",
  ];
  cardCandidates.forEach((sel) => {
    try {
      const n = document.querySelectorAll(sel).length;
      if (n > 5) console.log(`  ${n.toString().padStart(4)}  ${sel}`);
    } catch (_) {}
  });
  console.groupEnd();

  // ── C. Suggest badge selector ──────────────────────────────────────────────
  console.group("Badge selector candidates (count > 0):");
  const badgeCandidates = [
    "[class*='arketplace']",
    "[class*='marketplace']",
    "[class*='Marketplace']",
    "[data-testid*='marketplace']",
    "[data-testid*='arketplace']",
    "[class*='sold-by']",
    "[class*='soldBy']",
    "[class*='SoldBy']",
    "[class*='seller']",
    "[class*='Seller']",
    "[class*='third-party']",
    "[class*='thirdParty']",
    "[class*='everyday-market']",
    "[class*='everydaymarket']",
    "[class*='EDM']",
    "[data-seller]",
    "[data-marketplace]",
  ];
  badgeCandidates.forEach((sel) => {
    try {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        console.log(`  ${els.length.toString().padStart(4)}  ${sel}`);
        // Show the text content of the first few matches
        Array.from(els).slice(0, 3).forEach((el) => {
          console.log(`           text: "${el.textContent.trim().slice(0, 60)}"`);
        });
      }
    } catch (_) {}
  });
  console.groupEnd();

  // ── D. JSON-LD scan ────────────────────────────────────────────────────────
  // Some sites embed seller info in structured data (useful for Kogan/THE ICONIC)
  const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  if (jsonLdScripts.length > 0) {
    console.group(`JSON-LD structured data (${jsonLdScripts.length} blocks):`);
    jsonLdScripts.forEach((s, i) => {
      try {
        const data = JSON.parse(s.textContent);
        if (data.seller || data.brand || data.offers?.seller) {
          console.log(`  Block ${i}:`, JSON.stringify(data.seller ?? data.offers?.seller ?? "(no seller)", null, 2));
        }
      } catch (_) {}
    });
    console.groupEnd();
  }

  console.groupEnd(); // MarkOFF DOM Probe
  console.log(
    "%cCopy the selectors above into sites.js, then set inspected: true",
    "background:#6b21a8;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold"
  );
})();
