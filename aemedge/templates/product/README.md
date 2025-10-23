# Product pages – architecture and authoring guide

This doc explains how product pages work (e.g., Corn), why we chose this design, and how to use it.

## Goals
- Preserve SEO with real, indexable URLs per intent.
- SPA-like UX for fast tab switching without losing crawlability.
- Simple authoring: tabs defined once on the landing; tab pages contain only content.
- Maintainable code: shared utils, minimal duplication.

## URL model
- Landing: `/product` (e.g., `/markets/corn`)
- Primary tabs: `/product/overview`, `/quotes`, `/settlements`, `/volume`, `/specs`, `/margins`, `/calendar`
- Optional secondary tab: `/product/<tab>/options`

## Authoring
- Landing page includes a `product-tabs` block (Label | URL). This is the single source of truth for the top tabs.
- Tab pages do not include the tabs block; they only contain the tab’s content.
- If the tabs block is absent, the template falls back to canonical order and filters by existence using `product-index.json`.

## Product Template
- Inserts `hero-baseball` (full width) and `product-tabs` at the top of every product page.
- On the landing `/product`, injects the selected tab content under the tabs and removes duplicate tabs from the fragment.
- Inline Futures/Options toggle appears at the right of the tabs row only when both `/product/<tab>` and `/product/<tab>/options` exist (checked via `product-index.json`).
- Stable frame everywhere: Hero → Product tabs (+ inline toggle when applicable) → Tab content.

Key files
- Template: `aemedge/templates/product/product.js`, `product.css`
- Tabs block: `aemedge/blocks/product-tabs/`
- Hero block: `aemedge/blocks/hero-baseball/`
- Utils: `aemedge/scripts/utils/product.js`

## product-index.json
- Available at `/product-index.json`.
- Used to filter tabs, decide toggle visibility, and resolve parent product metadata on tab and options pages.

Utility: `aemedge/scripts/utils/product.js`
- `getProductMetadata()` returns `{ productId, productName, productSymbol }` from page metadata or the landing row derived from the current URL.

## Hero baseball
- Uses `getProductMetadata()` so landing and all tab pages show consistent product data.
- Currently wired to a mock endpoint; swap with real API later.

## Tab navigation
- Intercepts intra-product links only (top tabs and Futures/Options).
- On click: `pushState(newURL)` → fetch `newURL.plain.html` → create a temp `<main>` → `decorateMain(tempMain)` → clone sections below tabs into the live DOM → `loadSection` each section.
- Re-wires handlers after swaps; updates active states.
- Prefetches `.plain.html` (and the futures↔options counterpart) on hover/focus/viewport; clears the prefetch cache on each navigation to avoid stale content.

Benefits: real URLs for SEO, fast swaps, and no full re-render of hero/tabs.


# Things we should think about the future

## SEO notes
- Each URL has unique title/description.
- Self-canonical per page; 301 old dotted URLs to new paths.

## Performance notes
- Prefetch `.plain.html` on intent; only swap the content area.
- Heavy widgets should lazy-load after paint.
- Future: Service Worker for caching intra-product `.plain.html`.

## Add a new product
1. Create landing `/product` with `template=product`.
2. Author `product-id` and `product` metadata (and optionally `product-symbol`) for hero data.
3. Author `product-tabs` block on landing with Label|URL rows.
4. Create tab pages under the same root.
5. If a tab supports Options, add `/product/<tab>/options`—the toggle appears automatically when both exist.

*NOTE*: This can be automated if need be using a DA app or external process to automate the creation of product pages

---
Start from `templates/product/product.js` and `scripts/utils/product.js` for the flow.
