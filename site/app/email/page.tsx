"use client";

import {
    BuilderProvider,
    Canvas,
    Inspector,
    LayersPanel,
    Palette,
    UndoRedoButtons,
    type BuilderDocument,
} from "@matthiaskrijgsman/mat-builder";
import { emailBlocks, EmailPreview } from "@matthiaskrijgsman/mat-builder/email";
import { TabButtons } from "@matthiaskrijgsman/mat-ui";
import Link from "next/link";
import { useState } from "react";

/*
 * The email builder (docs/06): the ./email preset + preview mode.
 * Edit shows the canvas (editRender); Preview shows the real react-email
 * output in an iframe at desktop/mobile widths.
 */

const initialDocument: BuilderDocument = {
    version: 1,
    rootId: "root",
    blocks: {
        root: {
            id: "root",
            type: "email-root",
            props: {
                backgroundColor: "#f4f4f5",
                contentBackground: "#ffffff",
                contentWidth: 600,
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                previewText: "Your July invoice is ready",
            },
            children: { main: ["intro", "cta"] },
        },
        intro: {
            id: "intro",
            type: "section",
            props: { backgroundColor: "transparent", padding: 24, borderRadius: 0 },
            children: { content: ["intro-title", "intro-copy"] },
        },
        "intro-title": {
            id: "intro-title",
            type: "text",
            props: { text: "Your invoice is ready", align: "left", fontSize: 20, color: "#18181b" },
            children: {},
        },
        "intro-copy": {
            id: "intro-copy",
            type: "text",
            props: {
                text: "Hi there — your invoice for July is attached. You can view and download it any time from your dashboard.",
                align: "left",
                fontSize: 14,
                color: "#3f3f46",
            },
            children: {},
        },
        cta: {
            id: "cta",
            type: "section",
            props: { backgroundColor: "#fafafa", padding: 24, borderRadius: 8 },
            children: { content: ["cta-button"] },
        },
        "cta-button": {
            id: "cta-button",
            type: "button",
            props: {
                label: "View invoice",
                href: "https://example.com/invoice",
                backgroundColor: "#18181b",
                color: "#ffffff",
                borderRadius: 6,
                align: "center",
                fullWidth: false,
            },
            children: {},
        },
    },
};

export default function EmailBuilderPage() {
    return (
        <BuilderProvider blocks={emailBlocks} defaultValue={initialDocument}>
            <div className="flex h-screen flex-col">
                <Topbar />
                <MainArea />
            </div>
        </BuilderProvider>
    );
}

function Topbar() {
    return (
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
            <h1 className="text-sm font-semibold">Email builder</h1>
            <Link href="/" className="text-xs text-gray-400 hover:underline">
                ← kitchen sink
            </Link>
            <div className="ml-auto">
                <UndoRedoButtons />
            </div>
        </header>
    );
}

function MainArea() {
    const [mode, setMode] = useState<"edit" | "desktop" | "mobile">("edit");

    return (
        <div className="flex min-h-0 flex-1">
            <aside className="flex w-60 flex-col divide-y divide-gray-200 border-r border-gray-200 bg-white">
                <Palette className="min-h-0 flex-1 overflow-y-auto" />
                <LayersPanel className="h-2/5 shrink-0" />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-center border-b border-gray-200 bg-white px-4 py-1.5">
                    <TabButtons
                        size="sm"
                        tabs={(["edit", "desktop", "mobile"] as const).map((value) => ({
                            label: { edit: "Edit", desktop: "Desktop", mobile: "Mobile" }[value],
                            active: mode === value,
                            onClick: () => setMode(value),
                        }))}
                    />
                </div>
                {mode === "edit" ? (
                    <Canvas className="min-h-0 flex-1" artboardWidth={640} />
                ) : (
                    <EmailPreview className="min-h-0 flex-1" width={mode === "desktop" ? 600 : 375} />
                )}
            </div>
            <Inspector className="w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-white" />
        </div>
    );
}
