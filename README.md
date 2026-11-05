# MarkOFF

**[Install from the Chrome Web Store ↗](https://chromewebstore.google.com/detail/markoff/dknepomfodjmmpbeknaidmhimbpgfgba)**

* Australia has 2 main problems - gambling ads and FUCKING MARKETPLACES. this extension solves the latter. 

* somehow, palpatine returned, then Big W became a marketplace. So did Bunnings. And Woolworths. And Kmart, JB Hi-Fi, Harvey Norman, Myer, and fuck Kogan for starting all this shit probably. And now Jaycar's got a fucking marketplace too because the universe hates us. basically we should have never shot that monkey 

* This is a Chrome/Edge extension that hides or labels third-party marketplace items on Australian retail websites automatically, so you're not sitting there clicking around like an idiot before you hand over your credit card.

* **Remove** mode hides marketplace items outright, or auto-clicks the site's own filter where one exists. **Highlight** mode marks them with a purple outline — still there, clearly flagged.

* Detail page warnings on product pages for marketplace sellers. theres no backend or account and no data collected. Just less marketplace bullshittery when you just want to see if bunnings has that thing you don't need or if you need to hit up aliexpress.

---

## Screenshots

![Popup — Filter tab](screenshots/popup.png)
![Big W — marketplace items hidden](screenshots/bigw-filtered.png)

---

## Supported Sites

| Site | How it works |
|---|---|
| Big W | `MarketplacePill` badge on cards + native toggle button |
| Woolworths (Everyday Market) | Shadow-DOM seller check + "Hide Everyday Market" chip |
| Bunnings | `p.text-brand-marketplace-primary` badge on product cards |
| Kmart | `kosmos-ds-Box[role=status]` badge ("Marketplace") |
| JB Hi-Fi | URL param `?excludeMarketplace=true` on collections, card badge on search, detail warning |
| Harvey Norman (Customer Direct) | `ONLINE ONLY` flag on listing cards, detail page warning |
| Myer (Myer Market) | Detail page warning (listing pages don't expose seller identity) |
| Kogan | Detail page warning with own-seller suppression |
| THE ICONIC | Currently unverified — seller identity hidden client-side |
| Jaycar | URL param `?excludeEa=1` (Extended Assortment) on search + category pages |

## Confirmed marketplaces — pending selector verification

The following Australian retailers run live third-party marketplaces. MarkOFF does not filter them yet because a reliable client-side signal (per-card badge, server-side URL param, or PDP seller text) has not been verified. They are tracked in `sites.js` as inactive/unverified so they surface in the popup for follow-up.

| Retailer | Domain | Marketplace status | Known signal | What's needed |
|---|---|---|---|---|
| Baby Bunting | babybunting.com.au | Live (Mirakl-powered) | PDP "Sold & Shipped By" note per site docs | Exact PDP DOM selector; per-card listing badge if any |
| Chemist Warehouse | chemistwarehouse.com.au | Live since Nov 2022 (Marketplacer) | "All Marketplace Lines" page live | Per-card or PDP seller signal |
| Rebel Sport | rebel.com.au | Live (Rithum/DSCO-powered) | Seller integrations documented | Per-card badge or PDP seller signal |

Once a selector is verified, flip `active: true` and `inspected: true` in `sites.js`, add the domain to `manifest.json` matches, and bump the version.

---

## Getting Started

* Clone the repo

* Go to `chrome://extensions`, enable Developer Mode, click **Load unpacked**, point it at the repo folder

* Go to `edge://extensions` if you're on Edge, same deal

* Click the MarkOFF icon in your toolbar. Pick a mode. Done.

* ...profit

---

## How Selectors Are Maintained

Each supported site has an entry in `sites.js` with CSS selectors for its marketplace badge. Retailers like to think their frontend is unique. It's not — it's just patterns. When they update it anyway (and they will), this is the only file that needs updating.

`dev/devtools-probe.js` is a self-contained script you can paste into any retailer's console to help discover new selectors. Run it on a search/browse page that contains marketplace items.

`dev/selector-notes.md` has inspection history and notes per site.

---

## Structure

```
sites.js              single source of truth — all retailer configs
content/filter.js     injected into retailer pages, does the actual work
popup/                extension popup (filter settings, help, about)
background.js         service worker, mostly just handles install defaults
dev/                  devtools probe, icon generator, store listing copy
icons/                icon assets
```

---

## Notes

* Retailers update their shit constantly. If filtering breaks on a site, it's a selector — find the new one with the devtools probe, update `sites.js`, set `inspected: true`, done. That's basically programming.

* The extension reloads itself programmatically during development via `window.postMessage({ type: 'MARKOFF_RELOAD' }, '*')` from any injected page. Saves having to visit `chrome://extensions` every five minutes.

* Harvey Norman uses "ONLINE ONLY" as the listing-page signal for Customer Direct items. Real transparent of them.

* THE ICONIC hides seller identity on listing and product pages entirely. Their old `data-track-affiliation` badge turned out to be Citrus sponsored-ad placements, not seller identity, so it's disabled until they leak a real signal. About 42% of their GMV is third-party, so statistically you're probably fine.

* Woolworths' "Hide Everyday Market" button filters at the server level by adding `isHideEverydayMarketProducts=true` to the URL. This means it also applies to pagination and any sharing of the filtered URL, which is a nice side effect.

---

## Contributing

Open an issue or PR. If a retailer has changed their shit and filtering is broken, the most useful thing is the selector you found with the devtools probe and which page you were on.
