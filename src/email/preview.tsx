import { useEffect, useMemo, useState } from "react";
import { Artboard } from "../components/canvas/Artboard.tsx";
import { useBuilderContext } from "../react/context.ts";
import { useBuilderState } from "../react/hooks.ts";
import type { EmailBlockOverride } from "./types.ts";

/*
 * EmailPreview — see docs/06 §Preview mode. Shows the truth: the real
 * react-email output, debounce-rendered client-side into an <iframe srcDoc>.
 * The iframe isolates the email from the app's Tailwind preflight/global CSS,
 * and sits in the same resizable Artboard frame as the editing canvas.
 * Read-only; render inside <BuilderProvider> (usually swapped with <Canvas>).
 */

/*
 * The iframe is a separate document, so the builder's slim-scrollbar CSS
 * (style.css) can't reach it — without this the preview shows the fat
 * platform-default scrollbar while the editing canvas shows the thin one.
 * Inject the same treatment into the preview document, resolving the thumb
 * token from the host page (tokens live on :root). Preview-only chrome —
 * the export pipeline's HTML is untouched.
 */
function withPreviewScrollbar(html: string): string {
    const thumb =
        getComputedStyle(document.documentElement)
            .getPropertyValue("--mat-builder-color-scrollbar-thumb")
            .trim() || "rgb(0 0 0 / 0.2)";
    const style = `<style>html{scrollbar-width:thin;scrollbar-color:${thumb} transparent}</style>`;
    return html.includes("</head>") ? html.replace("</head>", `${style}</head>`) : style + html;
}

/**
 * Imports the output pipeline lazily, turning the module-not-found a missing
 * optional peer would otherwise produce into something that says what to do.
 */
async function renderOnDemand(): Promise<typeof import("./render.ts")["renderEmail"]> {
    try {
        return (await import("./render.ts")).renderEmail;
    } catch (cause) {
        throw new Error(
            "mat-builder: the email preview needs `react-email` and `@react-email/render`. " +
                "They are optional peer dependencies — required by `/email` and `/email/render`, " +
                "skippable only if you use the core editor alone. Install them to enable the preview.",
            { cause },
        );
    }
}

export interface EmailPreviewProps {
    className?: string;
    /** Initial artboard width in px, or "fill" to size to 80% of the surface
     * until the user drags a size */
    initialWidth?: number | "fill";
    /** Initial artboard height in px, or "fill" */
    initialHeight?: number | "fill";
    debounceMs?: number;
    /**
     * Output renderers for custom PRIMITIVE blocks (docs/08 §8) — the preview
     * has no other way to reach them, since a primitive's email render lives
     * outside its definition.
     *
     * Composed blocks need nothing here: their `compose` is on the definition,
     * so the preview reads them straight off the registry and stays in step
     * with the export automatically.
     */
    blocks?: readonly EmailBlockOverride[];
}

export function EmailPreview({
    className,
    initialWidth = 600,
    initialHeight = 720,
    debounceMs = 300,
    blocks,
}: EmailPreviewProps) {
    const { store, registry } = useBuilderContext();
    const document = useBuilderState((s) => s.document);
    const actions = useBuilderState((s) => s.actions);
    // Stand-in merge-tag data (docs/06 §Preview data): substituted into the
    // copy and evaluated by conditional blocks, so the preview shows what a
    // recipient with this data would get. Always passed — even empty, which
    // is what makes "is provided" rules resolve to false here.
    const values = useBuilderState((s) => s.previewValues);
    const rootNode = document.blocks[document.rootId];

    // Composed definitions come off the registry, so a host that registered a
    // composed block gets a faithful preview without wiring anything — the
    // preview and the export walk the identical specs (docs/08 §4).
    const renderBlocks = useMemo<EmailBlockOverride[]>(() => {
        const composed = registry.definitions
            .filter((definition) => definition.compose)
            .map((definition) => ({
                type: definition.type,
                defaultProps: definition.defaultProps,
                compose: definition.compose,
            }));
        return [...composed, ...(blocks ?? [])];
    }, [registry, blocks]);
    const [html, setHtml] = useState<string>("");
    // A render failure is shown by React, never spliced into the srcDoc — the
    // message carries document strings (a root type name, say).
    const [error, setError] = useState<string | null>(null);
    // Mount-time read — a size the user dragged on the Canvas carries over
    const [persistedSize] = useState(() => store.getState().artboardSize);

    // Preview shows output truth — entering it ends the editing session.
    // Without this, a selection made in edit mode lingers in the store while
    // no canvas exists to draw its frame: switching back showed the inspector
    // bound to a block with no visible selection chrome.
    useEffect(() => {
        store.getState().actions.select(null);
    }, [store]);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            // Loaded on demand, so `react-email` and `@react-email/render` —
            // optional peers — are only needed once someone opens the preview.
            // Without this, importing `./email` at all would pull them in and
            // the "optional" flag would be a lie for every consumer.
            renderOnDemand()
                .then((renderEmail) => renderEmail(document, { values, substituteTokens: true, blocks: renderBlocks }))
                .then((result) => {
                    if (cancelled) return;
                    setHtml(withPreviewScrollbar(result.html));
                    setError(null);
                })
                .catch((reason: unknown) => {
                    if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
                });
        }, debounceMs);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [document, values, debounceMs, renderBlocks]);

    return (
        <Artboard
            className={`mat-builder-email-preview ${className ?? ""}`}
            initialWidth={initialWidth}
            initialHeight={initialHeight}
            size={persistedSize}
            onSizeChange={(size) => actions.setArtboardSize(size)}
            // Same reason as the Canvas (docs/03 §getArtboardStyle): the email's
            // page background stops at the iframe's content width, so without
            // this the frame's own paper shows in the scrollbar's gutter.
            frameStyle={rootNode && registry.getDefinition(rootNode.type)?.getArtboardStyle?.(rootNode.props)}
        >
            {error ? (
                <pre
                    className="h-full w-full overflow-auto whitespace-pre-wrap p-4 text-xs"
                    style={{ color: "var(--mat-builder-color-missing-fg)" }}
                >
                    {error}
                </pre>
            ) : (
                // Fully sandboxed: a srcDoc document inherits the HOST's origin
                // unless sandboxed, so anything script-shaped that reaches the
                // HTML would run as the app. The empty allow-list blocks
                // scripts, forms and top navigation; the preview needs none of
                // them (the scrollbar styling above travels inside the srcDoc).
                <iframe title="Email preview" srcDoc={html} sandbox="" className="h-full w-full border-0" />
            )}
        </Artboard>
    );
}
