import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
    title: "mat-builder — email builder",
    description: "Email builder playground for @matthiaskrijgsman/mat-builder",
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
