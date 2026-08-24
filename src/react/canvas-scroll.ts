import type { BlockId } from "../core/types.ts";

/*
 * Canvas → viewport reveal. Selecting a row in the layers tree is navigation:
 * the block it names may be far outside the artboard's visible area, and the
 * selection chrome that lands on it is then drawn somewhere nobody is looking.
 * This scrolls the artboard's own scroller (the element the Canvas publishes on
 * the context, docs/04 §Canvas) just far enough to frame the block.
 */

/** Breathing room kept between the block and the scroller edge. */
const REVEAL_MARGIN = 24;

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Smooth-scroll `scroller` until the block is inside it, and do nothing at all
 * when it already is — a block the user can see is never nudged.
 */
export function scrollBlockIntoView(scroller: HTMLElement | null, id: BlockId): void {
    if (!scroller) return; // no canvas mounted (e.g. preview mode)
    const block = scroller.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
    if (!(block instanceof HTMLElement)) return;

    const view = scroller.getBoundingClientRect();
    const box = block.getBoundingClientRect();
    // Signed distances past each edge: negative above the top, positive below
    // the bottom. Inside on both counts means there is nothing to do.
    const above = box.top - (view.top + REVEAL_MARGIN);
    const below = box.bottom - (view.bottom - REVEAL_MARGIN);
    if (above >= 0 && below <= 0) return;

    // Move the shorter way, but never chase the bottom of a block taller than
    // the scroller — that would push its top (where the chrome sits) out of view.
    const top = above < 0 ? above : Math.min(above, below);
    scroller.scrollBy({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
