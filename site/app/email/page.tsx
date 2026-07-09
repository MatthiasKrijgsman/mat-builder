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
    richTextMergeTagNode,
    richTextParagraph,
    symmetricSides,
    SYSTEM_FONT_STACK,
    UndoRedoButtons,
    uniformSides,
    type BuilderDocument,
    type MergeTag,
} from "@matthiaskrijgsman/mat-builder";
import { emailBlocks, EmailPreview } from "@matthiaskrijgsman/mat-builder/email";
import { TabButtons } from "@matthiaskrijgsman/mat-ui";
import Link from "next/link";
import { useState } from "react";
import { dottedSurface, floatingPanel, transparentSurface } from "../floating-chrome";

/*
 * The email builder (docs/06): the ./email preset + preview mode.
 * Edit shows the canvas (editRender); Preview shows the real react-email
 * output in an iframe at desktop/mobile widths.
 */

/** Consumer-provided personalization tokens (docs/06 §merge tags) — the
 * Mailchimp-style entry proves the library assumes no delimiter syntax. */
const mergeTags: MergeTag[] = [
    { token: "{{first_name}}", label: "First name" },
    { token: "{{last_name}}", label: "Last name" },
    { token: "{{invoice_url}}", label: "Invoice URL" },
    { token: "*|COMPANY|*", label: "Company" },
];

const textNode = (text: string) => ({ type: "text", version: 1, detail: 0, format: 0, mode: "normal", style: "", text });

/** Intro copy with merge-tag chips baked in, so the feature shows on load. */
const introCopyContent = JSON.stringify({
    root: {
        type: "root",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        children: [
            {
                type: "paragraph",
                version: 1,
                direction: null,
                format: "",
                indent: 0,
                children: [
                    textNode("Hi "),
                    richTextMergeTagNode("{{first_name}}", "First name"),
                    textNode(" — your "),
                    richTextMergeTagNode("*|COMPANY|*", "Company"),
                    textNode(" invoice for July is attached. You can view and download it any time from your dashboard."),
                ],
            },
        ],
    },
});

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
                // Per-range typography lives inside the content (docs/06)
                content: richTextParagraph("Your invoice is ready", "font-size: 20px;color: #18181b"),
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },
        "intro-copy": {
            id: "intro-copy",
            type: "text",
            props: {
                content: introCopyContent,
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
                href: "{{invoice_url}}",
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

type Mode = "edit" | "preview";

export default function EmailBuilderPage() {
    const [mode, setMode] = useState<Mode>("edit");

    return (
        <BuilderProvider blocks={emailBlocks} defaultValue={initialDocument} mergeTags={mergeTags}>
            {/* One continuous dotted surface; the bottom bar and panels float over it */}
            <div className="relative h-screen" style={dottedSurface}>
                <MainArea mode={mode} />
                <BottomBar mode={mode} onModeChange={setMode} />
            </div>
        </BuilderProvider>
    );
}

/** Floating app bar at the bottom, between the two side panels — offset from
 * the panels by the same 16px the panels keep from the window edge. */
function BottomBar({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
    return (
        <header className={`absolute bottom-4 left-[calc(400px+2rem)] right-[calc(400px+2rem)] z-30 flex items-center gap-3 px-4 py-2 ${floatingPanel}`}>
            <h1 className="text-sm font-semibold">Email builder</h1>
            <Link href="/" className="text-xs text-gray-400 hover:underline">
                ← kitchen sink
            </Link>
            <div className="ml-auto flex items-center gap-3">
                <TabButtons
                    size="sm"
                    tabs={(["edit", "preview"] as const).map((value) => ({
                        label: value === "edit" ? "Edit" : "Preview",
                        active: mode === value,
                        onClick: () => onModeChange(value),
                    }))}
                />
                <UndoRedoButtons />
            </div>
        </header>
    );
}

function MainArea({ mode }: { mode: Mode }) {
    return (
        <div className="absolute inset-0">
            {/* Wrapper, not className: the Artboard root is position:relative itself.
                transparentSurface lets the root's dot layer show through, so there
                is no phase seam where the canvas meets the app background */}
            <div
                className="absolute inset-y-0 left-[416px] right-[416px]"
                style={transparentSurface}
            >
                {mode === "edit" ? (
                    <Canvas className="h-full" artboardWidth={640} />
                ) : (
                    <EmailPreview className="h-full" initialWidth={640} />
                )}
            </div>
            <aside className="pointer-events-none absolute inset-y-4 left-4 z-30 flex w-[400px] flex-col gap-4">
                <Palette className={`pointer-events-auto min-h-0 flex-1 ${floatingPanel}`} />
                <LayersPanel className={`pointer-events-auto h-2/5 shrink-0 ${floatingPanel}`} />
            </aside>
            <Inspector className={`absolute inset-y-4 right-4 z-30 w-[400px] ${floatingPanel}`} />
        </div>
    );
}
