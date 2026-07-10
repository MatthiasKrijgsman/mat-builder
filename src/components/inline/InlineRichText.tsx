import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { SelectionAlwaysOnDisplay } from "@lexical/react/LexicalSelectionAlwaysOnDisplay";
import { COMMAND_PRIORITY_HIGH, KEY_ESCAPE_COMMAND } from "lexical";
import {
    lexicalDefaultToolbarItems,
    LexicalFloatingToolbar,
    LexicalInline,
    LexicalToolbarDivider,
} from "@matthiaskrijgsman/mat-ui";
import type { BlockId } from "../../core/types.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { RichText } from "../../email/rich-text/index.ts";
import type { RichMergeTagNode } from "../../email/rich-text/index.ts";
import { selectionTypographyItems } from "./SelectionTypographyItems.tsx";
import { LineHeightPlugin } from "./LineHeightPlugin.tsx";
import { MergeTagChip, MergeTagNode } from "./MergeTagNode.tsx";
import { mergeTagItems } from "./MergeTagItems.tsx";
import { focusCanvas } from "./focus.ts";

/*
 * Inline-editable rich text for block edit renders (docs/04, docs/06).
 *
 * Idle: the value renders through the SAME pure serializer as the email
 * output — what you see on the canvas IS the export. Double-click starts an
 * editing session (store.editing); the serialized markup swaps for a Lexical
 * surface with the floating toolbar pinned on top. Every keystroke commits
 * through onChange (history-coalesced by the store); the session's editor is
 * the source of truth until the session ends, so `value` is only read when
 * editing starts.
 *
 * A block can host several of these — `field` scopes the session to one prop.
 */

export interface InlineRichTextProps {
    /** The owning block (usually editRender's `id`). */
    id: BlockId;
    /** The prop being edited; distinguishes multiple text areas per block. */
    field?: string;
    /** Stored rich text (serialized Lexical JSON). */
    value: string;
    onChange: (value: string) => void;
    /** Container styles (the block's spacing/effects) — applied in both modes. */
    style?: CSSProperties;
    className?: string;
    placeholder?: string;
    /** Extra toolbar building blocks appended (after a divider) to the
     * toolbar's second row — e.g. block-level controls like vertical align. */
    toolbarExtra?: ReactNode;
}

/** Theme class map for the editing surface. The classes live in src/style.css
 * and mirror rich-text/styles.ts exactly (canvas/edit-mode pixel parity). */
const richTextTheme = {
    paragraph: "mat-builder-rt-p",
    heading: {
        h1: "mat-builder-rt-h1",
        h2: "mat-builder-rt-h2",
        h3: "mat-builder-rt-h3",
        h4: "mat-builder-rt-h4",
        h5: "mat-builder-rt-h5",
        h6: "mat-builder-rt-h6",
    },
    quote: "mat-builder-rt-quote",
    list: {
        ul: "mat-builder-rt-ul",
        ol: "mat-builder-rt-ol",
        listitem: "mat-builder-rt-li",
        nested: {
            listitem: "mat-builder-rt-li-nested",
        },
    },
    link: "mat-builder-rt-link",
    text: {
        bold: "mat-builder-rt-bold",
        italic: "mat-builder-rt-italic",
        underline: "mat-builder-rt-underline",
        strikethrough: "mat-builder-rt-strike",
        underlineStrikethrough: "mat-builder-rt-underline-strike",
        code: "mat-builder-rt-code",
    },
};

/** Escape ends the editing session (handled here, not the builder keyboard —
 * focus is inside a contentEditable, where builder shortcuts are inert). */
function ExitOnEscapePlugin({ onExit }: { onExit: () => void }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerCommand(
            KEY_ESCAPE_COMMAND,
            () => {
                onExit();
                return true;
            },
            COMMAND_PRIORITY_HIGH,
        );
    }, [editor, onExit]);
    return null;
}

// Row one: insertion actions live next to the link button; the merge-tag
// menu hides itself (divider included) when the provider has no tags.
const renderToolbar = () => (
    <>
        {lexicalDefaultToolbarItems()}
        {mergeTagItems()}
    </>
);

/** Chip render for the idle canvas — same class as the editing decorator, so
 * entering/leaving edit mode never shifts layout (docs/06). The email output
 * takes the default path and emits the literal token instead. */
const renderMergeTag = (node: RichMergeTagNode) => <MergeTagChip label={node.label ?? node.token} />;

/** Always registered — documents containing merge tags must keep loading
 * even when the host no longer passes `mergeTags` (only the insert UI is
 * conditional). */
const EXTRA_NODES = [MergeTagNode];

export function InlineRichText({ id, field = "content", value, onChange, style, className, placeholder, toolbarExtra }: InlineRichTextProps) {
    const actions = useBuilderState((s) => s.actions);
    const isEditing = useBuilderState((s) => s.editing?.blockId === id && s.editing.field === field);
    const containerRef = useRef<HTMLDivElement>(null);

    const exit = useCallback(() => {
        actions.stopEditing();
        focusCanvas(containerRef.current);
    }, [actions]);

    // Second row: the typography controls (font/size/color/…) plus any
    // block-level extras — kept out of row one so nothing collapses into "⋮".
    const renderSecondRow = useCallback(
        () => (
            <>
                {selectionTypographyItems()}
                {toolbarExtra && (
                    <>
                        <LexicalToolbarDivider />
                        {toolbarExtra}
                    </>
                )}
            </>
        ),
        [toolbarExtra],
    );

    if (!isEditing) {
        return (
            <div
                ref={containerRef}
                style={style}
                className={className}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault(); // no native word-selection flash under the editor
                    actions.startEditing(id, field);
                }}
            >
                <RichText content={value} renderMergeTag={renderMergeTag} />
            </div>
        );
    }

    return (
        <div ref={containerRef} style={style} className={className}>
            <LexicalInline
                value={value || undefined}
                onChange={onChange}
                namespace="mat-builder-inline"
                nodes={EXTRA_NODES}
                theme={richTextTheme}
                placeholder={placeholder}
                autoFocus
            >
                {/* Keeps the selection highlight painted while focus moves to a
                    toolbar input (font size etc.) — the editor state retains the
                    selection, but the browser drops the visual highlight the
                    moment another element takes focus, which reads as "my
                    selection was lost". */}
                <SelectionAlwaysOnDisplay />
                <LineHeightPlugin />
                <ExitOnEscapePlugin onExit={exit} />
                <LexicalFloatingToolbar open render={renderToolbar} renderSecondRow={renderSecondRow} />
            </LexicalInline>
        </div>
    );
}
