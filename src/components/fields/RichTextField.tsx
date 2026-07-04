import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { InputLexical } from "@matthiaskrijgsman/mat-ui";
import { $getRoot, $isParagraphNode } from "lexical";
import { useEffect, useMemo, useRef } from "react";

/*
 * RichTextField — mat-ui's Lexical editor speaking MARKDOWN outward.
 *
 * InputLexical's own value/onChange use serialized editor-state JSON, so we
 * leave those unset and instead mount plugins inside the editor (InputLexical
 * renders children within its composer) that load external markdown, emit
 * markdown on every edit, and enable **bold**-style typing shortcuts. Blocks
 * store markdown in their props and render it (e.g. via react-email's
 * <Markdown>) — see docs/06.
 */

/*
 * Blank paragraphs (the user pressing Enter twice) are not representable in
 * standard markdown — Lexical serializes them as bare extra newlines, which
 * every markdown renderer (and Lexical's own re-import) collapses. So the
 * stored markdown encodes each blank paragraph as an `&nbsp;` paragraph
 * (renders as a visible empty line) and the editor decodes those back to
 * real blank paragraphs on load.
 *
 * Lexical's newline-delimited export shape: k blank paragraphs BETWEEN two
 * text blocks serialize as (2+k) consecutive newlines; k blanks at the start
 * or end serialize as k boundary newlines.
 */
const BLANK_PARAGRAPH = "&nbsp;";

function encodeBlankParagraphs(markdown: string): string {
    return markdown
        .replace(/\n{3,}(?=[^\n])/g, (run) => "\n\n" + `${BLANK_PARAGRAPH}\n\n`.repeat(run.length - 2))
        .replace(/^\n+/, (run) => `${BLANK_PARAGRAPH}\n\n`.repeat(run.length))
        .replace(/\n+$/, (run) => `\n\n${BLANK_PARAGRAPH}`.repeat(run.length));
}

/** Markdown → editor state, restoring encoded blank paragraphs. Call inside editor.update(). */
function $importMarkdown(markdown: string, transformers: typeof TRANSFORMERS): void {
    $convertFromMarkdownString(markdown, transformers);
    for (const node of $getRoot().getChildren()) {
        if ($isParagraphNode(node) && node.getTextContent() === BLANK_PARAGRAPH) node.clear();
    }
}

export interface RichTextFieldProps {
    label?: string;
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    description?: string;
}

export function RichTextField({ value, onChange, ...rest }: RichTextFieldProps) {
    return (
        <InputLexical size="sm" minRows={4} autogrow toolbar="floating" {...rest}>
            <MarkdownPlugins value={value} onChange={onChange} />
        </InputLexical>
    );
}

function MarkdownPlugins({ value, onChange }: { value: string | undefined; onChange: (value: string) => void }) {
    const [editor] = useLexicalComposerContext();
    const lastEmitted = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Only transformers whose node dependencies the host editor registers —
    // the stock set includes e.g. code blocks (CodeNode), which mat-ui's
    // editor doesn't register and which would throw at registration.
    const transformers = useMemo(
        () =>
            TRANSFORMERS.filter((transformer) => {
                const dependencies = "dependencies" in transformer ? transformer.dependencies : undefined;
                return !dependencies || dependencies.every((node) => editor.hasNode(node));
            }),
        [editor],
    );

    // External markdown → editor (initial mount, undo/redo, external replaces).
    // While the editor has focus the USER is the source of truth: prop echoes
    // can lag several keystrokes behind, and reloading from them would drop
    // input — so mid-edit prop changes are ignored entirely.
    useEffect(() => {
        if (value === undefined) return;
        const root = editor.getRootElement();
        if (root && root.contains(root.ownerDocument.activeElement)) return;
        const current = editor
            .getEditorState()
            .read(() => encodeBlankParagraphs($convertToMarkdownString(transformers)));
        if (current === value) return;
        editor.update(() => $importMarkdown(value, transformers));
    }, [editor, value, transformers]);

    // Editor edits → markdown out (the store coalesces history, so typing stays one undo step)
    useEffect(
        () =>
            editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
                if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
                editorState.read(() => {
                    const markdown = encodeBlankParagraphs($convertToMarkdownString(transformers));
                    if (markdown === lastEmitted.current) return;
                    lastEmitted.current = markdown;
                    onChangeRef.current(markdown);
                });
            }),
        [editor, transformers],
    );

    // Live **bold** / [link](…) conversion while typing
    return <MarkdownShortcutPlugin transformers={transformers} />;
}
