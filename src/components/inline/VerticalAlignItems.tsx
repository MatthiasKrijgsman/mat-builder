import { IconLayoutAlignBottom, IconLayoutAlignMiddle, IconLayoutAlignTop } from "@tabler/icons-react";
import { LexicalToolbarButton, useLexicalToolbar } from "@matthiaskrijgsman/mat-ui";
import type { VerticalAlign } from "../../style-props/index.ts";

/*
 * Vertical alignment buttons for inline toolbars — block-level (edits the
 * block's layout.vertical, like the inspector's Alignment group), so it works
 * in both the Lexical rich-text toolbar and a bare FloatingToolbarShell.
 * Best-effort in email output: takes effect where the block participates in a
 * table-cell context (e.g. inside a column).
 */

export interface VerticalAlignItemsProps {
    value: VerticalAlign | undefined;
    onChange: (value: VerticalAlign) => void;
}

function VerticalAlignButtons({ value, onChange }: VerticalAlignItemsProps) {
    const { tone } = useLexicalToolbar();
    const current = value ?? "start";
    return (
        <>
            <LexicalToolbarButton Icon={IconLayoutAlignTop} tone={tone} active={current === "start"} aria-label="Align top" onClick={() => onChange("start")} />
            <LexicalToolbarButton Icon={IconLayoutAlignMiddle} tone={tone} active={current === "middle"} aria-label="Align middle" onClick={() => onChange("middle")} />
            <LexicalToolbarButton Icon={IconLayoutAlignBottom} tone={tone} active={current === "end"} aria-label="Align bottom" onClick={() => onChange("end")} />
        </>
    );
}

/** Flat fragment of toolbar building blocks (same pattern as blockTypographyItems). */
export const verticalAlignItems = (props: VerticalAlignItemsProps) => <VerticalAlignButtons {...props} />;
