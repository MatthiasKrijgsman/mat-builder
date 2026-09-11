import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, SKIP_DOM_SELECTION_TAG, type LexicalEditor } from "lexical";
import {
    LexicalAlignButtons,
    LexicalToolbarColor,
    LexicalToolbarDivider,
    LexicalToolbarNumber,
    LexicalToolbarSelect,
    useLexicalSelectionStyle,
    useLexicalToolbar,
} from "@matthiaskrijgsman/mat-ui";
import { defaultTypography, EMAIL_FONT_STACKS, hexToRgba, parseColorToHexOpacity } from "../../style-props/index.ts";
import { useLabels } from "../../react/hooks.ts";
import type { BuilderLabels } from "../../react/labels.ts";
import { $setLineHeightOnSelection, useSelectionLineHeight } from "./LineHeightPlugin.tsx";
import { $patchSelectedMergeTags } from "./MergeTagNode.tsx";

/*
 * Selection-level typography controls for the inline rich text toolbar
 * (docs/06): fontFamily/fontSize/letterSpacing/color(+opacity) patch inline
 * styles on the selected text via $patchStyleText; align is the element
 * format; lineHeight is the paragraph NodeState (LineHeightPlugin).
 *
 * Each control is its own component so the toolbar's overflow-collapse
 * measures them individually (same pattern as lexicalDefaultToolbarItems).
 */

const FONT_OPTIONS = EMAIL_FONT_STACKS.map(({ name, stack }) => ({ value: stack, label: name }));

/** Numeric weights that survive email clients on system/web-safe stacks. */
const fontWeightOptions = (t: BuilderLabels) => [
    { value: "300", label: t.typography.light },
    { value: "400", label: t.typography.regular },
    { value: "500", label: t.typography.medium },
    { value: "600", label: t.typography.semibold },
    { value: "700", label: t.typography.bold },
];

/** First family of a stack, unquoted + lowercased, for loose stack matching. */
const firstFamily = (stack: string): string =>
    (stack.split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "");

/** Display label for an inherited font-family: the matching option's name,
 * or the stack's first family verbatim when it's not one of ours. */
const inheritedFontLabel = (computedFamily: string, t: BuilderLabels): string => {
    const first = firstFamily(computedFamily).toLowerCase();
    const option = FONT_OPTIONS.find((o) => firstFamily(o.value).toLowerCase() === first);
    return option?.label ?? (firstFamily(computedFamily) || t.typography.font);
};

/** Display label for an inherited font-weight ("400" → "Regular"). */
const inheritedWeightLabel = (computedWeight: string, t: BuilderLabels): string => {
    const normalized = computedWeight === "normal" ? "400" : computedWeight === "bold" ? "700" : computedWeight;
    return fontWeightOptions(t).find((o) => o.value === normalized)?.label ?? normalized;
};

interface InheritedTextStyle {
    fontFamily: string;
    fontWeight: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    color: { hex: string; opacity: number };
}

const DEFAULT_INHERITED: InheritedTextStyle = {
    fontFamily: "",
    fontWeight: "400",
    fontSize: defaultTypography.fontSize,
    lineHeight: defaultTypography.lineHeight,
    letterSpacing: defaultTypography.letterSpacing,
    color: { hex: defaultTypography.color, opacity: defaultTypography.opacity },
};

const sameInherited = (a: InheritedTextStyle, b: InheritedTextStyle): boolean =>
    a.fontFamily === b.fontFamily &&
    a.fontWeight === b.fontWeight &&
    a.fontSize === b.fontSize &&
    a.lineHeight === b.lineHeight &&
    a.letterSpacing === b.letterSpacing &&
    a.color.hex === b.color.hex &&
    a.color.opacity === b.color.opacity;

/** Effective INHERITED text style at the caret — when the selection carries
 * no inline style the controls show the values the text actually renders
 * with. Computed at the selection anchor's DOM element (not the editor root)
 * so block-level styles between root and caret — heading font-size/weight
 * and their tighter line-height — are reflected too; the root is only the
 * fallback before any selection exists. Re-read per update: selection moves
 * create new editor states, so the listener fires on caret travel. */
function useInheritedTextStyle(): InheritedTextStyle {
    const [editor] = useLexicalComposerContext();
    const [value, setValue] = useState(DEFAULT_INHERITED);

    useEffect(() => {
        const read = () => {
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                const anchorElement = $isRangeSelection(selection)
                    ? editor.getElementByKey(selection.anchor.getNode().getKey())
                    : null;
                const target = anchorElement ?? editor.getRootElement();
                if (!target) return; // keep defaults until the surface mounts
                const computed = window.getComputedStyle(target);
                const fontSize = Number.parseFloat(computed.fontSize) || defaultTypography.fontSize;
                const lineHeightPx = Number.parseFloat(computed.lineHeight); // NaN for "normal"
                const letterSpacing = Number.parseFloat(computed.letterSpacing) || 0; // "normal" → 0
                const next: InheritedTextStyle = {
                    fontFamily: computed.fontFamily,
                    fontWeight: computed.fontWeight,
                    fontSize,
                    lineHeight: Number.isNaN(lineHeightPx)
                        ? defaultTypography.lineHeight
                        : Math.round((lineHeightPx / fontSize) * 10) / 10,
                    letterSpacing,
                    color: parseColorToHexOpacity(computed.color) ?? DEFAULT_INHERITED.color,
                };
                setValue((prev) => (sameInherited(prev, next) ? prev : next));
            });
        };
        read();
        return editor.registerUpdateListener(() => read());
    }, [editor]);

    return value;
}

