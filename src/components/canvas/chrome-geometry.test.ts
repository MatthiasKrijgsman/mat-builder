import { describe, expect, it } from "vitest";
import {
    computeChromeGeometry,
    geometryChanged,
    PILL_CLEARANCE,
    RING_ALLOWANCE,
    type RectLike,
} from "./chrome-geometry.ts";

const rect = (top: number, left: number, width: number, height: number): RectLike => ({
    top,
    left,
    bottom: top + height,
    width,
    height,
});

// Overlay and scroller share the artboard frame box in the real layout
const overlay = rect(100, 200, 600, 720);
const scroller = overlay;

describe("computeChromeGeometry", () => {
    it("places a fully visible block overlay-relative with no clip", () => {
        const g = computeChromeGeometry(rect(300, 200, 600, 120), overlay, scroller);
        expect(g).toMatchObject({ x: 0, y: 200, width: 600, height: 120, clipTop: 0, clipBottom: 0 });
        expect(g.pillInside).toBe(false);
    });

    it("clips the top of a block scrolled past the viewport top, minus the ring allowance", () => {
        const g = computeChromeGeometry(rect(40, 200, 600, 120), overlay, scroller);
        // Block top is 60px above the scroller top; ring allowance is forgiven
        expect(g.clipTop).toBe(60 - RING_ALLOWANCE);
        expect(g.clipBottom).toBe(0);
        expect(g.y).toBe(-60);
    });

    it("clips the bottom of a block scrolled past the viewport bottom", () => {
        const g = computeChromeGeometry(rect(780, 200, 600, 120), overlay, scroller);
        // Block bottom (900) is 80px below the scroller bottom (820)
        expect(g.clipBottom).toBe(80 - RING_ALLOWANCE);
        expect(g.clipTop).toBe(0);
    });

    it("keeps the ring unclipped for a block flush with the viewport edge", () => {
        const g = computeChromeGeometry(rect(100, 200, 600, 120), overlay, scroller);
        expect(g.clipTop).toBe(0);
    });

    it("clips both ends of a block taller than the viewport", () => {
        const g = computeChromeGeometry(rect(0, 200, 600, 1000), overlay, scroller);
        expect(g.clipTop).toBe(100 - RING_ALLOWANCE);
        expect(g.clipBottom).toBe(180 - RING_ALLOWANCE);
    });

    it("flips the pill inside exactly under the clearance threshold", () => {
        const inside = computeChromeGeometry(rect(100 + PILL_CLEARANCE - 1, 200, 600, 120), overlay, scroller);
        const outside = computeChromeGeometry(rect(100 + PILL_CLEARANCE, 200, 600, 120), overlay, scroller);
        expect(inside.pillInside).toBe(true);
        expect(outside.pillInside).toBe(false);
    });
});

describe("geometryChanged", () => {
    it("detects identical and differing geometry", () => {
        const a = computeChromeGeometry(rect(300, 200, 600, 120), overlay, scroller);
        const b = computeChromeGeometry(rect(300, 200, 600, 120), overlay, scroller);
        const c = computeChromeGeometry(rect(301, 200, 600, 120), overlay, scroller);
        expect(geometryChanged(a, b)).toBe(false);
        expect(geometryChanged(a, c)).toBe(true);
    });
});
