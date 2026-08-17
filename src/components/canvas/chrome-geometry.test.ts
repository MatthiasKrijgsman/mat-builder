import { describe, expect, it } from "vitest";
import {
    computeChromeGeometry,
    computeMarkerGeometry,
    geometryChanged,
    markerChanged,
    MARKER_INSET,
    MARKER_SIZE,
    PILL_CLEARANCE,
    PILL_INSET,
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
        expect(g.pillPlacement).toBe("above");
    });

    it("grants an edge-flush block exactly the ring allowance", () => {
        const g = computeChromeGeometry(rect(100, 200, 600, 120), overlay, scroller, ALLOWANCE);
        expect(g.clipTop).toBe(-ALLOWANCE);
        expect(g.clipLeft).toBe(-ALLOWANCE);
        expect(g.clipRight).toBe(-ALLOWANCE);
    });

    it("trims a block scrolled past the viewport top at the sheet boundary exactly", () => {
        const g = computeChromeGeometry(rect(40, 200, 600, 120), overlay, scroller, ALLOWANCE);
        // Block top is 60px above the scroller top. No allowance here: there's
        // no block edge to ring, so the rails must not paint above the sheet
        expect(g.clipTop).toBe(60);
    });

    it("trims a block scrolled past the viewport bottom at the sheet boundary exactly", () => {
        const g = computeChromeGeometry(rect(780, 200, 600, 120), overlay, scroller, ALLOWANCE);
        // Block bottom (900) is 80px below the scroller bottom (820)
        expect(g.clipBottom).toBe(80);
    });

    it("trims both ends of a block taller than the viewport", () => {
        const g = computeChromeGeometry(rect(0, 200, 600, 1000), overlay, scroller, ALLOWANCE);
        expect(g.clipTop).toBe(100);
        expect(g.clipBottom).toBe(180);
    });

    it("keeps the allowance on the sides whose edge is still inside", () => {
        // Scrolled past the bottom, but the top edge is in view and rings normally
        const g = computeChromeGeometry(rect(300, 200, 600, 700), overlay, scroller, ALLOWANCE);
        expect(g.clipTop).toBe(100 - ALLOWANCE - 300);
        expect(g.clipBottom).toBe(1000 - 820);
    });

    it("respects a larger ring allowance (rethemed outline-offset)", () => {
        const g = computeChromeGeometry(rect(100, 200, 600, 120), overlay, scroller, 6);
        expect(g.clipTop).toBe(-6);
    });

    it("flips the pill below the block exactly under the clearance threshold", () => {
        const below = computeChromeGeometry(rect(100 + PILL_CLEARANCE - 1, 200, 600, 120), overlay, scroller, ALLOWANCE);
        const above = computeChromeGeometry(rect(100 + PILL_CLEARANCE, 200, 600, 120), overlay, scroller, ALLOWANCE);
        expect(below.pillPlacement).toBe("below");
        expect(above.pillPlacement).toBe("above");
    });

    it("keeps the pill off a short block at the very top of the artboard", () => {
        // The reported case: a 40px text block flush with the frame top — the
        // pill must hang under it, not sit on top of the text
        const g = computeChromeGeometry(rect(100, 200, 600, 40), overlay, scroller, ALLOWANCE);
        expect(g.pillPlacement).toBe("below");
        // ...and the clip-path has to let it paint there: 580px of room below
        expect(g.clipBottom).toBeLessThan(-PILL_CLEARANCE);
    });

    it("falls back inside only when neither edge has clearance", () => {
        // Taller than the viewport, scrolled so both ends are off-screen
        const spanning = computeChromeGeometry(rect(80, 200, 600, 900), overlay, scroller, ALLOWANCE);
        expect(spanning.pillPlacement).toBe("inside");

        // Bottom one pixel short of the clearance, top still off-screen
        const tight = computeChromeGeometry(
            rect(80, 200, 600, scroller.bottom - 80 - PILL_CLEARANCE + 1),
            overlay,
            scroller,
            ALLOWANCE,
        );
        expect(tight.pillPlacement).toBe("inside");
    });

    it("holds an inside pill against the visible frame top, not the block's own", () => {
        // Block top still in view: the plain corner inset
        const inView = computeChromeGeometry(rect(120, 200, 600, 900), overlay, scroller, ALLOWANCE);
        expect(inView.pillOffset).toBe(PILL_INSET);

        // Scrolled 200px past the top: the pill slides down with the fold, so
        // it lands PILL_INSET below the visible top instead of off-screen
        const scrolled = computeChromeGeometry(rect(-100, 200, 600, 900), overlay, scroller, ALLOWANCE);
        expect(scrolled.pillOffset).toBe(200 + PILL_INSET);
        // -100 + 206 = 106, i.e. PILL_INSET below the scroller top (100)
        expect(-100 + scrolled.pillOffset).toBe(scroller.top + PILL_INSET);
        // ...and the clip lets it through: the frame is cut at the sheet, above the pill
        expect(scrolled.clipTop).toBe(200);
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
