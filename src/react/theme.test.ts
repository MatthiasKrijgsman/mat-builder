import { describe, expect, it } from "vitest";
import { colorSchemeAttr, themeToStyle, type BuilderTheme } from "./theme.ts";

describe("themeToStyle", () => {
    it("prefixes each token, so keys read like the stylesheet", () => {
        expect(themeToStyle({ "color-selection": "#e11d48", "sidebar-width": "340px" })).toEqual({
            "--mat-builder-color-selection": "#e11d48",
            "--mat-builder-sidebar-width": "340px",
        });
    });

    it("passes values through untouched — any valid CSS, including a host's own var", () => {
        const theme: BuilderTheme = {
            "color-panel-bg": "var(--brand-surface)",
            "color-hover": "color-mix(in srgb, red 40%, transparent)",
        };
        expect(themeToStyle(theme)).toEqual({
            "--mat-builder-color-panel-bg": "var(--brand-surface)",
            "--mat-builder-color-hover": "color-mix(in srgb, red 40%, transparent)",
        });
    });

    it("is empty for no theme, so spreading it is always safe", () => {
        expect(themeToStyle(undefined)).toEqual({});
        expect(themeToStyle({})).toEqual({});
    });

    it("skips undefined values rather than emitting an invalid declaration", () => {
        expect(themeToStyle({ "color-selection": undefined })).toEqual({});
    });
});

describe("colorSchemeAttr", () => {
    it("emits nothing for the default, so a .dark ancestor still decides", () => {
        expect(colorSchemeAttr(undefined)).toBeUndefined();
        expect(colorSchemeAttr("inherit")).toBeUndefined();
    });

    it("emits the scheme when one is pinned", () => {
        expect(colorSchemeAttr("dark")).toBe("dark");
        expect(colorSchemeAttr("light")).toBe("light");
    });
});
