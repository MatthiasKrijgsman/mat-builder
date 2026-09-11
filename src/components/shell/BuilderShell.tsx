import { Component, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ErrorInfo, type ReactNode, type RefObject } from "react";
import { createDocument, createRegistry, type AnyBlockDefinition } from "../../core/index.ts";
import type { BlockId, BlockPattern, BuilderDocument } from "../../core/types.ts";
import type { BuilderFeatures } from "../../react/features.ts";
import { formatLabel, resolveLabels, type BuilderLabelOverrides } from "../../react/labels.ts";
import { useLabels } from "../../react/hooks.ts";
import type { MergeTag } from "../../react/merge-tags.ts";
import { BuilderProvider, type BuilderProviderProps } from "../../react/provider.tsx";
import { colorSchemeAttr, themeToStyle, type BuilderColorScheme, type BuilderTheme } from "../../react/theme.ts";
import { useDocumentSave, type SaveController, type UseDocumentSaveOptions } from "../../react/save.ts";
import { Canvas } from "../canvas/Canvas.tsx";
import { Inspector } from "../inspector/Inspector.tsx";
import { LayersPanel } from "../layers/LayersPanel.tsx";
import { Palette } from "../palette/Palette.tsx";
import { dockedPanel, dottedSurface, transparentSurface } from "./chrome.ts";
import { ShellContext, type ShellContextValue } from "./context.ts";
import type { ShellSaveLabels } from "./labels.ts";
import { ShellTopBar, type ShellTopBarSlots } from "./ShellTopBar.tsx";

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
    /** The loaded document needed repairs — see `BuilderProviderProps` */
    onDocumentIssues?: BuilderProviderProps["onDocumentIssues"];
    /** A block's editRender/inspector threw — see `BuilderProviderProps` */
    onBlockError?: BuilderProviderProps["onBlockError"];
    /**
     * Something outside a single block threw — a document that could not be
     * loaded at all, or a panel crashing. The shell replaces itself with a
     * message instead of taking the host page down; this is where the host
     * reports it.
     */
    onRenderError?: (error: unknown, info: { componentStack?: string }) => void;
    /** Personalization tokens available in text surfaces; pass a stable array */
    mergeTags?: MergeTag[];
    /** Palette entries that expand into ordinary blocks on insert (docs/08 §7);
     * pass a stable array */
    patterns?: BlockPattern[];
    /** Editor feature switches, all on by default — see `BuilderFeatures`.
     * `{ visibility: false }` hides the conditional-visibility UI. */
    features?: BuilderFeatures;
    /** UI strings — any subset of `DEFAULT_LABELS`, deep-merged over the
     * English (docs/07 §B3). Pass a stable object. */
    labels?: BuilderLabelOverrides;

    /* ── Chrome ─────────────────────────────────────────────────────── */
    /** App name — the fixed first breadcrumb segment in the top bar */
    title?: ReactNode;
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    /** The open document's name — the trailing breadcrumb segment */
    documentName?: ReactNode;
    /** Host controls in the top bar, left of undo/redo (shorthand for
     * `topBarSlots.actions`) */
    actions?: ReactNode;
    /** Add to, replace or hide parts of the built-in top bar — see
     * `ShellTopBarSlots` (docs/04 §Top bar). Ignored when `topBar` is set. */
    topBarSlots?: ShellTopBarSlots;
    /** Replace the built-in top bar, or pass `false` to drop it (a host that
     * brings its own header still gets the panels and canvas). A replacement
     * bar rendered here can use `useShellSave()`, `<UndoRedoButtons>` and
     * `<SaveControls>` to keep the built-in wiring. */
    topBar?: ReactNode | false;
    saveLabels?: Partial<ShellSaveLabels>;
    /** Which side panels to dock; all shown by default */
    panels?: BuilderShellPanels;
    /** Slide the left column (palette + layers) out to the left and give the
     * canvas its width. The panels stay mounted — tree expansion, scroll and
     * palette search survive the round trip (`<EmailBuilder>` collapses it in
     * preview mode). */
    collapseLeftPanel?: boolean;
    /** The editing surface — defaults to a `<Canvas>` filling the work area */
    canvas?: ReactNode;
    /** The right-hand panel — defaults to `<Inspector>`. Swapped by surfaces
     * where a block inspector makes no sense (`<EmailBuilder>` shows the
     * preview's merge-tag data sheet here instead). */
    inspector?: ReactNode;
    /** The shell fills its container: give it (or an ancestor) a height */
    className?: string;
    style?: CSSProperties;
    /**
     * The narrowest width (px) the three-panel layout is usable at. Below it
     * the shell shows `smallScreenNotice` over the editor instead of a
     * squeezed layout. Measured on the shell's own box, not the viewport, so
     * an embedded editor is judged by the space it actually has. `0` disables
     * the guard.
     */
    minWidth?: number;
    /** What to show below `minWidth`; defaults to a short English notice */
    smallScreenNotice?: ReactNode;
    /**
     * Per-instance token overrides — keys are `--mat-builder-*` names without
     * the prefix (docs/guides/theming.md). For a fixed look a stylesheet rule
     * is simpler; use this when the values come from data, or when two
     * builders on one page need to differ.
     */
    theme?: BuilderTheme;
    /**
     * Colour scheme for this instance. Defaults to `"inherit"`, which follows
     * a `.dark` ancestor; `"light"`/`"dark"` pin it regardless of the page.
     */
    colorScheme?: BuilderColorScheme;
}

