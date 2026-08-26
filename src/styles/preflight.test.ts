import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * The stylesheet must not reach outside the builder — docs/07 §A5.
 *
 * Tailwind's preflight is 4.6 kB of unscoped element selectors. Shipping it
 * restyles h1-h6, links, lists, images and form controls across the HOST's
 * whole app the moment they import our CSS. These assert the two halves of
 * the fix: we no longer pull preflight in, and our replacement is scoped.
 *
 * The visual counterpart is site/public/preflight-check.html — a
 * deliberately non-Tailwind page that must render identically with and
 * without our stylesheet.
 */

const read = (name: string) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");
const entry = read("../style.css");
const preflight = read("./preflight.css");

/** Roots a selector may be anchored to for it to count as scoped. */
const SCOPES = [".mat-builder-", "[data-floating-ui-portal]"];

describe("the stylesheet entry", () => {
    it("does not pull in Tailwind's preflight", () => {
        // `@import "tailwindcss"` is theme + preflight + utilities.
        expect(entry).not.toMatch(/@import\s+["']tailwindcss["']\s*;/);
    });

    it("still pulls in theme and utilities, or the editor has no styling at all", () => {
        expect(entry).toMatch(/@import\s+["']tailwindcss\/theme\.css["']/);
        expect(entry).toMatch(/@import\s+["']tailwindcss\/utilities\.css["']/);
    });

    it("declares the layer order, so utilities still beat our base rules", () => {
        expect(entry).toMatch(/@layer\s+theme,\s*base,\s*components,\s*utilities\s*;/);
    });
});

describe("the scoped replacement", () => {
    /*
     * Every selector list inside @layer base. Taken by slicing the layer body
     * on `}` and reading what precedes each `{` — the selectors span lines and
     * contain commas inside :where(), so a comma-split would mis-parse them.
     */
    const layerBody = preflight
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .slice(preflight.replace(/\/\*[\s\S]*?\*\//g, "").indexOf("{") + 1);
    const selectors = layerBody
        .split("}")
        .map((chunk) => chunk.split("{")[0].trim())
        .filter((s) => s.length > 0);

    it("has selectors to check", () => {
        expect(selectors.length).toBeGreaterThan(0);
    });

    it("anchors every selector to a builder root", () => {
        const unscoped = selectors.filter((s) => !SCOPES.some((scope) => s.includes(scope)));
        expect(unscoped).toEqual([]);
    });

    it("keeps everything inside @layer base, so utilities always win", () => {
        const withoutComments = preflight.replace(/\/\*[\s\S]*?\*\//g, "");
        expect(withoutComments.trim().startsWith("@layer base")).toBe(true);
    });

    it("uses :where() so a host can override without a specificity fight", () => {
        // Real preflight is specificity 0; ours matches by wrapping the scopes.
        const scopeBlocks = preflight.match(/:where\(/g) ?? [];
        expect(scopeBlocks.length).toBeGreaterThanOrEqual(5);
    });

    it("does not reset `img`, which would change how the email renders", () => {
        // The canvas shows the email; its images must stay inline as a mail
        // client would show them. Only `svg` (chrome icons) is reset.
        expect(preflight).not.toMatch(/:where\([^)]*\bimg\b/);
    });
});
