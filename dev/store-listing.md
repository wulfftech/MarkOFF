# MarkOFF — Chrome Web Store Listing

## Extension name
MarkOFF

## Short description (132 chars max)
Australian retailers now sell other people's stuff on their websites. MarkOFF hides it, or at least labels it clearly.

---

## Full description

Somewhere along the way, Big W became a marketplace. So did Bunnings. And Woolworths, Kmart, JB Hi-Fi, Harvey Norman, Myer, Kogan, and THE ICONIC. Nobody told you. That's not an accident.

You go to buy a Weber barbecue from Bunnings and half the results are from a seller called "FitnessDirect888" shipping from a warehouse you've never heard of. The listing looks identical to everything else on the page. The returns process does not.

**MarkOFF** fixes this automatically. When you browse supported Australian retail sites, it detects third-party marketplace items and either removes them from your results or marks them clearly — before you hand over your credit card.

---

### What it does

**Remove mode** — Uses the site's own native filter where one exists (Big W, Woolworths, JB Hi-Fi), or hides the cards directly. Marketplace items are gone from your results. A badge tells you how many — click it to peek if you want.

**Highlight mode** — Keeps everything visible but puts a purple "Marketplace seller" label on third-party items. See it all, know what you're looking at.

**Detail page warnings** — A banner on product pages when the seller is a third party, with a link to ACCC guidance on your consumer rights. They do differ. The Federal Court confirmed it (ACCC v Sony, 2020).

---

### Supported retailers

| Retailer | Coverage |
|---|---|
| Big W | Search, browse, category pages |
| Woolworths (Everyday Market) | Search pages |
| Bunnings | Search, Marketplace page |
| Kmart | Category, collection pages |
| JB Hi-Fi | Collections, search |
| Harvey Norman (Customer Direct) | Category, search pages |
| Myer (Myer Market) | Search pages + detail warnings |
| Kogan | Detail page warnings |
| THE ICONIC | Listing pages |

---

### Why does this exist?

About 65% of Australian shoppers don't know these retailers operate marketplaces at all. They think they're buying from Big W. Sometimes they are. Sometimes they're buying from "HomeDecorAUS_Official" and they won't find that out until something goes wrong.

Retailers aren't required to make this obvious. They've chosen not to. MarkOFF has no backend, collects no data, and requires no account. It's just less marketplace rubbish when you're trying to buy something.

---

### Permissions

- **Storage** — saves your preferences (filter mode, per-site toggles) locally
- **Active tab** — reads the current page to identify marketplace items

That's it. Nothing is sent anywhere.

---

### Notes

- Works with Chrome and Microsoft Edge (Chromium)
- Retailers update their site structure constantly. If filtering stops working, check for an extension update or report it via the link in the popup — that's basically how this gets maintained.
- THE ICONIC hides seller identity on listing pages entirely; about 42% of their GMV is third-party. Filtering targets what's detectable.
- Myer is migrating marketplace platforms in 2026 — selectors may need an update after that.

---

## Category
Shopping

## Language
English (Australia)

## Tags / keywords
marketplace filter, big w, bunnings, kmart, woolworths, JB Hi-Fi, harvey norman, myer, the iconic, third party seller, australia, shopping, consumer rights

---

## Screenshots needed (1280x800 or 640x400)

1. **Big W search results** — before/after showing marketplace items hidden, badge visible
2. **Bunnings** — ONLINE ONLY / Customer Direct items removed from category page
3. **Popup UI** — showing the mode selector and per-site toggles
4. **Highlight mode** — marketplace items marked purple on a results page
5. **Detail page warning** — Myer or Harvey Norman product with the amber warning banner

## Store tile (440x280)
Purple background (#6b21a8), white "MarkOFF" wordmark, tag-with-strikethrough icon, 
tagline: "Australian retail. Minus the marketplace."

## Small promotional tile (920x680) — optional
Same branding, add: "Supports Big W · Woolworths · Bunnings · Kmart · JB Hi-Fi · Harvey Norman · Myer · Kogan · THE ICONIC"
