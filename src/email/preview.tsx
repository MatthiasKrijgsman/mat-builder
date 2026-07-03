import { useEffect, useState } from "react";
import { useBuilderState } from "../react/hooks.ts";
import { renderEmail } from "./render.ts";

/*
 * EmailPreview — see docs/06 §Preview mode. Shows the truth: the real
 * react-email output, debounce-rendered client-side into an <iframe srcDoc>.
 * The iframe isolates the email from the app's Tailwind preflight/global CSS.
 * Read-only; render inside <BuilderProvider> (usually swapped with <Canvas>).
 */

export interface EmailPreviewProps {
    className?: string;
    /** Viewport width in px — 600 desktop, 375 mobile presets */
    width?: number;
    debounceMs?: number;
}

export function EmailPreview({ className, width = 600, debounceMs = 300 }: EmailPreviewProps) {
    const document = useBuilderState((s) => s.document);
    const [html, setHtml] = useState<string>("");

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
        <div
            className={`mat-builder-email-preview flex justify-center overflow-auto p-8 ${className ?? ""}`}
            style={{ backgroundColor: "var(--mat-builder-color-canvas-bg)" }}
        >
            <iframe
                title="Email preview"
                srcDoc={html}
                className="h-full shrink-0 border-0 shadow-sm"
                style={{ width, backgroundColor: "var(--mat-builder-color-artboard-bg)" }}
            />
        </div>
    );
}
