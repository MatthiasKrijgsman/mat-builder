import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { FloatingToolbarShell } from "@matthiaskrijgsman/mat-ui";
import type { BlockId } from "../../core/types.ts";
import { useBuilderState, useMergeTags } from "../../react/hooks.ts";
import { MergeTagPlainItem } from "./MergeTagItems.tsx";
import { focusCanvas } from "./focus.ts";
import { useSelectionDrag } from "./use-selection-drag.ts";

/*
 * Inline-editable plain text (single line) for block edit renders — the
 * lightweight sibling of InlineRichText for labels (docs/04): a Button's
 * caption, a nav item, anything where rich formatting makes no sense.
 *
 * The editing span is an UNCONTROLLED contentEditable: its text is written
 * once when the session starts and then owned by the DOM — re-renders from
 * the onChange round-trip must not touch it or the caret would jump. Enter
 * commits, Escape exits, paste is stripped to plain single-line text. There
 * is deliberately no blur-exit: toolbar fields legitimately take focus.
 */

export interface InlineTextProps {
    /** The owning block (usually editRender's `id`). */
    id: BlockId;
    /** The prop being edited; distinguishes multiple text areas per block. */
    field?: string;
    value: string;
    onChange: (value: string) => void;
    style?: CSSProperties;
    className?: string;
    /** Toolbar items pinned above the text while editing (flat fragment of
     * mat-ui toolbar building blocks, e.g. blockTypographyItems(...)). */
    toolbar?: ReactNode;
    /** Extra building blocks on a second toolbar row — e.g. block-level
     * controls like vertical align. */
    toolbarSecondRow?: ReactNode;
}

const singleLine = (text: string): string => text.replace(/\s*[\r\n]+\s*/g, " ");

export function InlineText({ id, field = "text", value, onChange, style, className, toolbar, toolbarSecondRow }: InlineTextProps) {
    const actions = useBuilderState((s) => s.actions);
    const isEditing = useBuilderState((s) => s.editing?.blockId === id && s.editing.field === field);
    const hasMergeTags = useMergeTags().length > 0;
    const ref = useRef<HTMLSpanElement>(null);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    // The bar sits right where a selection sweep happens — hide it mid-drag
    const selecting = useSelectionDrag(ref, isEditing);

    const exit = useCallback(() => {
        actions.stopEditing();
        focusCanvas(ref.current);
    }, [actions]);

    // Last caret/selection inside the editable — clicking the merge-tag menu
    // (a portal) moves DOM focus away, so the insert restores this range.
    const savedRange = useRef<Range | null>(null);
    useEffect(() => {
        if (!isEditing) {
            savedRange.current = null;
            return;
        }
        const save = () => {
            const selection = window.getSelection();
            const element = ref.current;
            if (!selection || selection.rangeCount === 0 || !element) return;
            const range = selection.getRangeAt(0);
            if (element.contains(range.commonAncestorContainer)) {
                savedRange.current = range.cloneRange();
            }
        };
        document.addEventListener("selectionchange", save);
        return () => document.removeEventListener("selectionchange", save);
    }, [isEditing]);

    const insertToken = useCallback((token: string) => {
        const element = ref.current;
        if (!element) return;
        element.focus();
        const selection = window.getSelection();
        if (selection) {
            const range = savedRange.current ?? document.createRange();
            if (!savedRange.current) {
                range.selectNodeContents(element);
                range.collapse(false); // never focused → append at the end
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }
        // Same pattern as the paste handler: keeps native undo, fires onInput.
        document.execCommand("insertText", false, token);
    }, []);

    // Session start: seed the DOM text once, focus, select everything.
    useLayoutEffect(() => {
        if (!isEditing) return;
        const element = ref.current;
        if (!element) return;
        element.textContent = value;
        element.focus();
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        // `value` is intentionally only read when the session starts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    if (!isEditing) {
        return (
            <span
                ref={ref}
                style={style}
                className={className}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    actions.startEditing(id, field);
                }}
            >
                {value}
            </span>
        );
    }

    return (
        <>
            <span
                ref={(element) => {
                    ref.current = element;
                    setAnchor(element);
                }}
                style={{ ...style, outline: "none" }}
                className={className}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onInput={(event) => onChange(singleLine(event.currentTarget.textContent ?? ""))}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        exit();
                    } else if (event.key === "Escape") {
                        event.preventDefault();
                        exit();
                    }
                }}
                onPaste={(event) => {
                    event.preventDefault();
                    const text = singleLine(event.clipboardData.getData("text/plain"));
                    // execCommand keeps native undo + fires onInput — still the
                    // only selection-aware plain-text insert without a full editor
                    document.execCommand("insertText", false, text);
                }}
                onClick={(event) => event.stopPropagation()}
            />
            {(toolbar || hasMergeTags) && anchor && (
                // Content-sized (a label is far narrower than its toolbar);
                // needs mat-ui >= 0.0.60, where overflow-collapse measures
                // content-sized bars correctly.
                <FloatingToolbarShell anchor={anchor} open={!selecting} matchAnchorWidth={false} secondRow={toolbarSecondRow}>
                    {toolbar}
                    <MergeTagPlainItem onInsert={insertToken} divider={Boolean(toolbar)} />
                </FloatingToolbarShell>
            )}
        </>
    );
}
