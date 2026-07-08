import { describe, expect, it } from "vitest";
import { computeChromeGeometry, geometryChanged, PILL_CLEARANCE, type RectLike } from "./chrome-geometry.ts";

const rect = (top: number, left: number, width: number, height: number): RectLike => ({
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
});

// Overlay and scroller share the artboard frame box in the real layout
const overlay = rect(100, 200, 600, 720);
const scroller = overlay;
const ALLOWANCE = 3; // e.g. outline-offset 0px + RING_SLACK

describe("computeChromeGeometry", () => {
    it("places a block overlay-relative and lets chrome paint up to the viewport edge only", () => {
        const g = computeChromeGeometry(rect(300, 250, 500, 120), overlay, scroller, ALLOWANCE);
        expect(g).toMatchObject({ x: 50, y: 200, width: 500, height: 120 });
        // Negative insets = slack outside the frame box, bounded at the
        // viewport edge + allowance: paint stops exactly at the sheet
        expect(g.clipTop).toBe(100 - ALLOWANCE - 300);
        expect(g.clipLeft).toBe(200 - ALLOWANCE - 250);
        expect(g.clipRight).toBe(750 - (800 + ALLOWANCE));
        expect(g.clipBottom).toBe(420 - (820 + ALLOWANCE));
        expect(g.pillInside).toBe(false);
    });

    it("grants an edge-flush block exactly the ring allowance", () => {
        const g = computeChromeGeometry(rect(100, 200, 600, 120), overlay, scroller, ALLOWANCE);
        expect(g.clipTop).toBe(-ALLOWANCE);
        expect(g.clipLeft).toBe(-ALLOWANCE);
        expect(g.clipRight).toBe(-ALLOWANCE);
    });

    it("trims a block scrolled past the viewport top", () => {
        const g = computeChromeGeometry(rect(40, 200, 600, 120), overlay, scroller, ALLOWANCE);
        // Block top is 60px above the scroller top; ring allowance is forgiven
        expect(g.clipTop).toBe(60 - ALLOWANCE);
    });

    it("trims a block scrolled past the viewport bottom", () => {
        const g = computeChromeGeometry(rect(780, 200, 600, 120), overlay, scroller, ALLOWANCE);
        // Block bottom (900) is 80px below the scroller bottom (820)
        expect(g.clipBottom).toBe(80 - ALLOWANCE);
    });

    it("trims both ends of a block taller than the viewport", () => {
        const g = computeChromeGeometry(rect(0, 200, 600, 1000), overlay, scroller, ALLOWANCE);
        expect(g.clipTop).toBe(100 - ALLOWANCE);
        expect(g.clipBottom).toBe(180 - ALLOWANCE);
    });

    it("respects a larger ring allowance (rethemed outline-offset)", () => {
        const g = computeChromeGeometry(rect(100, 200, 600, 120), overlay, scroller, 6);
        expect(g.clipTop).toBe(-6);
    });

    it("flips the pill inside exactly under the clearance threshold", () => {
        const inside = computeChromeGeometry(rect(100 + PILL_CLEARANCE - 1, 200, 600, 120), overlay, scroller, ALLOWANCE);
        const outside = computeChromeGeometry(rect(100 + PILL_CLEARANCE, 200, 600, 120), overlay, scroller, ALLOWANCE);
        expect(inside.pillInside).toBe(true);
        expect(outside.pillInside).toBe(false);
    });
});

describe("geometryChanged", () => {
    it("detects identical and differing geometry", () => {
        const a = computeChromeGeometry(rect(300, 200, 600, 120), overlay, scroller, ALLOWANCE);
        const b = computeChromeGeometry(rect(300, 200, 600, 120), overlay, scroller, ALLOWANCE);
        const c = computeChromeGeometry(rect(301, 200, 600, 120), overlay, scroller, ALLOWANCE);
        expect(geometryChanged(a, b)).toBe(false);
        expect(geometryChanged(a, c)).toBe(true);
    });
});
