# SizeUp — Chrome Web Store listing

Copy is written to match the **shipped** extension (our emoji set, cm units,
synced-storage privacy line). Paste into the Developer Dashboard fields.

---

## Name (≤ 75 chars)
SizeUp — Find your fit on Myntra, Amazon & Flipkart

## Short description / summary (≤ 132 chars)
Save your family's measurements once. SizeUp shows which sizes fit on Myntra, Amazon India & Flipkart — right on the product page.

## Category
Shopping

## Language
English (India)

---

## Detailed description

Stop second-guessing size charts. SizeUp turns each person's body measurements into the sizes that actually fit them — and shows it right where you shop.

Add your family once, then let SizeUp do the rest on Myntra, Amazon India, and Flipkart.

WHAT YOU GET
• Fit check on product pages — a floating card shows, for every person you've saved, whether the item Fits, May fit (adjacent size, for brands that run small or large), or isn't offered.
• Size filter on listings — toggle who you're shopping for and narrow the page to items in their size. Pick more than one person at a time.
• Saved sizes you can reuse — each person's card shows their derived top size and key measurements, with a one-tap copy button to paste into an AI assistant or share.
• A measurement helper — not sure how to measure a chest or an inseam? Hover the "?" by any field for a simple diagram and a one-line how-to.

HOW IT WORKS
1. Click the SizeUp icon and add a family member.
2. Enter their body measurements in cm (height, chest, waist, hip, shoulder, inseam). Sizes are worked out for you as you type.
3. Shop normally — SizeUp appears on supported product and listing pages.

PRIVATE BY DESIGN
Your measurements are stored in your own Chrome account and synced across your devices by Chrome — they're never sent to us or anyone else. SizeUp only runs on Myntra, Amazon India, and Flipkart.

Up to 10 family members. No account, no sign-up, no build step.

---

## Permission justifications (for the dashboard)

**storage**
Stores each saved measurement profile and syncs it across the user's own Chrome devices via chrome.storage.sync. No data is transmitted to the developer or any third party.

**Host permissions (www.myntra.com, www.amazon.in, www.flipkart.com)**
Required to read the size options shown on product and listing pages and to inject the on-page fit banner and size filter. The extension does not run on any other site.

**Single purpose**
Help shoppers see which clothing sizes fit them, based on saved body measurements, on Myntra, Amazon India, and Flipkart.

**Data use certifications**
• Does not sell or transfer user data to third parties.
• Does not use or transfer data for purposes unrelated to the item's single purpose.
• Does not use or transfer data to determine creditworthiness or for lending.
Measurements stay in the user's Chrome sync storage; the developer never receives them.

---

## Reviewer notes (private "Notes to reviewer" field)

SizeUp is a local utility. To test:
1. Load the extension and click the toolbar icon.
2. Add a member (e.g. Chest 95, Waist 80) — derived sizes update live.
3. Visit a Myntra/Amazon India/Flipkart product page (e.g. a men's T-shirt)
   to see the fit banner; visit a clothing listing to see the size filter.
No login or backend is required. All data is held in chrome.storage.sync.

---

## Screenshots — TODO before submit
Capture at **1280×800** (or 640×400), 1–5 images, from the LIVE extension so
they show our emojis, cm units, and the "synced" privacy line.
Reference frames (design mockups, NOT final) are in ./reference-from-design/:
  1-home.png            → popup home with family list
  2-add-form.png        → add/edit form + suggested sizes + ? helper
  3-measure-help.png    → measurement "?" tooltip with body diagram
  4-on-page-widgets.png → product fit banner + listing filter card

Small promo tile (440×280) and marquee (1400×560) are optional but recommended.
