import { describe, expect, it } from "vitest";
import { backgroundToCss, defaultBackground } from "./background.ts";
import { borderToCss, defaultBorder, type BorderValue } from "./border.ts";
import { hexToRgba, parseColorToHexOpacity } from "./color.ts";
import { defaultEffects, effectsToCss } from "./effects.ts";
import { horizontalToTextAlign, layoutToCss, verticalToVerticalAlign } from "./layout.ts";
import { sizeToCss } from "./size.ts";
import { marginToCss, paddingToCss, sideShorthand, spacingToCss, symmetricSides, uniformSides } from "./spacing.ts";
import { defaultTypography, typographyToCss } from "./typography.ts";

describe("undefined tolerance", () => {
    it("every converter returns {} for undefined", () => {
        expect(backgroundToCss(undefined)).toEqual({});
        expect(borderToCss(undefined)).toEqual({});
        expect(effectsToCss(undefined)).toEqual({});
        expect(layoutToCss(undefined)).toEqual({});
        expect(sizeToCss(undefined)).toEqual({});
        expect(spacingToCss(undefined)).toEqual({});
        expect(paddingToCss(undefined)).toEqual({});
        expect(marginToCss(undefined)).toEqual({});
        expect(typographyToCss(undefined)).toEqual({});
    });
});

describe("background", () => {
    it("none emits nothing", () => {
        expect(backgroundToCss({ ...defaultBackground, type: "none" })).toEqual({});
    });

    it("solid emits backgroundColor", () => {
        expect(backgroundToCss({ ...defaultBackground, type: "solid", color: "#ff0000" })).toEqual({
            backgroundColor: "#ff0000",
        });
    });

    it("gradient emits linear-gradient with a solid fallback color", () => {
        const css = backgroundToCss({
            ...defaultBackground,
            type: "gradient",
            gradient: { from: "#111111", to: "#222222", angle: 90 },
        });
        expect(css.backgroundColor).toBe("#111111");
        expect(css.backgroundImage).toBe("linear-gradient(90deg, #111111, #222222)");
    });

    it("image emits url background with sizing and a fallback color", () => {
        const css = backgroundToCss({
            ...defaultBackground,
            type: "image",
            color: "#fafafa",
            image: { url: "https://example.com/bg.png", size: "cover", position: "center", repeat: false },
        });
        expect(css.backgroundImage).toBe("url(https://example.com/bg.png)");
        expect(css.backgroundColor).toBe("#fafafa");
        expect(css.backgroundSize).toBe("cover");
        expect(css.backgroundPosition).toBe("center");
        expect(css.backgroundRepeat).toBe("no-repeat");
    });

    it("image mode without a url (or without an image value at all) falls back to the color", () => {
        expect(backgroundToCss({ ...defaultBackground, type: "image", color: "#fafafa" })).toEqual({
            backgroundColor: "#fafafa",
        });
        // Pre-image documents have no `image` key on stored background values
        const { image: _image, ...legacy } = defaultBackground;
        expect(backgroundToCss({ ...legacy, type: "image", color: "#fafafa" })).toEqual({
            backgroundColor: "#fafafa",
        });
    });
});

describe("border", () => {
    it("width 0 emits no border but radius still applies", () => {
        expect(borderToCss({ ...defaultBorder, radius: 8 })).toEqual({ borderRadius: "8px" });
    });

    it("per-corner radius emits the four-value shorthand", () => {
        expect(
            borderToCss({
                ...defaultBorder,
                radius: { topLeft: 8, topRight: 0, bottomRight: 8, bottomLeft: 0 },
            }),
        ).toEqual({ borderRadius: "8px 0px 8px 0px" });
    });

    it("uniform stroke emits the border shorthand", () => {
        expect(borderToCss({ width: uniformSides(2), style: "dashed", color: "#000000", radius: 0 })).toEqual({
            border: "2px dashed #000000",
        });
    });

    it("per-side widths emit only the sides that are set", () => {
        expect(
            borderToCss({ width: { top: 1, right: 0, bottom: 3, left: 0 }, style: "solid", color: "#111111", radius: 0 }),
        ).toEqual({
            borderTop: "1px solid #111111",
            borderBottom: "3px solid #111111",
        });
    });

    it("legacy single-number widths still apply to all sides", () => {
        expect(
            borderToCss({ width: 2 as unknown as BorderValue["width"], style: "solid", color: "#000000", radius: 0 }),
        ).toEqual({
            border: "2px solid #000000",
        });
    });
});

describe("spacing", () => {
    it("sideShorthand collapses uniform sides", () => {
        expect(sideShorthand(uniformSides(24))).toBe("24px");
    });

    it("sideShorthand collapses symmetric sides", () => {
        expect(sideShorthand(symmetricSides(24, 12))).toBe("24px 12px");
    });

    it("sideShorthand keeps four distinct values", () => {
        expect(sideShorthand({ top: 1, right: 2, bottom: 3, left: 4 })).toBe("1px 2px 3px 4px");
    });

    it("padding/margin convert their own half only", () => {
        const value = { padding: uniformSides(8), margin: symmetricSides(16, 0) };
        expect(paddingToCss(value)).toEqual({ padding: "8px" });
        expect(marginToCss(value)).toEqual({ margin: "16px 0px" });
        expect(spacingToCss(value)).toEqual({ padding: "8px", margin: "16px 0px" });
    });
});

