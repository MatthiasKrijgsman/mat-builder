import type { CSSProperties } from "react";

/*
 * Shared chrome for the floating editor layout: one continuous dotted
 * surface on the app root, with the top bar and the three panels floating
 * over it as white rounded cards.
 */

/** Card chrome for the floating top bar and panels. */
export const floatingPanel =
    "overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-gray-200/50";

/** The canvas's dotted work-surface, painted on the app root so the top bar
 * and panels all float over one continuous surface. */
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
