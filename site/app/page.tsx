"use client";

import {
    BuilderProvider,
    Canvas,
    canDropAt,
    findAncestors,
    Inspector,
    useBuilderState,
    useEditor,
    type BuilderDocument,
} from "@matthiaskrijgsman/mat-builder";
import { Button, ButtonIconSquare } from "@matthiaskrijgsman/mat-ui";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { playgroundBlocks } from "./blocks";

/*
 * Kitchen-sink builder (build order phase 2): provider + canvas + inspector,
 * with a minimal topbar (undo/redo) and click-to-add strip standing in for
 * the phase-3 Palette.
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
                    <AddBlockStrip />
                    <Canvas className="flex-1" artboardWidth={640} />
                    <Inspector className="w-80 overflow-y-auto border-l border-gray-200 bg-white" />
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

/** Click-to-add stand-in for the phase-3 Palette: inserts into the nearest accepting container. */
function AddBlockStrip() {
    const editor = useEditor();
    const document = useBuilderState((s) => s.document);

    const addBlock = (type: string) => {
        const candidates = editor.selectedId
            ? [editor.selectedId, ...findAncestors(document, editor.selectedId)]
            : [document.rootId];
        for (const parentId of candidates) {
            const node = document.blocks[parentId];
            const definition = node && editor.registry.getDefinition(node.type);
            for (const container of definition?.containers ?? []) {
                const at = { parentId, container: container.name, index: (node.children[container.name] ?? []).length };
                if (canDropAt(document, editor.registry, type, at)) {
                    editor.insertBlock(type, at);
                    return;
                }
            }
        }
    };

    return (
        <aside className="flex w-52 flex-col gap-2 border-r border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-400">Add block</p>
            {playgroundBlocks
                .filter((definition) => !definition.hidden)
                .map((definition) => (
                    <Button
                        key={definition.type}
                        variant="secondary"
                        size="sm"
                        Icon={definition.icon as never}
                        onClick={() => addBlock(definition.type)}
                    >
                        {definition.label}
                    </Button>
                ))}
            <p className="mt-auto text-[11px] leading-snug text-gray-400">
                Inserts into the selection&rsquo;s nearest accepting container. Drag and drop lands in phase 3.
            </p>
        </aside>
    );
}
