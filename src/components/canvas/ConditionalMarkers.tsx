import { IconFilter } from "@tabler/icons-react";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import type { BlockId } from "../../core/types.ts";
import { describeVisibility, hasVisibilityRules } from "../../core/visibility.ts";
import { useBuilderFeatures, useBuilderState, useMergeTags } from "../../react/hooks.ts";
import { computeMarkerGeometry, markerChanged, type MarkerGeometry } from "./chrome-geometry.ts";

/*
 * ConditionalMarkers — the canvas badge on every block with visibility rules
 * (docs/06 §Conditional visibility).
 *
 * A conditional block renders exactly like any other while editing, which is
 * correct — you have to be able to edit it — but leaves nothing on the canvas
 * saying "this only reaches some recipients". The badge is that mark, and it
 * is deliberately PERSISTENT rather than tied to selection: its whole job is
 * letting you scan a template and see which parts are conditional without
 * clicking through every block.
 *
 * It lives in the ChromeOverlay layer for the same reason the rings do (docs/04
 * §BlockFrame): drawn from measured rects, so it never changes a block's box
 * and never clips against the artboard's rounded scroller. Unlike the ring
 * frames — at most three, one per interaction state — there is one badge per
 * conditional block, so they share ONE rAF loop instead of one each.
 */

export function ConditionalMarkers({ scrollerRef }: { scrollerRef: RefObject<HTMLDivElement | null> }) {
    // The badges' coordinate origin is this component's OWN box, stretched over
    // the overlay's, rather than the overlay's ref: a parent's ref attaches
    // after its children's layout effects run, so reading it here would find
    // null on mount — which is exactly what it did.
    const originRef = useRef<HTMLDivElement>(null);
    const document = useBuilderState((s) => s.document);
    const actions = useBuilderState((s) => s.actions);
    const tags = useMergeTags();
    const { visibility: enabled } = useBuilderFeatures();

    const marked = useMemo(
        () =>
            enabled
                ? Object.values(document.blocks)
                      .filter((node) => node.id !== document.rootId && hasVisibilityRules(node.visibility))
                      .map((node) => node.id)
                : [],
        [document, enabled],
    );

    // Tooltips read the tag's display name; a token the provider no longer
    // lists falls back to the raw token rather than going blank.
    const labelOf = useMemo(() => {
        const byToken = new Map(tags.map((tag) => [tag.token, tag.label]));
        return (token: string) => byToken.get(token) ?? token;
    }, [tags]);

    const elements = useRef(new Map<BlockId, HTMLElement>());

    useLayoutEffect(() => {
        if (marked.length === 0) return;

        let raf = 0;
        let lastScale = 1;
        const last = new Map<BlockId, MarkerGeometry>();
        const tick = () => {
            // Re-read per frame rather than capturing at setup: the artboard
            // only reveals itself once its size is known, so the scroller can
            // attach a commit later than this mounts.
            const origin = originRef.current;
            const scroller = scrollerRef.current;
            if (!origin || !scroller) {
                raf = requestAnimationFrame(tick);
                return;
            }
            // Measured once per frame, not per badge — the container rects and
            // the scale are the same for all of them.
            const overlayRect = origin.getBoundingClientRect();
            const scrollerRect = scroller.getBoundingClientRect();
            // The artboard scales while it reveals itself, and every rect above
            // is post-scale while `transform` is applied in the badge's own
            // (pre-scale) space — so the viewport-space delta has to be divided
            // back out, or the badges slide in from the wrong place.
            const scale = origin.offsetWidth > 0 ? overlayRect.width / origin.offsetWidth : 1;
            for (const id of marked) {
                const badge = elements.current.get(id);
                const target = scroller.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
                if (!badge) continue;
                if (!(target instanceof HTMLElement)) {
                    badge.style.visibility = "hidden";
                    continue;
                }
                const geometry = computeMarkerGeometry(target.getBoundingClientRect(), overlayRect, scrollerRect);
                const previous = last.get(id);
                // The scale is part of what gets written, so a scale-only
                // change still has to repaint even when the rects agree.
                if (previous && scale === lastScale && !markerChanged(previous, geometry)) continue;
                badge.style.transform = `translate(${geometry.x / scale}px, ${geometry.y / scale}px)`;
                badge.style.visibility = geometry.visible ? "visible" : "hidden";
                last.set(id, geometry);
            }
            lastScale = scale;
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(raf);
        // Re-binds when the marked set changes (a commit) — restarting a rAF
        // loop is free, and the first tick runs synchronously, so nothing moves.
    }, [marked, scrollerRef]);

    return (
        <div ref={originRef} className="absolute inset-0">
            {marked.map((id) => (
                <Marker
                    key={id}
                    id={id}
                    title={describeVisibility(document.blocks[id]?.visibility, labelOf)}
                    onSelect={() => actions.select(id)}
                    register={(element) => {
                        if (element) elements.current.set(id, element);
                        else elements.current.delete(id);
                    }}
                />
            ))}
        </div>
    );
}

function Marker({
    id,
    title,
    onSelect,
    register,
}: {
    id: BlockId;
    title: string;
    onSelect: () => void;
    register: (element: HTMLElement | null) => void;
}) {
    return (
        <button
            ref={register}
            type="button"
            // Hidden until the loop's first measure — never flash at 0,0
            style={{ visibility: "hidden" }}
            className="mat-builder-chrome-conditional"
            data-block-id-marker={id}
            title={title}
            aria-label={title}
            onClick={(event) => {
                // The artboard's empty-area click deselects; selecting the
                // badge's own block is the useful outcome (same as clicking
                // its layers row, which also bypasses group selection).
                event.stopPropagation();
                onSelect();
            }}
        >
            <IconFilter className="size-3 shrink-0" aria-hidden />
        </button>
    );
}
