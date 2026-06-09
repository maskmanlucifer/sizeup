# SizeUp

**Never check a size chart again.**

SizeUp is a Chrome extension for Indian shoppers. Add your family's measurements once — the extension automatically shows which sizes fit on Myntra, Amazon India, and Flipkart, and filters listing pages to show only products in your size.

---

## What it does

**On product pages** — a floating card shows fit status for every saved profile. Sizes are highlighted on the page. If a brand runs small or large, SizeUp shows "May fit" for adjacent sizes so you don't miss anything.

**On listing pages** — a filter bar lets you toggle which family members' sizes are active. Selecting multiple profiles shows products that fit any of them.

---

## Supported sites

| | Listing filter | Product highlight |
|---|---|---|
| Myntra | ✅ multi-select | ✅ |
| Flipkart | ✅ multi-select | ✅ |
| Amazon India | — | ✅ |

Amazon listing filter is not supported — Amazon's size facet IDs are dynamic per category and have no universal URL format.

---

## Setup

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `sizeup/` folder
3. Pin the SizeUp icon to your toolbar

No build step. No npm. Plain HTML/CSS/JS.

---

## Usage

1. Click the SizeUp icon → **Add family member**
2. Enter a name, pick an emoji, fill in body measurements (all in cm)
3. Sizes are derived live as you type
4. Use the **Shopping for** dropdown to set the active profile
5. Browse — SizeUp handles the rest

Up to **10 profiles** per account. Profiles sync across Chrome devices via `chrome.storage.sync`.

---

## Size matching

SizeUp maps body measurements to standard Indian sizes (XS–4XL for tops, 26–42 for bottoms). When a product page loads:

1. **Exact match** — profile's derived size is found on the page → "Fits"
2. **Adjacent match** — size one band up or down is found → "May fit" (handles brand size variation)
3. **Unlisted** — no matching size option exists → "Not offered"

---

## Project structure

```
sizeup/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── content.js          Orchestrator — init, SPA detection, page handlers
│   ├── ui.js               Listing bar + product banner rendering
│   └── platforms/
│       ├── myntra.js        Myntra adapter
│       ├── flipkart.js      Flipkart adapter
│       └── amazon.js        Amazon India adapter
├── background/
│   └── service_worker.js
├── utils/
│   ├── storage.js           chrome.storage.sync helpers
│   └── size-charts.js       Measurement → size derivation + adjacent matching
└── icons/
```

Each platform adapter exposes the same interface:
`onProductPage`, `onListingPage`, `findSizeElements`, `isUnavailable`, `sizeText`, `getSizeFacet`, `getCurrentFilters`, `buildFilterUrl`

---

## What's been added

- **Multi-profile listing filter** — toggle multiple family members' sizes simultaneously
- **Adjacent size matching** — "May fit" for ±1 size band handles brand variation automatically
- **Flipkart listing filter** — `p[]=facets.size[]=L` URL format, fully multi-select
- **Platform adapters** — clean separation of all site-specific logic
- **Cross-device sync** — profiles stored in `chrome.storage.sync`
- **Platform size chips** — popup shows per-platform sizes for each member card

---

## Planned

- Amazon India listing filter (requires per-category facet ID discovery)
- Brand-specific size overrides ("I'm L in Puma but M in H&M")
- Learn from a purchase — suggest measurement updates based on what you bought
- Kids / age-based size profiles
- Shoe half-size support

---

## Contributing

PRs welcome. A few things to keep in mind:

1. **No bundlers** — the extension loads files directly. Keep it plain JS.
2. **Test on all three sites** before submitting — note the date you tested against since selectors change.
3. **Adding a platform** — create `content/platforms/<name>.js` implementing the platform interface, register it in `content/content.js`, add it to `content_scripts` in `manifest.json`.
4. **Size chart changes** — link a source (brand guide, IS standard, etc.) in the PR.
5. **Flipkart selectors** — Flipkart hashes CSS class names on every deploy. Prefer heuristics (DOM structure, `aria-*`, text content) over class names.

---

## License

MIT
