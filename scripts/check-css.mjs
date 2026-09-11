#!/usr/bin/env node
/*
 * Guards the two stylesheet entries. Run by `pnpm build` after
 * scripts/build-style-flat.mjs, so a broken stylesheet cannot be published.
 *
 *   1. Every Tailwind utility in `dist/style.css` carries the `mat:` prefix
 *      (src/style.css), so none can collide with a host's own Tailwind.
 *   2. `dist/style-flat.css` has no cascade layers and every rule is scoped
 *      to the builder's roots — the entry a host not on Tailwind v4 imports.
 *
 * The scoped-preflight promise (`./style` restyles nothing outside the
 * builder) is covered by src/styles/preflight.test.ts.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = (name) => {
    try {
        return readFileSync(fileURLToPath(new URL(`../dist/${name}`, import.meta.url)), "utf8");
    } catch {
        console.error(`dist/${name} not found — run \`pnpm build\` first.`);
        process.exit(1);
    }
};
const fail = [];

/* ── 1. every utility is prefixed ──────────────────────────────────── */

/** The body of the top-level `@layer <name> { … }` block, brace-matched. */
function layerBody(css, name) {
    const at = css.indexOf(`@layer ${name} {`);
    if (at === -1) return "";
    let depth = 0;
    for (let i = css.indexOf("{", at); i < css.length; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}" && --depth === 0) return css.slice(at, i);
    }
    return css.slice(at);
}

const layered = dist("style.css");
const utilities = layerBody(layered, "utilities");
if (!utilities) fail.push("dist/style.css has no @layer utilities block — is Tailwind still wired in?");
const unprefixed = [...new Set([...utilities.matchAll(/^\s*\.((?:\\.|[^\s{,:>+~])+)/gm)].map((m) => m[1]))].filter(
    (cls) => !cls.startsWith("mat\\:"),
);
if (unprefixed.length > 0) {
    fail.push(
        `dist/style.css ships ${unprefixed.length} unprefixed utilit${unprefixed.length === 1 ? "y" : "ies"}: ${unprefixed.slice(0, 8).join(", ")}${unprefixed.length > 8 ? ", …" : ""}\n` +
            "  Author it as `mat:…` (see src/style.css) or it can collide with the host's own Tailwind.",
    );
}

/* ── 2. the flat entry is unlayered and scoped ─────────────────────── */

const flat = dist("style-flat.css");
if (/@layer\b/.test(flat)) fail.push("dist/style-flat.css still contains an @layer — flattening failed.");
// Every selector outside keyframes must carry the scope (or be a zero-
// specificity token root). At-rule preludes open blocks too and are skipped;
// their rules are checked on their own.
const bare = flat
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .replace(/@(?:property|font-face)[^{]*\{[^{}]*\}/g, "");
const unscoped = [...bare.matchAll(/(?:^|[}{;])\s*([^@{};][^{}]*?)\s*\{/g)]
    .map((m) => m[1].trim())
    .filter((sel) => sel && !sel.startsWith("@") && !/(^|[^\\])&/.test(sel) && !sel.includes(":where("));
if (unscoped.length > 0) {
    fail.push(`dist/style-flat.css has ${unscoped.length} unscoped selector(s): ${unscoped.slice(0, 5).join(" | ")}`);
}

if (fail.length > 0) {
    console.error("\nCSS CHECK FAILED\n");
    for (const f of fail) console.error("  ✗ " + f);
    console.error("");
    process.exit(1);
}
console.log("css check passed — every utility prefixed; flat entry unlayered and scoped");
