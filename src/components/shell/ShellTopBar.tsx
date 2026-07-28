import { Button } from "@matthiaskrijgsman/mat-ui";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SaveController } from "../../react/save.ts";
import { UndoRedoButtons } from "../toolbar/Toolbar.tsx";
import { dockedPanel } from "./chrome.ts";
import { DEFAULT_SAVE_LABELS, type ShellSaveLabels } from "./labels.ts";

/*
 * The shell's app bar (docs/04 §Shell) — docked full-width above the side
 * panels and canvas, in flow so the artboard fits (and resize-clamps) below
 * it rather than expanding underneath.
 *
 * Left side is the doc-aware identity: an app chip (accent tile + app icon),
 * the app name, then the open document's name behind a slash — a breadcrumb,
 * so the app name stays fixed and only the trailing segment changes per
 * document. Geometry mirrors the inspector's block header (`pl-4` to line the
 * chip up with the panel icons below it, semibold label at the inherited
 * size) so the bar reads as the same chrome.
 */

export interface ShellTopBarProps {
    /** App name — the fixed first breadcrumb segment */
    title?: ReactNode;
    /** Tile icon left of the title (a Tabler icon, or any icon component) */
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    /** The open document's name — the trailing breadcrumb segment */
    documentName?: ReactNode;
    /** Host controls, placed left of undo/redo (mode tabs, "Send test", …) */
    actions?: ReactNode;
    /** Omit, or pass a disabled controller, to hide the save UI */
    save?: SaveController;
    saveLabels?: Partial<ShellSaveLabels>;
    className?: string;
}

export function ShellTopBar(props: ShellTopBarProps) {
    const { title, icon: Icon, documentName, actions, save, saveLabels, className } = props;
    const hasIdentity = Boolean(Icon || title || documentName);

    return (
        <header
            // mat-builder-compact-controls: the bar's controls are mat-ui
            // controls like the inspector's, and opt into the same compact sm
            // scale so they match the panels rather than sitting a size larger
            // with a rounder corner
            className={`mat-builder-topbar mat-builder-compact-controls z-30 flex shrink-0 items-center gap-3 border-b py-3 pl-4 pr-3 ${className ?? ""}`}
            style={dockedPanel}
        >
            {/* min-w-0 all the way down so a long document name truncates
                instead of shoving the trailing controls off the bar */}
            {hasIdentity && (
                <div className="flex min-w-0 items-center gap-3">
                    {Icon && (
                        <span
                            aria-hidden
                            className="flex size-7 shrink-0 items-center justify-center rounded-(--border-radius-menu-item)"
                            style={{ backgroundColor: "var(--mat-builder-color-selection)" }}
                        >
                            <Icon className="size-4" style={{ color: "var(--mat-builder-color-chrome-tag-fg)" }} />
                        </span>
                    )}
                    {/* Tighter gap than the chip's: the two segments read as one
                        path, the chip as a separate object */}
                    <div className="flex min-w-0 items-center gap-2">
                        {title && <h1 className="shrink-0 font-semibold">{title}</h1>}
                        {title && documentName && (
                            <span aria-hidden className="shrink-0" style={{ color: "var(--mat-builder-color-panel-border)" }}>
                                /
                            </span>
                        )}
                        {documentName && (
                            <p className="truncate" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                                {documentName}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-3">
                {actions}
                <UndoRedoButtons />
                {save?.enabled && <SaveControls save={save} labels={saveLabels} />}
            </div>
        </header>
    );
}

/** Save status + button. Exported so a host replacing the bar keeps the
 * wiring (status wording, disabled rules) without reimplementing it. */
export function SaveControls({ save, labels }: { save: SaveController; labels?: Partial<ShellSaveLabels> }) {
    const text = { ...DEFAULT_SAVE_LABELS, ...labels };
    const status =
        save.status === "saving"
            ? text.saving
            : save.status === "error"
              ? text.failed
              : save.status === "dirty"
                ? text.unsaved
                : save.status === "saved"
                  ? text.saved
                  : null;

    return (
        <div className="flex items-center gap-3">
            {status && (
                <span
                    // aria-live so a background autosave announces itself; the
                    // button is the only affordance a keyboard user needs.
                    aria-live="polite"
                    className="whitespace-nowrap text-sm"
                    style={{
                        color:
                            save.status === "error"
                                ? "var(--mat-builder-color-missing-fg)"
                                : "var(--mat-builder-color-panel-muted-fg)",
                    }}
                >
                    {status}
                </span>
            )}
            <Button
                size="sm"
                variant="primary"
                loading={save.saving}
                // Nothing pending is nothing to save. A failed save leaves its
                // edits pending, so the button stays live as the retry.
                disabled={save.saving || !save.dirty}
                onClick={() => void save.save()}
            >
                {text.save}
            </Button>
        </div>
    );
}