describe("effects", () => {
    it("neutral effects emit nothing", () => {
        expect(effectsToCss(defaultEffects)).toEqual({});
    });

    it("opacity below 100 becomes a fraction", () => {
        expect(effectsToCss({ ...defaultEffects, opacity: 40 })).toEqual({ opacity: 0.4 });
    });

    it("drop shadow emits box-shadow with rgba color", () => {
        const css = effectsToCss({
            opacity: 100,
            shadow: { type: "drop", x: 0, y: 2, blur: 8, spread: 0, color: "#000000", opacity: 15 },
        });
        expect(css.boxShadow).toBe("0px 2px 8px 0px rgba(0, 0, 0, 0.15)");
    });

    it("inner shadow gets the inset prefix", () => {
        const css = effectsToCss({
            opacity: 100,
            shadow: { type: "inner", x: 1, y: 1, blur: 4, spread: 0, color: "#ff0000", opacity: 50 },
        });
        expect(css.boxShadow).toBe("inset 1px 1px 4px 0px rgba(255, 0, 0, 0.5)");
    });
});

describe("layout", () => {
    it("maps horizontal alignment to textAlign with stretch → left", () => {
        expect(horizontalToTextAlign("start")).toBe("left");
        expect(horizontalToTextAlign("center")).toBe("center");
        expect(horizontalToTextAlign("end")).toBe("right");
        expect(horizontalToTextAlign("stretch")).toBe("left");
    });

    it("maps vertical alignment to cell verticalAlign with stretch → top", () => {
        expect(verticalToVerticalAlign("start")).toBe("top");
        expect(verticalToVerticalAlign("middle")).toBe("middle");
        expect(verticalToVerticalAlign("end")).toBe("bottom");
        expect(verticalToVerticalAlign("stretch")).toBe("top");
    });

    it("layoutToCss emits textAlign only (gap is structural)", () => {
        expect(layoutToCss({ horizontal: "center", vertical: "middle", gap: 12 })).toEqual({ textAlign: "center" });
    });
});

describe("size", () => {
    it("maps full/fixed/percent/hug widths", () => {
        expect(sizeToCss({ width: "full", widthPx: 300, height: "hug", heightPx: 100 }).width).toBe("100%");
        expect(sizeToCss({ width: "fixed", widthPx: 300, height: "hug", heightPx: 100 }).width).toBe(300);
        expect(sizeToCss({ width: "percent", widthPx: 300, widthPct: 50, height: "hug", heightPx: 100 }).width).toBe("50%");
        expect(sizeToCss({ width: "hug", widthPx: 300, height: "hug", heightPx: 100 }).width).toBe("auto");
    });

    it("percent width without widthPct (pre-percent document) falls back to the default", () => {
        expect(sizeToCss({ width: "percent", widthPx: 300, height: "hug", heightPx: 100 }).width).toBe("50%");
    });

    it("only fixed height emits a px height; full height is auto in email flow", () => {
        expect(sizeToCss({ width: "hug", widthPx: 300, height: "fixed", heightPx: 120 }).height).toBe(120);
        expect(sizeToCss({ width: "hug", widthPx: 300, height: "full", heightPx: 120 }).height).toBe("auto");
    });
});

describe("typography", () => {
    it("emits line-height as px from the multiplier", () => {
        const css = typographyToCss({ ...defaultTypography, fontSize: 16, lineHeight: 1.5 });
        expect(css.lineHeight).toBe("24px");
        expect(css.fontSize).toBe(16);
    });

    it("inherits fontFamily and skips zero letterSpacing", () => {
        const css = typographyToCss(defaultTypography);
        expect(css.fontFamily).toBeUndefined();
        expect(css.letterSpacing).toBeUndefined();
    });

    it("folds text opacity into the color as rgba", () => {
        const css = typographyToCss({ ...defaultTypography, color: "#000000", opacity: 50 });
        expect(css.color).toBe("rgba(0, 0, 0, 0.5)");
    });
});

describe("hexToRgba", () => {
    it("returns the hex untouched at 100%", () => {
        expect(hexToRgba("#123456", 100)).toBe("#123456");
    });

    it("expands 3-digit hex", () => {
        expect(hexToRgba("#f00", 50)).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("leaves unparseable input untouched", () => {
        expect(hexToRgba("tomato", 50)).toBe("tomato");
    });
});

describe("parseColorToHexOpacity", () => {
    it("round-trips hexToRgba output", () => {
        expect(parseColorToHexOpacity(hexToRgba("#3f3f46", 50))).toEqual({ hex: "#3f3f46", opacity: 50 });
        expect(parseColorToHexOpacity(hexToRgba("#3f3f46", 100))).toEqual({ hex: "#3f3f46", opacity: 100 });
    });

    it("parses hex (incl. shorthand) as fully opaque", () => {
        expect(parseColorToHexOpacity("#FF0000")).toEqual({ hex: "#ff0000", opacity: 100 });
        expect(parseColorToHexOpacity("#abc")).toEqual({ hex: "#aabbcc", opacity: 100 });
    });

    it("parses rgb() and rgba()", () => {
        expect(parseColorToHexOpacity("rgb(255, 0, 0)")).toEqual({ hex: "#ff0000", opacity: 100 });
        expect(parseColorToHexOpacity("rgba(0, 0, 0, 0.15)")).toEqual({ hex: "#000000", opacity: 15 });
    });

    it("returns null for anything else", () => {
        expect(parseColorToHexOpacity("")).toBeNull();
        expect(parseColorToHexOpacity("red")).toBeNull();
        expect(parseColorToHexOpacity("var(--x)")).toBeNull();
    });
});
