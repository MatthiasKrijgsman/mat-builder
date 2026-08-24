import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BuilderToken } from "../react/theme.ts";

/*
 * Keeps three things that must agree from drifting apart — see
 * docs/guides/theming.md:
 *
 *   1. the `BuilderToken` union (what the `theme` prop accepts)
 *   2. the `:root` block (what exists)
 *   3. the dark and forced-light blocks (what flips)
 *
 * All three are hand-written, because generating them would trade a test for
 * a build step. This is the test.
 */

const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../react/theme.ts", import.meta.url)), "utf8");

/**
 * The body of one selector's block. Anchored to the start of a line so a
 * selector quoted inside a comment (the dark block's header names the
 * forced-light one) cannot be mistaken for the rule itself.
 */
function blockBody(selector: string): string {
    const at = css.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
    if (at === -1) throw new Error(`tokens.css has no "${selector}" rule`);
    const open = css.indexOf("{", at);
    return css.slice(open, css.indexOf("\n}", open));
}

/** Token names declared inside one selector block. */
function tokensIn(selector: string): string[] {
    return [...blockBody(selector).matchAll(/--mat-builder-([a-z0-9-]+)\s*:/g)].map((m) => m[1]);
}

/** One token's declared value inside one selector block. */
function valueIn(selector: string, token: string): string | undefined {
    return blockBody(selector).split(`--mat-builder-${token}:`)[1]?.split(";")[0].trim();
}

const rootTokens = tokensIn(":root {");
const darkTokens = tokensIn(".dark,");
const forcedLightTokens = tokensIn('[data-mat-builder-color-scheme="light"]');
const unionTokens = [...theme.matchAll(/^\s*\| "([a-z0-9-]+)";?$/gm)].map((m) => m[1]);

/** Tokens whose value is derived from another with color-mix or var(). */
const derived = rootTokens.filter((name) => {
    const value = css.slice(css.indexOf(`--mat-builder-${name}:`)).split(";")[0];
    return value.includes("var(--mat-builder-");
});

/** Content-layer tokens: drawn on the email, so they never flip (tokens.css header). */
const CONTENT_TOKENS = [
    "color-artboard-bg",
    "color-placeholder-border",
    "color-placeholder-fg",
    "color-merge-tag-bg",
    "color-merge-tag-fg",
    "color-conditional-fg",
    "color-conditional-bg",
    "color-conditional-ring",
    "color-missing-border",
    "color-missing-bg",
    "color-missing-fg",
];

describe("the BuilderToken union", () => {
    it("lists exactly what :root declares", () => {
        expect([...unionTokens].sort()).toEqual([...new Set(rootTokens)].sort());
    });

    it("is assignable — a sample compiles as BuilderToken", () => {
        const sample: BuilderToken[] = ["color-selection", "color-panel-bg", "sidebar-width"];
        expect(sample.every((token) => rootTokens.includes(token))).toBe(true);
    });
});

describe("the dark block", () => {
    it("only overrides tokens that exist", () => {
        expect(darkTokens.filter((t) => !rootTokens.includes(t))).toEqual([]);
    });

    it("never touches the content layer — the email does not follow the editor", () => {
        expect(darkTokens.filter((t) => CONTENT_TOKENS.includes(t))).toEqual([]);
    });

    it("never overrides a derived token, which would break the derivation", () => {
        expect(darkTokens.filter((t) => derived.includes(t))).toEqual([]);
    });

    it("covers every raw chrome colour, so nothing is left light on a dark panel", () => {
        const rawChromeColours = rootTokens.filter(
            (t) =>
                t.startsWith("color-") &&
                !derived.includes(t) &&
                !CONTENT_TOKENS.includes(t) &&
                // Handles are white squares riding the selection ring in both schemes
                t !== "color-chrome-handle-bg",
        );
        expect(rawChromeColours.filter((t) => !darkTokens.includes(t))).toEqual([]);
    });
});

describe("the shell's derived block", () => {
    /*
     * A `var()` inside a custom property substitutes where the property is
     * DECLARED. Without these re-declared on the shell, the `theme` prop —
     * which sets tokens inline on the shell — could change a source token and
     * leave everything derived from it untouched.
     */
    const shellTokens = tokensIn(".mat-builder-shell {");

    it("re-declares every derived token, so the theme prop propagates", () => {
        expect([...shellTokens].sort()).toEqual([...derived].sort());
    });

    it("keeps each one an expression, not a resolved value", () => {
        for (const token of shellTokens) {
            expect(valueIn(".mat-builder-shell {", token), token).toContain("var(--mat-builder-");
        }
    });
});

describe("the forced-light block", () => {
    it("covers exactly what the dark block covers", () => {
        expect([...forcedLightTokens].sort()).toEqual([...darkTokens].sort());
    });

    it("restates the :root value for each, so forcing light is a no-op on a light page", () => {
        for (const token of forcedLightTokens) {
            expect(valueIn('[data-mat-builder-color-scheme="light"]', token), token).toBe(
                valueIn(":root {", token),
            );
        }
    });
});
