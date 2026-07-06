import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { FloatingToolbarShell } from "@matthiaskrijgsman/mat-ui";
import type { BlockId } from "../../core/types.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { focusCanvas } from "./focus.ts";

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
}

const singleLine = (text: string): string => text.replace(/\s*[\r\n]+\s*/g, " ");

export function InlineText({ id, field = "text", value, onChange, style, className, toolbar }: InlineTextProps) {
    const actions = useBuilderState((s) => s.actions);
    const isEditing = useBuilderState((s) => s.editing?.blockId === id && s.editing.field === field);
    const ref = useRef<HTMLSpanElement>(null);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const exit = useCallback(() => {
        actions.stopEditing();
        focusCanvas(ref.current);
    }, [actions]);

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
            {toolbar && (
                <FloatingToolbarShell anchor={anchor} open matchAnchorWidth={false}>
                    {toolbar}
                </FloatingToolbarShell>
            )}
        </>
    );
}
