import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";
import { IconLink } from "@tabler/icons-react";
import { Button, DropdownMenu, LexicalToolbarButton, useDropdownDismiss, useLexicalToolbar } from "@matthiaskrijgsman/mat-ui";
import { useState, type FormEvent } from "react";
import { useLabels } from "../../react/hooks.ts";
import { MergeTagTextField } from "../fields/MergeTagTextField.tsx";

/*
 * The inline rich-text toolbar's link control. Replaces mat-ui's default
 * link button, which asks for the URL through `window.prompt`: no merge
 * tags, and no way to edit a link's URL without removing it first. This
 * opens a panel with a URL field whose merge-tag menu splices tokens in
 * (`{{unsubscribe_url}}`, `https://…?ref={{user_id}}`), prefilled with the
 * link under the caret. The URL is stored as typed; the output applies the
 * scheme allow-list to it like every other href (safeUrl), and tokens pass
 * as relative URLs for the ESP to fill in.
 */

interface LinkState {
    url: string;
    isLink: boolean;
    /** Nothing selected and not inside a link: there is no text to link */
    collapsed: boolean;
}

function readLinkState(editor: LexicalEditor): LinkState {
    return editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return { url: "", isLink: false, collapsed: true };
        const node = selection.anchor.getNode();
        const link = $isLinkNode(node) ? node : $findMatchingParent(node, $isLinkNode);
        return { url: link?.getURL() ?? "", isLink: Boolean(link), collapsed: selection.isCollapsed() && !link };
    });
}

function LinkPanel() {
    const [editor] = useLexicalComposerContext();
    const { dismiss } = useDropdownDismiss();
    const t = useLabels().link;
    // Mounted each time the menu opens, so this reads the current selection
    const [initial] = useState(() => readLinkState(editor));
    const [url, setUrl] = useState(initial.url);

    const close = () => {
        dismiss();
        editor.focus();
    };
    const apply = (event?: FormEvent) => {
        event?.preventDefault();
        const trimmed = url.trim();
        // The editor state keeps its selection while focus sits in this panel
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed === "" ? null : trimmed);
        close();
    };
    const remove = () => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        close();
    };

    if (initial.collapsed) return <p className="mat:p-3 mat:text-xs">{t.selectFirst}</p>;
    return (
        <form className="mat:flex mat:flex-col mat:gap-3 mat:p-3" onSubmit={apply}>
            <MergeTagTextField label={t.url} placeholder={t.placeholder} value={url} onChange={setUrl} autoFocus />
            <div className="mat:flex mat:justify-end mat:gap-2">
                {initial.isLink && (
                    <Button type="button" size="sm" variant="white" onClick={remove}>
                        {t.remove}
                    </Button>
                )}
                <Button type="submit" size="sm" variant="primary">
                    {t.apply}
                </Button>
            </div>
        </form>
    );
}

export function LinkItem() {
    const { state, tone } = useLexicalToolbar();
    const t = useLabels().link;
    return (
        <DropdownMenu
            placement="bottom-start"
            minWidth={300}
            trigger={
                <LexicalToolbarButton Icon={IconLink} tone={tone} active={state.isLink} title={t.button} aria-label={t.button} />
            }
        >
            <LinkPanel />
        </DropdownMenu>
    );
}
