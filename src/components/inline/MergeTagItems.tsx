import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, $insertNodes } from "lexical";
import { IconBraces } from "@tabler/icons-react";
import { DropdownButton, DropdownMenu, LexicalToolbarButton, LexicalToolbarDivider, useLexicalToolbar } from "@matthiaskrijgsman/mat-ui";
import type { MergeTag } from "../../react/merge-tags.ts";
import { useMergeTags } from "../../react/hooks.ts";
import { $createMergeTagNode } from "./MergeTagNode.tsx";

/*
 * Merge-tag insert menus for the inline editing toolbars (docs/06 §merge
 * tags). Both variants render nothing when the provider has no tags — the
 * feature is invisible unless the host configures it. Same fragment pattern
 * as selectionTypographyItems: each item is its own component so the
 * toolbar's overflow-collapse measures it.
 */

function MergeTagMenu({ onInsert, divider = true }: { onInsert: (tag: MergeTag) => void; divider?: boolean }) {
    const tags = useMergeTags();
    const { tone } = useLexicalToolbar();
    if (tags.length === 0) return null;
    return (
        <>
            {divider && <LexicalToolbarDivider />}
            <DropdownMenu
                placement="bottom-start"
                trigger={<LexicalToolbarButton Icon={IconBraces} tone={tone} title="Insert merge tag" aria-label="Insert merge tag" />}
            >
                {tags.map((tag) => (
                    <DropdownButton key={tag.token} onClick={() => onInsert(tag)}>
                        {tag.label}
                    </DropdownButton>
                ))}
            </DropdownMenu>
        </>
    );
}

/** Rich-text variant: inserts a MergeTagNode chip at the caret (replacing a
 * range selection). Runs through the editor's onChange, so the store's
 * history coalescing applies and undo removes the chip atomically. */
function MergeTagLexicalItem() {
    const [editor] = useLexicalComposerContext();
    return (
        <MergeTagMenu
            onInsert={(tag) => {
                editor.update(
                    () => {
                        // The editor state keeps the last selection while DOM focus
                        // is in the dropdown; null only before any interaction.
                        if ($getSelection() === null) $getRoot().selectEnd();
                        $insertNodes([$createMergeTagNode(tag.token, tag.label)]);
                    },
                    { onUpdate: () => editor.focus() },
                );
            }}
        />
    );
}

/** Flat fragment for Lexical floating toolbars (InlineRichText's row one). */
export const mergeTagItems = () => <MergeTagLexicalItem />;

export interface MergeTagPlainItemProps {
    /** Receives the literal token string; the host inserts it into its text. */
    onInsert: (token: string) => void;
    /** Leading divider — omit when the menu is the toolbar's only item. */
    divider?: boolean;
}

/** Plain-text variant for non-Lexical surfaces (InlineText, e.g. a button
 * label): the menu hands over the raw token and the host splices it in. */
export function MergeTagPlainItem({ onInsert, divider }: MergeTagPlainItemProps) {
    return <MergeTagMenu onInsert={(tag) => onInsert(tag.token)} divider={divider} />;
}
