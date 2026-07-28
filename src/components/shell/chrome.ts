import type { CSSProperties } from "react";

/*
 * Shared chrome for the docked editor layout (docs/04 §Shell): a full-width
 * top bar and edge-docked side panels around one continuous dotted canvas
 * surface. Exported so hosts building their own layout out of the individual
 * components get the same surfaces without copying values.
 */

/** The docked top bar and side panels — square-cornered token-colored
 * surfaces. Each usage adds its own border side(s); the border color here
 * applies to whichever sides are enabled. */
export const dockedPanel: CSSProperties = {
    overflow: "hidden",
    backgroundColor: "var(--mat-builder-color-panel-bg)",
    borderColor: "var(--mat-builder-color-panel-border)",
};

/** The canvas's dotted work-surface, painted on the shell root so the canvas
 * column and the area around it read as one surface. */
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
