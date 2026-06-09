# SizeUp

**Never check a size chart again.**

A Chrome extension that stores your family's sizes and highlights availability across Indian ecommerce — Myntra, Amazon India, and Flipkart.

---

## Features

- Multiple family member profiles (name, emoji, measurements)
- Derives standard sizes (alpha S/M/L, Indian numeric 38/40, UK shoe) from raw cm measurements
- **Myntra listing pages** — suggests a one-click size filter so only your size is shown
- **Product pages** (all 3 sites) — highlights the right size, shows availability status, offers one-click select
- Reacts instantly when you switch profiles from the popup
- All data stays local — no account, no backend

## Supported Sites (MVP)

| Site | Listing filter | Product highlight |
|---|---|---|
| Myntra | ✅ URL param | ✅ |
| Amazon India | — | ✅ |
| Flipkart | — | ✅ (best-effort) |

---

## Setup

### 1. Generate icons

Open `icons/create-icons.html` in any browser → click **Download all icons** → save the three PNGs into the `icons/` folder.

### 2. Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `sizeup/` folder

The SizeUp icon appears in your toolbar. Pin it for easy access.

---

## Usage

1. Click the SizeUp icon → **Add family member**
2. Enter name, pick an emoji, fill in measurements (cm)
3. See derived sizes live (e.g. Chest 92cm → M / 40)
4. Select the active profile from the **"Filtering for"** dropdown
5. Browse Myntra / Amazon India / Flipkart — SizeUp does the rest

**Switch to "None"** to disable filtering at any time.

---

## Measurements guide

| Field | What to measure |
|---|---|
| Height | Top of head to floor |
| Chest / Bust | Fullest part of chest, tape horizontal |
| Waist | Narrowest part, usually 2–3 cm above navel |
| Hip | Fullest part of hips |
| Shoulder | Shoulder seam to shoulder seam across back |
| Inseam | Crotch to floor (inside leg) |
| Shoe (foot length) | Heel to longest toe in cm |

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
│   └── content.js          # injected into all 3 sites
├── background/
│   └── service_worker.js
├── utils/
│   ├── storage.js          # chrome.storage helpers
│   └── size-charts.js      # measurement → size derivation
├── icons/
│   ├── create-icons.html   # run once to generate PNGs
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Roadmap

- [ ] Brand-specific size overrides ("I'm L in Puma but M in H&M")
- [ ] Flipkart + Amazon listing page URL filters
- [ ] Remote selector config (auto-updates when site DOM changes)
- [ ] Kids / age-based size profiles
- [ ] Shoe half-size support
