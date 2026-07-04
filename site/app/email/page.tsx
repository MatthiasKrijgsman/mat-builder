"use client";

import {
    BuilderProvider,
    Canvas,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    defaultSpacing,
    defaultTypography,
    Inspector,
    LayersPanel,
    Palette,
    symmetricSides,
    SYSTEM_FONT_STACK,
    UndoRedoButtons,
    uniformSides,
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

/** Neutral section style-group values — spread and override per section. */
const sectionBase = {
    size: { ...defaultSize, width: "full" as const },
    background: defaultBackground,
    border: defaultBorder,
    spacing: { padding: uniformSides(24), margin: uniformSides(0) },
    effects: defaultEffects,
    layout: defaultLayout,
};

const initialDocument: BuilderDocument = {
    version: 1,
    rootId: "root",
    blocks: {
        root: {
            id: "root",
            type: "email-root",
            props: {
                backgroundColor: "#f4f4f5",
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                contentWidth: 600,
                spacing: { padding: symmetricSides(24, 12), margin: uniformSides(0) },
                typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK },
                previewText: "Your July invoice is ready",
            },
            children: { main: ["intro", "cta"] },
        },
        intro: {
            id: "intro",
            type: "section",
            props: { ...sectionBase },
            children: { content: ["intro-title", "intro-copy"] },
        },
        "intro-title": {
            id: "intro-title",
            type: "text",
            props: {
                text: "Your invoice is ready",
                typography: { ...defaultTypography, fontSize: 20, color: "#18181b" },
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },
        "intro-copy": {
            id: "intro-copy",
            type: "text",
            props: {
                text: "Hi there — your invoice for July is attached. You can view and download it any time from your dashboard.",
                typography: defaultTypography,
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },
        cta: {
            id: "cta",
            type: "section",
            props: {
                ...sectionBase,
                background: { ...defaultBackground, type: "solid", color: "#fafafa" },
                border: { ...defaultBorder, radius: 8 },
            },
            children: { content: ["cta-button"] },
        },
        "cta-button": {
            id: "cta-button",
            type: "button",
            props: {
                label: "View invoice",
                href: "https://example.com/invoice",
                size: defaultSize,
                background: { ...defaultBackground, type: "solid", color: "#18181b" },
                border: { ...defaultBorder, radius: 6 },
                typography: { ...defaultTypography, color: "#ffffff", align: "center" },
                spacing: { padding: symmetricSides(12, 20), margin: uniformSides(0) },
                layout: { ...defaultLayout, horizontal: "center" },
                effects: defaultEffects,
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
    const [mode, setMode] = useState<"edit" | "preview">("edit");

    return (
        <div className="flex min-h-0 flex-1">
            <aside className="flex w-[400px] shrink-0 flex-col divide-y divide-gray-200 border-r border-gray-200 bg-white">
                <Palette className="min-h-0 flex-1 overflow-y-auto" />
                <LayersPanel className="h-2/5 shrink-0" />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-center border-b border-gray-200 bg-white px-4 py-1.5">
                    <TabButtons
                        size="sm"
                        tabs={(["edit", "preview"] as const).map((value) => ({
                            label: value === "edit" ? "Edit" : "Preview",
                            active: mode === value,
                            onClick: () => setMode(value),
                        }))}
                    />
                </div>
                {mode === "edit" ? (
                    <Canvas className="min-h-0 flex-1" artboardWidth={640} />
                ) : (
                    <EmailPreview className="min-h-0 flex-1" initialWidth={640} />
                )}
            </div>
            <Inspector className="w-[400px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white" />
        </div>
    );
}
