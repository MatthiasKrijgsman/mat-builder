"use client";

import {
    BuilderProvider,
    Canvas,
    Inspector,
    LayersPanel,
    Palette,
    useEditor,
    type BuilderDocument,
} from "@matthiaskrijgsman/mat-builder";
import { ButtonIconSquare } from "@matthiaskrijgsman/mat-ui";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { playgroundBlocks } from "./blocks";

/*
 * Kitchen-sink builder: provider + palette + canvas + inspector + layers.
 * Palette items drag onto the canvas (or click to add); blocks reorder and
 * reparent by dragging on the canvas or in the layers tree.
 */

const initialDocument: BuilderDocument = {
    version: 1,
    rootId: "root",
    blocks: {
        root: {
            id: "root",
            type: "page-root",
            props: { backgroundColor: "#ffffff", padding: 24 },
            children: { main: ["hero", "features"] },
        },
        hero: {
            id: "hero",
            type: "section",
            props: { backgroundColor: "#eff6ff", padding: 24 },
            children: { body: ["hero-heading", "hero-text", "hero-cta"] },
        },
        "hero-heading": {
            id: "hero-heading",
            type: "heading",
            props: { text: "Build anything", level: "1", align: "center" },
            children: {},
        },
        "hero-text": {
            id: "hero-text",
            type: "text",
            props: { text: "A headless drag-and-drop block builder for React.", muted: true },
            children: {},
        },
        "hero-cta": {
            id: "hero-cta",
            type: "button",
            props: { label: "Get started", href: "https://example.com", color: "#3b82f6" },
            children: {},
        },
        features: {
            id: "features",
            type: "section",
            props: { backgroundColor: "#fafafa", padding: 16 },
            children: { body: ["cols"] },
        },
        cols: {
            id: "cols",
            type: "columns",
            props: { gap: 16, ratio: "50/50" },
            children: { left: ["feature-left"], right: ["feature-right"] },
        },
        "feature-left": {
            id: "feature-left",
            type: "text",
            props: { text: "Left column feature copy.", muted: false },
            children: {},
        },
        "feature-right": {
            id: "feature-right",
            type: "text",
            props: { text: "Right column feature copy.", muted: false },
            children: {},
        },
    },
};

export default function PlaygroundPage() {
    return (
        <BuilderProvider blocks={playgroundBlocks} defaultValue={initialDocument}>
            <div className="flex h-screen flex-col">
                <Topbar />
                <div className="flex min-h-0 flex-1">
                    <aside className="flex w-60 flex-col divide-y divide-gray-200 border-r border-gray-200 bg-white">
                        <Palette className="min-h-0 flex-1 overflow-y-auto" />
                        <LayersPanel className="h-2/5 shrink-0" />
                    </aside>
                    <Canvas className="min-w-0 flex-1" artboardWidth={640} />
                    <Inspector className="w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-white" />
                </div>
            </div>
        </BuilderProvider>
    );
}

function Topbar() {
    const { undo, redo, canUndo, canRedo } = useEditor();
    return (
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
            <h1 className="text-sm font-semibold">mat-builder playground</h1>
            <span className="text-xs text-gray-400">v{process.env.NEXT_PUBLIC_LIB_VERSION}</span>
            <div className="ml-auto flex items-center gap-1">
                <ButtonIconSquare
                    Icon={IconArrowBackUp}
                    variant="tertiary"
                    size="sm"
                    aria-label="Undo"
                    disabled={!canUndo}
                    onClick={undo}
                />
                <ButtonIconSquare
                    Icon={IconArrowForwardUp}
                    variant="tertiary"
                    size="sm"
                    aria-label="Redo"
                    disabled={!canRedo}
                    onClick={redo}
                />
            </div>
        </header>
    );
}