function FontFamilyItem() {
    const t = useLabels();
    const { values, patch } = useLexicalSelectionStyle(["font-family"]);
    const inherited = useInheritedTextStyle();
    // No inline style on the selection → show the font the text actually
    // renders with (the inherited one), not a "Font" placeholder.
    const label = inheritedFontLabel(inherited.fontFamily, t);
    return (
        <LexicalToolbarSelect
            title={t.typography.fontFamily}
            options={FONT_OPTIONS}
            value={values["font-family"] || null}
            onChange={(stack) => patch({ "font-family": stack })}
            placeholder={label}
            clearLabel={`Default (${label})`}
            clearable
            minWidth={200}
        />
    );
}

/** Skips pulling DOM selection/focus back into the contentEditable when a
 * toolbar field owns focus — same guard as mat-ui's selection-style patch. */
const focusPreservingTag = (editor: LexicalEditor): { tag: string } | undefined => {
    const root = editor.getRootElement();
    const editorHasFocus = Boolean(root && root.contains(root.ownerDocument.activeElement));
    return editorHasFocus ? undefined : { tag: SKIP_DOM_SELECTION_TAG };
};

/** Full weight scale next to the plain bold toggle — patches font-weight on
 * the selection, kept in sync with the bold format bit: bold shows as 700
 * unless an explicit inline weight overrides it, and choosing a non-bold
 * weight clears the bit (or the lit B button would contradict the text). */
function FontWeightItem() {
    const t = useLabels();
    const [editor] = useLexicalComposerContext();
    const { values, patch } = useLexicalSelectionStyle(["font-weight"]);
    const { state } = useLexicalToolbar();
    const inherited = useInheritedTextStyle();
    const label = inheritedWeightLabel(inherited.fontWeight, t);
    return (
        <LexicalToolbarSelect
            title={t.typography.fontWeight}
            options={fontWeightOptions(t)}
            value={values["font-weight"] || (state.isBold ? "700" : null)}
            onChange={(weight) => {
                patch({ "font-weight": weight });
                if (state.isBold && weight !== "700") {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) selection.formatText("bold");
                    }, focusPreservingTag(editor));
                }
            }}
            placeholder={label}
            clearLabel={`Default (${label})`}
            clearable
            minWidth={160}
        />
    );
}

function FontSizeItem() {
    const t = useLabels();
    const [editor] = useLexicalComposerContext();
    const { values, patch } = useLexicalSelectionStyle(["font-size"]);
    const inherited = useInheritedTextStyle();
    const parsed = Number.parseFloat(values["font-size"]);
    return (
        <LexicalToolbarNumber
            title={t.typography.fontSize}
            prefix="Aa"
            value={Number.isNaN(parsed) ? inherited.fontSize : parsed}
            onChange={(size) => {
                patch({ "font-size": `${size}px` });
                // $patchStyleText (inside patch) only styles TextNodes — merge-tag
                // chips in the selection scale via their own style snapshot.
                editor.update(
                    () => $patchSelectedMergeTags({ "font-size": `${size}px` }),
                    focusPreservingTag(editor),
                );
            }}
            min={8}
            max={96}
        />
    );
}

function LineHeightItem() {
    const t = useLabels();
    const [editor] = useLexicalComposerContext();
    const inherited = useInheritedTextStyle();
    const value = useSelectionLineHeight(editor);
    return (
        <LexicalToolbarNumber
            title={t.typography.lineHeight}
            prefix="Lh"
            value={value ?? inherited.lineHeight}
            onChange={(multiplier) =>
                editor.update(() => $setLineHeightOnSelection(multiplier), focusPreservingTag(editor))
            }
            min={0.5}
            max={3}
            step={0.1}
        />
    );
}

function LetterSpacingItem() {
    const t = useLabels();
    const { values, patch } = useLexicalSelectionStyle(["letter-spacing"]);
    const inherited = useInheritedTextStyle();
    const parsed = Number.parseFloat(values["letter-spacing"]);
    return (
        <LexicalToolbarNumber
            title={t.typography.letterSpacing}
            prefix="Ls"
            value={Number.isNaN(parsed) ? inherited.letterSpacing : parsed}
            onChange={(spacing) => patch({ "letter-spacing": spacing === 0 ? null : `${spacing}px` })}
            min={-2}
            max={10}
            step={0.5}
        />
    );
}

/** Color + opacity edit the same `color` style — opacity folds into rgba
 * (a separate opacity property would also fade backgrounds; docs/06). */
function TextColorItem() {
    const t = useLabels();
    const { values, patch } = useLexicalSelectionStyle(["color"]);
    const inherited = useInheritedTextStyle();
    const current = parseColorToHexOpacity(values["color"]) ?? inherited.color;
    return (
        <>
            <LexicalToolbarColor
                title={t.typography.textColor}
                value={current.hex}
                onChange={(hex) => patch({ color: hexToRgba(hex, current.opacity) })}
            />
            <LexicalToolbarNumber
                title={t.typography.textOpacity}
                prefix="%"
                value={current.opacity}
                onChange={(opacity) => patch({ color: hexToRgba(current.hex, opacity) })}
                min={0}
                max={100}
                step={5}
            />
        </>
    );
}

/** Flat fragment of toolbar building blocks — the floating toolbar's second row. */
export const selectionTypographyItems = () => (
    <>
        <FontFamilyItem />
        <FontWeightItem />
        <FontSizeItem />
        <LineHeightItem />
        <LetterSpacingItem />
        <TextColorItem />
        <LexicalToolbarDivider />
        <LexicalAlignButtons />
    </>
);
