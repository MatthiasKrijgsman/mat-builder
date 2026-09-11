import { ButtonIconSquare } from "@matthiaskrijgsman/mat-ui";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEditor } from "../../react/hooks.ts";

/*
 * Toolbar — see docs/04 §Toolbar. A convenience assembly of independent,
 * individually exported controls plus a children slot for app-specific
 * actions (Save, Send test email, …). Hosts wanting a different layout
 * build their own from useEditor(). Preview/device-width toggles remain
 * host-side for now — preview state isn't part of the editor store.
 */

export interface ToolbarProps {
    className?: string;
    children?: ReactNode;
}

export function Toolbar({ className, children }: ToolbarProps) {
    return (
        <div className={`mat-builder-toolbar mat-ui mat:flex mat:items-center mat:gap-2 ${className ?? ""}`}>
            <UndoRedoButtons />
            {children}
        </div>
    );
}

export function UndoRedoButtons() {
    const { undo, redo, canUndo, canRedo } = useEditor();
    return (
        <div className="mat:flex mat:items-center mat:gap-1">
            <ButtonIconSquare
                Icon={IconArrowBackUp}
                variant={canUndo ? 'primary' : 'transparent'}
                size="sm"
                aria-label="Undo"
                disabled={!canUndo}
                onClick={undo}
            />
            <ButtonIconSquare
                Icon={IconArrowForwardUp}
                variant={canRedo ? 'primary' : 'transparent'}
                size="sm"
                aria-label="Redo"
                disabled={!canRedo}
                onClick={redo}
            />
        </div>
    );
}
