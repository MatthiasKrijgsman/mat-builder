import { IconAlignCenter, IconAlignLeft, IconAlignRight } from "@tabler/icons-react";
import {
    LexicalToolbarButton,
    LexicalToolbarColor,
    LexicalToolbarDivider,
    LexicalToolbarNumber,
    LexicalToolbarSelect,
    useLexicalToolbar,
} from "@matthiaskrijgsman/mat-ui";
import { defaultTypography, EMAIL_FONT_STACKS, type TypographyValue } from "../../style-props/index.ts";
import { useLabels } from "../../react/hooks.ts";

/*
 * Block-level typography controls for inline toolbars: the same seven fields
 * as the inspector's TypographyGroup, editing one TypographyValue prop (used
 * where the text is uniform — e.g. a Button label — instead of per-selection
 * styles). Pure controlled; no Lexical involved, so it also works inside a
 * bare FloatingToolbarShell.
 */

export interface BlockTypographyItemsProps {
    value: TypographyValue | undefined;
    onChange: (value: TypographyValue) => void;
}

const FONT_OPTIONS = EMAIL_FONT_STACKS.map(({ name, stack }) => ({ value: stack, label: name }));

function AlignButtons({ value, onChange }: { value: TypographyValue["align"]; onChange: (align: TypographyValue["align"]) => void }) {
    const { tone } = useLexicalToolbar();
    const t = useLabels();
    return (
        <>
            <LexicalToolbarButton Icon={IconAlignLeft} tone={tone} active={value === "left"} aria-label={t.typography.alignLeft} onClick={() => onChange("left")} />
            <LexicalToolbarButton Icon={IconAlignCenter} tone={tone} active={value === "center"} aria-label={t.typography.alignCenter} onClick={() => onChange("center")} />
            <LexicalToolbarButton Icon={IconAlignRight} tone={tone} active={value === "right"} aria-label={t.typography.alignRight} onClick={() => onChange("right")} />
        </>
    );
}

/** A component (it reads the labels), wrapped below in the item-factory shape the toolbars take. */
function BlockTypographyItems({ value, onChange }: BlockTypographyItemsProps) {
    const t = useLabels();
    const current = value ?? defaultTypography;
    const patch = (partial: Partial<TypographyValue>) => onChange({ ...current, ...partial });

    return (
        <>
            <LexicalToolbarSelect
                title={t.typography.fontFamily}
                options={FONT_OPTIONS}
                value={current.fontFamily || null}
                onChange={(stack) => patch({ fontFamily: stack ?? "" })}
                placeholder={t.typography.font}
                clearable
                minWidth={200}
            />
            <LexicalToolbarNumber title={t.typography.fontSize} prefix="Aa" value={current.fontSize} onChange={(fontSize) => patch({ fontSize })} min={8} max={96} />
            <LexicalToolbarNumber title={t.typography.lineHeight} prefix="Lh" value={current.lineHeight} onChange={(lineHeight) => patch({ lineHeight })} min={0.5} max={3} step={0.1} />
            <LexicalToolbarNumber title={t.typography.letterSpacing} prefix="Ls" value={current.letterSpacing} onChange={(letterSpacing) => patch({ letterSpacing })} min={-2} max={10} step={0.5} />
            <LexicalToolbarColor title={t.typography.textColor} value={current.color} onChange={(color) => patch({ color })} />
            <LexicalToolbarNumber title={t.typography.textOpacity} prefix="%" value={current.opacity} onChange={(opacity) => patch({ opacity })} min={0} max={100} step={5} />
            <LexicalToolbarDivider />
            <AlignButtons value={current.align} onChange={(align) => patch({ align })} />
        </>
    );
}

/** Flat fragment of toolbar building blocks (pass as FloatingToolbarShell children). */
export const blockTypographyItems = (props: BlockTypographyItemsProps) => <BlockTypographyItems {...props} />;
