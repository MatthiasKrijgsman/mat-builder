# preflight-check.html

The non-Tailwind host from `docs/07` §A5 — a plain-CSS page that must render
**identically** with and without the builder's stylesheet. If it doesn't, our
CSS is reaching outside the builder and into the consumer's app.

```bash
cp dist/style.css site/public/_mat-builder-style.css
```

Then open `/preflight-check.html` (baseline) and `/preflight-check.html?builder=1`
and compare. `window.__probe()` returns the computed properties preflight would
change, so the two can be diffed exactly rather than by eye.

`_mat-builder-style.css` is gitignored: it is a build output, copied in on demand.
The scoping invariant itself is asserted by `src/styles/preflight.test.ts`.
