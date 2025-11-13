CSS build (flatten imports)

Run one command from the repo root to flatten global styles and all block CSS:

```bash
node build/build-css.js --global
```

What it does
- Inlines all @import rules in `aemedge/styles/styles.css` into a single file (no nested requests).
- For every block, if `<block>.css` contains `@import` (e.g., `aemedge/blocks/cards/cards.css`), it inlines those imports and writes back to `<block>.css`.

Verify
- Open Chrome DevTools → Network (Disable cache unchecked).
- Filter “CSS”:
  - Only one global request to `/aemedge/styles/styles.css`.
  - Block CSS (e.g., `/aemedge/blocks/cards/cards.css`) does not trigger additional CSS requests.
- Click a CSS file → Preview: the `@import` lines should be gone.
- Quick visual scan for style regressions.

When to run
- After changing global CSS imports or block CSS that rely on `@import`.
- Before pushing, to reduce first-load CSS requests.

Notes
- The script uses `postcss-import` and ignores imports inside paths containing `/external/`.
- No runtime build is required by Edge Delivery; this is a pre-bundle to minimize HTTP requests.

Rollback

```bash
git checkout -- aemedge/styles/styles.css
git checkout -- aemedge/blocks/**/<block>.css
```


