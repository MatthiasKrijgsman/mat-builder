import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const TITLE = "mat-builder — email builder";

/* The social card says exactly what the artboard says (app/og/OgFrame.tsx):
 * the image and the text beside it must not read as two different products.
 * The browser tab keeps the project name — a tab has no `og:site_name` to
 * carry it, and a bare "Email Builder" says nothing in a list of tabs. */
const OG_TITLE = "Email Builder";
const DESCRIPTION = "Compose templates from blocks, edit them inline, and export email-safe HTML.";

/* Regenerated from the /og route; see site/app/og/page.tsx for the capture
 * command. Served from public/, so `basePath` does not apply — the absolute
 * URL comes from `metadataBase` instead (next.config.ts §siteUrl). */
const OG_IMAGE = "/og-image.png";
const IMAGE_ALT = "The mat-builder email builder: a block palette, a canvas holding an email template, and the inspector.";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:6007"),
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
        type: "website",
        siteName: "mat-builder",
        title: OG_TITLE,
        description: DESCRIPTION,
        url: "/",
        images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: IMAGE_ALT }],
    },
    twitter: {
        card: "summary_large_image",
        title: OG_TITLE,
        description: DESCRIPTION,
        images: [OG_IMAGE],
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
                {children}
            </body>
        </html>
    );
}