export function BuilderShell(props: BuilderShellProps) {
    const {
        blocks,
        value,
        defaultValue,
        rootType,
        onChange,
        onSelectionChange,
        onDocumentIssues,
        onBlockError,
        onRenderError,
        mergeTags,
        patterns,
        features,
        labels,
        onSave,
        autoSaveMs,
        onError,
        warnOnUnload,
        saveShortcut,
        title,
        icon,
        documentName,
        actions,
        topBarSlots,
        topBar,
        saveLabels,
        panels,
        collapseLeftPanel,
        canvas,
        inspector,
        className,
        style,
        minWidth,
        smallScreenNotice,
        theme,
        colorScheme,
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
    // Shared with everything inside the shell — slot content, a replacement
    // bar, a custom inspector — through useShellSave() (context.ts)
    const shellContext = useMemo<ShellContextValue>(() => ({ save }), [save]);

    const handleChange = (document: BuilderDocument) => {
        save.onDocumentChange(document);
        onChange?.(document);
    };

    return (
        <ShellErrorBoundary onError={onRenderError} className={className} style={style} message={resolveLabels(labels).shell.editorFailed}>
            <BuilderProvider
                blocks={blocks}
                value={value}
                defaultValue={defaultValue ?? initialDocument}
                onChange={handleChange}
                onSelectionChange={onSelectionChange}
                mergeTags={mergeTags}
                patterns={patterns}
                features={features}
                labels={labels}
                onDocumentIssues={onDocumentIssues}
                onBlockError={onBlockError}
            >
                <ShellContext.Provider value={shellContext}>
                    <BuilderShellLayout
                        save={save}
                        title={title}
                        icon={icon}
                        documentName={documentName}
                        actions={actions}
                        topBarSlots={topBarSlots}
                        topBar={topBar}
                        saveLabels={saveLabels}
                        panels={panels}
                        collapseLeftPanel={collapseLeftPanel}
                        canvas={canvas}
                        inspector={inspector}
                        className={className}
                        style={style}
                        minWidth={minWidth}
                        smallScreenNotice={smallScreenNotice}
                        theme={theme}
                        colorScheme={colorScheme}
                    />
                </ShellContext.Provider>
            </BuilderProvider>
        </ShellErrorBoundary>
    );
}

interface ShellErrorBoundaryProps {
    onError?: (error: unknown, info: { componentStack?: string }) => void;
    /** The heading of the fallback — resolved outside the provider, which the boundary wraps */
    message: string;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}

/**
 * The shell's own boundary: a document that refuses to load (the provider
 * throws for a missing root) or a panel crashing shows a message in the
 * shell's box instead of unmounting the host's page. Per-block failures
 * never reach this — BlockErrorBoundary catches those on the canvas and in
 * the inspector.
 */
class ShellErrorBoundary extends Component<ShellErrorBoundaryProps, { error: unknown; failed: boolean }> {
    state = { error: null as unknown, failed: false };

    static getDerivedStateFromError(error: unknown) {
        return { error, failed: true };
    }

    componentDidCatch(error: unknown, info: ErrorInfo): void {
        this.props.onError?.(error, { componentStack: info.componentStack ?? undefined });
    }

    render(): ReactNode {
        if (!this.state.failed) return this.props.children;
        const { error } = this.state;
        const message = error instanceof Error ? error.message : String(error);
        return (
            <div
                className={`mat-builder-shell mat-ui mat:relative mat:h-full ${this.props.className ?? ""}`}
                style={{ ...dottedSurface, ...this.props.style }}
            >
                <div className="mat:absolute mat:inset-0 mat:grid mat:place-items-center mat:p-6">
                    <div
                        role="alert"
                        className="mat:max-w-lg mat:rounded-lg mat:border mat:p-4 mat:text-sm"
                        style={{ ...dockedPanel, color: "var(--mat-builder-color-panel-fg)" }}
                    >
                        <div className="mat:font-semibold">{this.props.message}</div>
                        <pre
                            className="mat:mt-2 mat:whitespace-pre-wrap mat:break-words mat:text-xs"
                            style={{ color: "var(--mat-builder-color-missing-fg)" }}
                        >
                            {message}
                        </pre>
                    </div>
                </div>
            </div>
        );
    }
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
    topBarSlots?: ShellTopBarSlots;
    topBar?: ReactNode | false;
    saveLabels?: Partial<ShellSaveLabels>;
    panels?: BuilderShellPanels;
    collapseLeftPanel?: boolean;
    canvas?: ReactNode;
    inspector?: ReactNode;
    className?: string;
    style?: CSSProperties;
    minWidth?: number;
    smallScreenNotice?: ReactNode;
    theme?: BuilderTheme;
    colorScheme?: BuilderColorScheme;
}

/** Below this many px of shell width the panels leave no room for a canvas */
const DEFAULT_MIN_WIDTH = 768;

/**
 * Whether the shell's box is narrower than `minWidth`. Starts false — the
 * first paint (and a server render) shows the editor, and the observer
 * corrects it before the user can act.
 */
function useTooNarrow(root: RefObject<HTMLDivElement | null>, minWidth: number): boolean {
    const [tooNarrow, setTooNarrow] = useState(false);
    useEffect(() => {
        const element = root.current;
        if (!element || minWidth <= 0 || typeof ResizeObserver === "undefined") {
            setTooNarrow(false);
            return;
        }
        const check = () => setTooNarrow(element.getBoundingClientRect().width < minWidth);
        check();
        const observer = new ResizeObserver(check);
        observer.observe(element);
        return () => observer.disconnect();
    }, [root, minWidth]);
    return tooNarrow;
}

/** The docked layout: one continuous dotted surface with the top bar and
 * panels floating over it. Separate component so it renders inside the
 * provider (the panels are all context consumers). */
function BuilderShellLayout(props: BuilderShellLayoutProps) {
    const {
        save, title, icon, documentName, actions, topBarSlots, topBar, saveLabels, panels, collapseLeftPanel,
        canvas, inspector, className, style, minWidth = DEFAULT_MIN_WIDTH, smallScreenNotice, theme, colorScheme,
    } = props;
    const rootRef = useRef<HTMLDivElement>(null);
    const tooNarrow = useTooNarrow(rootRef, minWidth);
    const t = useLabels();
    const showPalette = panels?.palette ?? true;
    const showLayers = panels?.layers ?? true;
    const showInspector = panels?.inspector ?? true;
    const showLeftColumn = showPalette || showLayers;
    // Rendered but slid away: the column keeps its state, the canvas takes the space
    const leftDocked = showLeftColumn && !collapseLeftPanel;
    const sidebar = "var(--mat-builder-sidebar-width)";
    // A CSS transition, not motion: `left` and `transform` both animate from a
    // token-valued length, and the two stay in step without measuring the var.
    const slide = (property: string) =>
        `${property} var(--mat-builder-duration-panel-slide) var(--mat-builder-ease-panel-slide)`;

    return (
        <div
            ref={rootRef}
            className={`mat-builder-shell mat-ui mat:relative mat:h-full ${className ?? ""}`}
            data-mat-builder-color-scheme={colorSchemeAttr(colorScheme)}
            // Theme first, so an explicit `style` stays the last word.
            style={{ ...dottedSurface, ...themeToStyle(theme), ...style }}
        >
            {/* Too narrow: the notice covers the editor, which stays mounted
                (nothing is lost by resizing) but leaves the tab order and the
                accessibility tree until there is room for it again. */}
            {tooNarrow && (
                <div role="status" className="mat:absolute mat:inset-0 mat:z-40 mat:grid mat:place-items-center mat:p-6" style={dottedSurface}>
                    <div
                        className="mat-builder-small-screen-notice mat:max-w-sm mat:rounded-lg mat:border mat:p-4 mat:text-sm"
                        style={{ ...dockedPanel, color: "var(--mat-builder-color-panel-fg)" }}
                    >
                        {smallScreenNotice ?? (
                            <>
                                <div className="mat:font-semibold">{t.shell.needsRoomTitle}</div>
                                <p className="mat:mt-1" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                                    {formatLabel(t.shell.needsRoom, { minWidth })}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
            <div
                className="mat:absolute mat:inset-0 mat:flex mat:flex-col"
                inert={tooNarrow || undefined}
                aria-hidden={tooNarrow || undefined}
            >
                {topBar === false ? null : topBar !== undefined ? (
                    topBar
                ) : (
                    <ShellTopBar
                        title={title}
                        icon={icon}
                        documentName={documentName}
                        actions={actions}
                        slots={topBarSlots}
                        save={save}
                        saveLabels={saveLabels}
                    />
                )}
                {/* Work area below the bar: canvas column between the docked
                    panels. Clipped, so a collapsed column parks off-stage
                    instead of hanging outside the shell. (Panel popovers are
                    portalled to the body and are not affected.) */}
                <div className="mat:relative mat:min-h-0 mat:flex-1 mat:overflow-hidden">
                    {/* Canvas column. A wrapper, not a className on the surface:
                        the Artboard root is position:relative itself.
                        transparentSurface lets the root's dot layer show
                        through, so there is no phase seam where the canvas
                        meets the app background. */}
                    <div
                        className="mat:absolute mat:inset-y-0"
                        style={{
                            ...transparentSurface,
                            left: leftDocked ? sidebar : 0,
                            right: showInspector ? sidebar : 0,
                            transition: slide("left"),
                        }}
                    >
                        {canvas ?? <Canvas className="mat:h-full" artboardWidth="fill" artboardHeight="fill" />}
                    </div>
                    {/* The panels are wrapped rather than styled directly: the
                        docked surface (background + border color) is shell
                        chrome, and the panel components take only a className. */}
                    {showLeftColumn && (
                        <aside
                            className="mat:absolute mat:inset-y-0 mat:left-0 mat:z-30 mat:flex mat:w-(--mat-builder-sidebar-width) mat:flex-col mat:border-r"
                            // Off-stage is also out of the tab order and out of
                            // the accessibility tree — it is not a panel you can
                            // reach, only one that is coming back.
                            inert={leftDocked ? undefined : true}
                            aria-hidden={leftDocked ? undefined : true}
                            style={{
                                ...dockedPanel,
                                transform: leftDocked ? "translateX(0)" : "translateX(-100%)",
                                transition: slide("transform"),
                            }}
                        >
                            {showPalette && <Palette className="mat:min-h-0 mat:flex-1" />}
                            {showLayers && (
                                <div
                                    className="mat:flex mat:min-h-0 mat:flex-1 mat:flex-col"
                                    style={showPalette ? DIVIDED_PANEL : undefined}
                                >
                                    <LayersPanel className="mat:min-h-0 mat:flex-1" />
                                </div>
                            )}
                        </aside>
                    )}
                    {showInspector && (
                        <div
                            className="mat:absolute mat:inset-y-0 mat:right-0 mat:z-30 mat:w-(--mat-builder-sidebar-width) mat:border-l"
                            style={dockedPanel}
                        >
                            {inspector ?? <Inspector className="mat:h-full" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
