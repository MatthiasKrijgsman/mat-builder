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

# flat-check.html

The other host from `docs/07` §C6: one that is **not on Tailwind v4**, whose
own CSS is unlayered. Its `input { padding: 0 }` beats every layered rule of
ours regardless of specificity, which is why `./style-flat` exists.

```bash
cp dist/style.css site/public/_mat-builder-style.css
cp dist/style-flat.css site/public/_mat-builder-style-flat.css
cp node_modules/@matthiaskrijgsman/mat-ui/dist/style.css site/public/_mat-ui-style.css
cp node_modules/@matthiaskrijgsman/mat-ui/dist/style-flat.css site/public/_mat-ui-style-flat.css
```

Then open `/flat-check.html?entry=layered` (our utility loses: padding 0) and
`/flat-check.html?entry=flat` (it wins: 40px). In both, the host's own `.flex`,
`--font-sans` and body font must read exactly as in the baseline
`/flat-check.html` — `window.__probe()` returns all of it. The static half of
the promise (every utility prefixed, every flat rule scoped) is asserted by
`scripts/check-css.mjs` in the build.
