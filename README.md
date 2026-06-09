# SizeUp

**Never check a size chart again.**

SizeUp is a Chrome extension for Indian ecommerce shoppers. Store your family's clothing and shoe measurements once — the extension automatically highlights the right sizes and filters products on Myntra, Amazon India, and Flipkart.

---

## Features

- **Family profiles** — add multiple members (Dad, Mom, Kid…) each with their own measurements
- **Live size derivation** — enter measurements in cm, see standard sizes (S/M/L, 38/40/42) computed instantly
- **Product page** — your size is highlighted; a banner shows availability and lets you select it in one click
- **Myntra listing pages** — suggests a URL filter to show only products in your size
- **None mode** — switch to "None" in the popup to disable all filtering
- All data stored **locally** — no account, no server, no tracking

## Supported Sites

| Site | Listing filter | Product highlight |
|---|---|---|
| Myntra | ✅ URL param | ✅ |
| Amazon India | — | ✅ |
| Flipkart | — | ✅ (best-effort) |

---

## Setup

### 1. Generate icons

Open `icons/create-icons.html` in any browser → click **Download all icons** → save `icon16.png`, `icon48.png`, `icon128.png` into the `icons/` folder.

### 2. Load the extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `sizeup/` folder

Pin the SizeUp icon to your toolbar for easy access.

---

## Usage

1. Click the SizeUp icon → **Add family member**
2. Enter a name, pick an emoji, fill in measurements (all in cm)
3. See derived sizes live as you type
4. Use the **Shopping for** dropdown to activate a profile
5. Browse Myntra / Amazon India / Flipkart — SizeUp handles the rest

---

## Measurements guide

| Field | How to measure |
|---|---|
| Height | Top of head to floor |
| Chest / Bust | Fullest part of chest, tape horizontal |
| Waist | Narrowest part, ~2 cm above navel |
| Hip | Fullest part of hips |
| Shoulder | Shoulder seam to shoulder seam across upper back |
| Inseam | Crotch to floor (inside leg) |
| Inseam | Crotch to floor (inside leg) |

---

## Project structure

```
sizeup/
├── manifest.json            Chrome extension manifest (MV3)
├── popup/
│   ├── popup.html           Extension popup UI
│   ├── popup.css
│   └── popup.js
├── content/
│   └── content.js           Injected into Myntra, Amazon IN, Flipkart
├── background/
│   └── service_worker.js
├── utils/
│   ├── storage.js           chrome.storage helpers + learn-mode state
│   └── size-charts.js       Measurement → size derivation + midpoints
├── icons/
│   ├── create-icons.html    Run once in browser to generate PNG icons
│   ├── icon16.png           (gitignored — generate locally)
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

No build step. No dependencies. Plain HTML/CSS/JS.

---

## Contributing

Pull requests are welcome. Before opening one:

1. **Fork** the repo and create a branch: `git checkout -b feat/your-feature`
2. **Keep it vanilla** — no bundlers, no npm packages unless there's a strong reason. The extension loads files directly.
3. **Test on all three sites** before submitting — Myntra, Amazon India, Flipkart.
4. **Site selectors change** — if you're updating DOM selectors for a site, note in the PR which page and date you tested against.
5. **Measurements** — if you're adjusting the size chart data in `utils/size-charts.js`, link a source (brand size guide, IS standard, etc.).

### Good first issues

- Add Flipkart listing page URL filter
- Add Amazon India listing page filter
- Brand-specific size overrides (e.g. "I'm L in Puma but M in H&M")
- Kids / age-based size profiles
- Shoe half-size support
- Remote selector config so site selectors can update without an extension release

---

## Planned / coming soon

- **Learn from a purchase** — paste a product URL you've bought; pick the size you got; SizeUp suggests updating your measurements automatically
- Flipkart and Amazon listing page filters (currently product-highlight only)
- Brand-specific size overrides
- Kids / age-based profiles

---

## License

MIT
