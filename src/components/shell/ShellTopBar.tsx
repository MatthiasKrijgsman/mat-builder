import { Button } from "@matthiaskrijgsman/mat-ui";
import { useContext, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { SaveController } from "../../react/save.ts";
import { UndoRedoButtons } from "../toolbar/Toolbar.tsx";
import { dockedPanel } from "./chrome.ts";
import { ShellContext } from "./context.ts";
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
 *
 * The bar is a fixed sequence of named slots (docs/04 §Top bar):
 *
 *     identity · leading ··············· actions · undoRedo · save · trailing
 *
 * Each slot renders its default when omitted, nothing when `false`/`null`,
 * and whatever node a host passes otherwise — so a host adds a button,
 * swaps the Save button for its own Publish flow, or drops undo/redo
 * without touching the rest. A host that needs a different order brings its
 * own bar (`<BuilderShell topBar>`), built from the same exports plus
 * `useShellSave()`.
 */

export interface ShellTopBarSlots {
    /** The app chip + breadcrumb built from `title`/`icon`/`documentName` */
    identity?: ReactNode;
    /** Left side, after the identity — empty by default */
    leading?: ReactNode;
    /** Right side, before undo/redo — the `actions` prop is shorthand for this */
    actions?: ReactNode;
    undoRedo?: ReactNode;
    /** The status line + Save button (`SaveControls`, shown when saving is enabled) */
    save?: ReactNode;
    /** Far right, after the save controls — empty by default */
    trailing?: ReactNode;
}

export interface ShellTopBarProps {
    /** App name — the fixed first breadcrumb segment */
    title?: ReactNode;
    /** Tile icon left of the title (a Tabler icon, or any icon component) */
    icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
    /** The open document's name — the trailing breadcrumb segment */
    documentName?: ReactNode;
    /** Host controls, placed left of undo/redo (mode tabs, "Send test", …) —
     * the same thing as `slots.actions` */
    actions?: ReactNode;
    /** The save controller the default save slot renders. Inside a shell it
     * is read from context when omitted; omit it outside one (or pass a
     * disabled controller) to hide the save UI */
    save?: SaveController;
    saveLabels?: Partial<ShellSaveLabels>;
    /** Per-slot overrides — omit a slot for its default, `false` to hide it,
     * a node to replace it */
    slots?: ShellTopBarSlots;
    className?: string;
}

/** A slot's content: the default when the host said nothing, else exactly
 * what the host passed (including `false`/`null`, which render nothing). */
const slot = (value: ReactNode | undefined, fallback: () => ReactNode): ReactNode =>
    value === undefined ? fallback() : value;

export function ShellTopBar(props: ShellTopBarProps) {
    const { title, icon, documentName, actions, save: saveProp, saveLabels, slots = {}, className } = props;
    const shell = useContext(ShellContext);
    const save = saveProp ?? shell?.save;

    return (
        <header
            // mat-builder-compact-controls: the bar's controls are mat-ui
            // controls like the inspector's, and opt into the same compact sm
            // scale so they match the panels rather than sitting a size larger
            // with a rounder corner
            className={`mat-builder-topbar mat-ui mat-builder-compact-controls mat:z-30 mat:flex mat:shrink-0 mat:items-center mat:gap-3 mat:border-b mat:py-3 mat:pl-4 mat:pr-3 ${className ?? ""}`}
            style={dockedPanel}
        >
            {slot(slots.identity, () =>
                icon || title || documentName ? <Identity icon={icon} title={title} documentName={documentName} /> : null,
            )}
            {slots.leading}
            <div className="mat:ml-auto mat:flex mat:shrink-0 mat:items-center mat:gap-3">
                {slot(slots.actions, () => actions)}
                {slot(slots.undoRedo, () => <UndoRedoButtons />)}
                {slot(slots.save, () => (save?.enabled ? <SaveControls save={save} labels={saveLabels} /> : null))}
                {slots.trailing}
            </div>
        </header>
    );
}

/** The app chip and the app / document breadcrumb — the default `identity` slot. */
function Identity({
    icon: Icon,
    title,
    documentName,
}: Pick<ShellTopBarProps, "icon" | "title" | "documentName">) {
    return (
        // min-w-0 all the way down so a long document name truncates
        // instead of shoving the trailing controls off the bar
        <div className="mat:flex mat:min-w-0 mat:items-center mat:gap-3">
            {Icon && (
                <span
                    aria-hidden
                    className="mat:flex mat:size-7 mat:shrink-0 mat:items-center mat:justify-center mat:rounded-(--border-radius-menu-item)"
                    style={{ backgroundColor: "var(--mat-builder-color-selection)" }}
                >
                    <Icon className="mat:size-4" style={{ color: "var(--mat-builder-color-chrome-tag-fg)" }} />
                </span>
            )}
            {/* Tighter gap than the chip's: the two segments read as one
                path, the chip as a separate object */}
            <div className="mat:flex mat:min-w-0 mat:items-center mat:gap-2">
                {title && <h1 className="mat:shrink-0 mat:font-semibold">{title}</h1>}
                {title && documentName && (
                    <span aria-hidden className="mat:shrink-0" style={{ color: "var(--mat-builder-color-panel-border)" }}>
                        /
                    </span>
                )}
                {documentName && (
                    <p className="mat:truncate" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                        {documentName}
                    </p>
                )}
            </div>
        </div>
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
        <div className="mat:flex mat:items-center mat:gap-3">
            {status && (
                <span
                    // aria-live so a background autosave announces itself; the
                    // button is the only affordance a keyboard user needs.
                    aria-live="polite"
                    className="mat:whitespace-nowrap mat:text-sm"
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
