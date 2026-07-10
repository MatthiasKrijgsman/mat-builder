import { useEffect, useState } from "react";
import { Artboard } from "../components/canvas/Artboard.tsx";
import { useBuilderContext } from "../react/context.ts";
import { useBuilderState } from "../react/hooks.ts";
import { renderEmail } from "./render.ts";

/*
 * EmailPreview — see docs/06 §Preview mode. Shows the truth: the real
 * react-email output, debounce-rendered client-side into an <iframe srcDoc>.
 * The iframe isolates the email from the app's Tailwind preflight/global CSS,
 * and sits in the same resizable Artboard frame as the editing canvas.
 * Read-only; render inside <BuilderProvider> (usually swapped with <Canvas>).
 */

export interface EmailPreviewProps {
    className?: string;
    /** Initial artboard width in px */
    initialWidth?: number;
    /** Initial artboard height in px */
    initialHeight?: number;
    debounceMs?: number;
}

export function EmailPreview({ className, initialWidth = 600, initialHeight = 720, debounceMs = 300 }: EmailPreviewProps) {
    const { store } = useBuilderContext();
    const document = useBuilderState((s) => s.document);
    const actions = useBuilderState((s) => s.actions);
    const [html, setHtml] = useState<string>("");
    // Mount-time read — a size the user dragged on the Canvas carries over
    const [persistedSize] = useState(() => store.getState().artboardSize);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            renderEmail(document)
                .then((result) => {
                    if (!cancelled) setHtml(result.html);
                })
                .catch((error: unknown) => {
                    if (!cancelled) setHtml(`<pre style="padding:16px;color:#b91c1c">${String(error)}</pre>`);
                });
        }, debounceMs);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [document, debounceMs]);

    return (
        <Artboard
            className={`mat-builder-email-preview ${className ?? ""}`}
            initialWidth={initialWidth}
            initialHeight={initialHeight}
            size={persistedSize}
            onSizeChange={(size) => actions.setArtboardSize(size)}
        >
            <iframe title="Email preview" srcDoc={html} className="h-full w-full border-0" />
        </Artboard>
    );
}
