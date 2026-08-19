import type { Metadata } from "next";
import { OgFrame } from "../OgFrame";

/* The artboard alone, filling the viewport — the capture target (see ../page.tsx). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OgBarePage() {
    return (
        <div className="fixed left-0 top-0">
            <OgFrame />
        </div>
    );
}
