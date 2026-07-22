import type { CSSProperties } from "react";

/*
 * Shared chrome for the docked editor layout: a full-width top bar and
 * edge-docked side panels around one continuous dotted canvas surface.
 */

/** Base chrome for the docked top bar and side panels — square-cornered
 * white surfaces. Each usage adds its own border side(s); the border color
 * here applies to whichever sides are enabled. */
export const dockedPanel = "overflow-hidden border-stone-200 bg-white";

/** The canvas's dotted work-surface, painted on the app root so the canvas
 * column sits on one continuous surface. */
export const dottedSurface: CSSProperties = {
    backgroundColor: "var(--mat-builder-color-canvas-bg)",
    backgroundImage: "radial-gradient(circle, var(--mat-builder-color-canvas-dot) 1px, transparent 1px)",
    backgroundSize: "16px 16px",
};

/** Zeroes the Canvas/Artboard surface tokens so the root's dot layer shows
 * through — the canvas would otherwise paint its own dots, phase-shifted by
 * its offset from the root. */
export const transparentSurface = {
    "--mat-builder-color-canvas-bg": "transparent",
    "--mat-builder-color-canvas-dot": "transparent",
} as CSSProperties;
