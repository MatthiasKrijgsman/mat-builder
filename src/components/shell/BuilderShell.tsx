import { useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { createDocument, createRegistry, type AnyBlockDefinition } from "../../core/index.ts";
import type { BlockId, BuilderDocument } from "../../core/types.ts";
import type { MergeTag } from "../../react/merge-tags.ts";
import { BuilderProvider } from "../../react/provider.tsx";
import { useDocumentSave, type SaveController, type UseDocumentSaveOptions } from "../../react/save.ts";
import { Canvas } from "../canvas/Canvas.tsx";
import { Inspector } from "../inspector/Inspector.tsx";
import { LayersPanel } from "../layers/LayersPanel.tsx";
import { Palette } from "../palette/Palette.tsx";
import { dockedPanel, dottedSurface, transparentSurface } from "./chrome.ts";
import type { ShellSaveLabels } from "./labels.ts";
import { ShellTopBar } from "./ShellTopBar.tsx";

/*
 * <BuilderShell> — the batteries-included editor (docs/04 §Shell): provider,
 * docked layout, panels, undo/redo and saving in one component, so a host
 * mounts a working builder with a document and a save handler.
 *
 * Block-set agnostic on purpose — the email builder is `<EmailBuilder>` in
 * the ./email entry, which is this component plus the preset, preview mode
 * and the Edit/Preview toggle. Everything here is still assembled from the
 * individually exported components; a host wanting a different layout drops
 * to <BuilderProvider> and keeps all of them (docs/03 §5).
 */

export interface BuilderShellPanels {
    palette?: boolean;
    layers?: boolean;
    inspector?: boolean;
}

export interface BuilderShellProps extends UseDocumentSaveOptions {
    /** The block definitions this builder can edit — fixed for the instance's lifetime */
    blocks: AnyBlockDefinition[];
    /** Controlled document (pass the value back from onChange) … */
    value?: BuilderDocument;
    /** … or an initial document for uncontrolled usage */
    defaultValue?: BuilderDocument;
    /** With neither `value` nor `defaultValue`, the shell starts a blank
     * document from this root block type (its `onCreate` seeds the contents) */
    rootType?: string;
    /** Called after every committed command — for hosts mirroring the
     * document elsewhere. Saving does not need it (see `onSave`). */
    onChange?: (document: BuilderDocument) => void;
    onSelectionChange?: (id: BlockId | null) => void;
    /** Personalization tokens available in text surfaces; pass a stable array */
    mergeTags?: MergeTag[];

    /* ── Chrome ─────────────────────────────────────────────────────── */
    /** App name — the fixed first breadcrumb segment in the top bar */
    title?: ReactNode;
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    /** The open document's name — the trailing breadcrumb segment */
    documentName?: ReactNode;
    /** Host controls in the top bar, left of undo/redo */
    actions?: ReactNode;
    /** Replace the built-in top bar, or pass `false` to drop it (a host that
     * brings its own header still gets the panels and canvas) */
    topBar?: ReactNode | false;
    saveLabels?: Partial<ShellSaveLabels>;
    /** Which side panels to dock; all shown by default */
    panels?: BuilderShellPanels;
    /** The editing surface — defaults to a `<Canvas>` filling the work area */
    canvas?: ReactNode;
    /** The right-hand panel — defaults to `<Inspector>`. Swapped by surfaces
     * where a block inspector makes no sense (`<EmailBuilder>` shows the
     * preview's merge-tag data sheet here instead). */
    inspector?: ReactNode;
    /** The shell fills its container: give it (or an ancestor) a height */
    className?: string;
    style?: CSSProperties;
}

export function BuilderShell(props: BuilderShellProps) {
    const {
        blocks,
        value,
        defaultValue,
        rootType,
        onChange,
        onSelectionChange,
        mergeTags,
        onSave,
        autoSaveMs,
        onError,
        warnOnUnload,
        saveShortcut,
        title,
        icon,
        documentName,
        actions,
        topBar,
        saveLabels,
        panels,
        canvas,
        inspector,
        className,
        style,
    } = props;

    // Mount-time only, like the provider's own document handling: a blank
    // document is created once, never re-created on re-render.
    const [initialDocument] = useState<BuilderDocument | undefined>(() => {
        if (value ?? defaultValue) return undefined;
        if (!rootType) {
            throw new Error("BuilderShell requires a `value`, a `defaultValue`, or a `rootType` to start a blank document");
        }
        return createDocument(createRegistry(blocks), rootType);
    });

    const save = useDocumentSave({ onSave, autoSaveMs, onError, warnOnUnload, saveShortcut });

    const handleChange = (document: BuilderDocument) => {
        save.onDocumentChange(document);
        onChange?.(document);
    };

    return (
        <BuilderProvider
            blocks={blocks}
            value={value}
            defaultValue={defaultValue ?? initialDocument}
            onChange={handleChange}
            onSelectionChange={onSelectionChange}
            mergeTags={mergeTags}
        >
            <BuilderShellLayout
                save={save}
                title={title}
                icon={icon}
                documentName={documentName}
                actions={actions}
                topBar={topBar}
                saveLabels={saveLabels}
                panels={panels}
                canvas={canvas}
                inspector={inspector}
                className={className}
                style={style}
            />
        </BuilderProvider>
    );
}

/** Hairline between two panels stacked in the same docked column */
const DIVIDED_PANEL: CSSProperties = {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderColor: "var(--mat-builder-color-panel-border)",
};

interface BuilderShellLayoutProps {
    save: SaveController;
    title?: ReactNode;
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    documentName?: ReactNode;
    actions?: ReactNode;
    topBar?: ReactNode | false;
    saveLabels?: Partial<ShellSaveLabels>;
    panels?: BuilderShellPanels;
    canvas?: ReactNode;
    inspector?: ReactNode;
    className?: string;
    style?: CSSProperties;
}

/** The docked layout: one continuous dotted surface with the top bar and
 * panels floating over it. Separate component so it renders inside the
 * provider (the panels are all context consumers). */
function BuilderShellLayout(props: BuilderShellLayoutProps) {
    const { save, title, icon, documentName, actions, topBar, saveLabels, panels, canvas, inspector, className, style } = props;
    const showPalette = panels?.palette ?? true;
    const showLayers = panels?.layers ?? true;
    const showInspector = panels?.inspector ?? true;
    const showLeftColumn = showPalette || showLayers;
    const sidebar = "var(--mat-builder-sidebar-width)";

    return (
        <div className={`mat-builder-shell relative h-full ${className ?? ""}`} style={{ ...dottedSurface, ...style }}>
            <div className="absolute inset-0 flex flex-col">
                {topBar === false ? null : topBar !== undefined ? (
                    topBar
                ) : (
                    <ShellTopBar
                        title={title}
                        icon={icon}
                        documentName={documentName}
                        actions={actions}
                        save={save}
                        saveLabels={saveLabels}
                    />
                )}
                {/* Work area below the bar: canvas column between the docked panels */}
                <div className="relative min-h-0 flex-1">
                    {/* Canvas column. A wrapper, not a className on the surface:
                        the Artboard root is position:relative itself.
                        transparentSurface lets the root's dot layer show
                        through, so there is no phase seam where the canvas
                        meets the app background. */}
                    <div
                        className="absolute inset-y-0"
                        style={{
                            ...transparentSurface,
                            left: showLeftColumn ? sidebar : 0,
                            right: showInspector ? sidebar : 0,
                        }}
                    >
                        {canvas ?? <Canvas className="h-full" artboardWidth="fill" artboardHeight="fill" />}
                    </div>
                    {/* The panels are wrapped rather than styled directly: the
                        docked surface (background + border color) is shell
                        chrome, and the panel components take only a className. */}
                    {showLeftColumn && (
                        <aside
                            className="absolute inset-y-0 left-0 z-30 flex w-(--mat-builder-sidebar-width) flex-col border-r"
                            style={dockedPanel}
                        >
                            {showPalette && <Palette className="min-h-0 flex-1" />}
                            {showLayers && (
                                <div
                                    className="flex min-h-0 flex-1 flex-col"
                                    style={showPalette ? DIVIDED_PANEL : undefined}
                                >
                                    <LayersPanel className="min-h-0 flex-1" />
                                </div>
                            )}
                        </aside>
                    )}
                    {showInspector && (
                        <div
                            className="absolute inset-y-0 right-0 z-30 w-(--mat-builder-sidebar-width) border-l"
                            style={dockedPanel}
                        >
                            {inspector ?? <Inspector className="h-full" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
