import type { Metadata } from "next";
import { OgFrame } from "./OgFrame";

/*
 * /og — the source of the site's social-preview image, not part of the
 * playground. It stays in the repo so the image can be re-cut when the
 * product or the wording moves on, rather than being a PNG nobody can edit.
 *
 * The artboard is 1200 × 630 (the Open Graph size). This route frames it for
 * looking at; `/og/bare` renders the same artboard alone at exactly that size,
 * which is what a headless capture points at:
 *
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --headless --disable-gpu --hide-scrollbars \
 *     --window-size=1200,630 --screenshot=site/public/og-image.png \
 *     http://localhost:6007/og/bare
 *
 * `site/public/og-image.png` is what app/layout.tsx points the OG and Twitter
 * tags at, so overwriting it in place is the whole update.
 */

// A scratch route that happens to be deployed — no reason for it in an index.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OgPage() {
    return (
        <div className="flex min-h-screen flex-col items-center gap-6 bg-gray-100 p-10">
            <OgFrame />
            {/* Outside the artboard on purpose — never part of the capture. */}
            <p className="text-sm text-gray-500">
                1200 × 630 → <code className="rounded bg-gray-200 px-1">site/public/og-image.png</code>. Capture{" "}
                <code className="rounded bg-gray-200 px-1">/og/bare</code> at a 1200 × 630 viewport.
            </p>
        </div>
    );
}
