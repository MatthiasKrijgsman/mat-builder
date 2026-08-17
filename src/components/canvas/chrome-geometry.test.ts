import { describe, expect, it } from "vitest";
import {
    computeChromeGeometry,
    computeMarkerGeometry,
    geometryChanged,
    markerChanged,
    MARKER_INSET,
    MARKER_SIZE,
    PILL_CLEARANCE,
    type RectLike,
} from "./chrome-geometry.ts";

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

describe("computeMarkerGeometry", () => {
    it("insets the badge from the block's top-right corner", () => {
        const g = computeMarkerGeometry(rect(300, 250, 500, 120), overlay, scroller);
        expect(g).toEqual({
            // right edge 750, less the badge and its inset, overlay-relative
            x: 750 - MARKER_SIZE - MARKER_INSET - overlay.left,
            y: 300 + MARKER_INSET - overlay.top,
            visible: true,
        });
    });

    it("centers on blocks too small to hold the inset, instead of hanging off them", () => {
        // A 1px divider: the badge straddles the line rather than sitting under it
        const thin = computeMarkerGeometry(rect(300, 250, 500, 1), overlay, scroller);
        expect(thin.y).toBe(300 - 100 + (1 - MARKER_SIZE) / 2);

        // Tall enough for the full inset
        const tall = computeMarkerGeometry(rect(300, 250, 500, 120), overlay, scroller);
        expect(tall.y).toBe(300 - 100 + MARKER_INSET);
    });

    it("hides the badge unless it fits entirely inside the artboard viewport", () => {
        // The block may hang above the viewport — what matters is the BADGE's
        // own box, which rides MARKER_INSET below the block's top edge
        const lastVisible = rect(scroller.top - MARKER_INSET, 250, 500, 400);
        expect(computeMarkerGeometry(lastVisible, overlay, scroller).visible).toBe(true);
        const scrolledPast = rect(scroller.top - MARKER_INSET - 1, 250, 500, 400);
        expect(computeMarkerGeometry(scrolledPast, overlay, scroller).visible).toBe(false);
        // Bottom edge: the badge's own box must clear it, not just the block
        const atBottom = rect(scroller.bottom - MARKER_SIZE - MARKER_INSET, 250, 500, 400);
        expect(computeMarkerGeometry(atBottom, overlay, scroller).visible).toBe(true);
        const past = rect(scroller.bottom - MARKER_SIZE - MARKER_INSET + 1, 250, 500, 400);
        expect(computeMarkerGeometry(past, overlay, scroller).visible).toBe(false);
    });
});

describe("markerChanged", () => {
    it("detects moves and visibility flips", () => {
        const a = computeMarkerGeometry(rect(300, 250, 500, 120), overlay, scroller);
        const b = computeMarkerGeometry(rect(300, 250, 500, 120), overlay, scroller);
        const moved = computeMarkerGeometry(rect(301, 250, 500, 120), overlay, scroller);
        expect(markerChanged(a, b)).toBe(false);
        expect(markerChanged(a, moved)).toBe(true);
        expect(markerChanged(a, { ...a, visible: !a.visible })).toBe(true);
    });
});
