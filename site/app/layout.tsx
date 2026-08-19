import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const TITLE = "mat-builder — email builder";
const DESCRIPTION =
    "The email builder playground for @matthiaskrijgsman/mat-builder — compose templates from blocks, edit them inline, and export email-safe HTML.";

/* Regenerated from the /og route; see site/app/og/page.tsx for the capture
 * command. Served from public/, so `basePath` does not apply — the absolute
 * URL comes from `metadataBase` instead (next.config.ts §siteUrl). */
const OG_IMAGE = "/og-image.png";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:6007"),
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
        type: "website",
        siteName: "mat-builder",
        title: TITLE,
        description: DESCRIPTION,
        url: "/",
        images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Email Builder — the mat-builder email builder" }],
    },
    twitter: {
        card: "summary_large_image",
        title: TITLE,
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
