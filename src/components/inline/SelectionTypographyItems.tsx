import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    LexicalAlignButtons,
    LexicalToolbarColor,
    LexicalToolbarDivider,
    LexicalToolbarNumber,
    LexicalToolbarSelect,
    useLexicalSelectionStyle,
} from "@matthiaskrijgsman/mat-ui";
import { defaultTypography, EMAIL_FONT_STACKS, hexToRgba, parseColorToHexOpacity } from "../../style-props/index.ts";
import { $setLineHeightOnSelection, useSelectionLineHeight } from "./LineHeightPlugin.tsx";

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

/** Effective INHERITED text style, read from the editor root's computed
 * style — when the selection carries no inline style the controls show the
 * values the text actually renders with (the email-root base typography
 * cascading in), not an empty field. */
function useInheritedTextStyle() {
    const [editor] = useLexicalComposerContext();
    const root = editor.getRootElement();
    if (!root) {
        return {
            fontSize: defaultTypography.fontSize,
            lineHeight: defaultTypography.lineHeight,
            letterSpacing: defaultTypography.letterSpacing,
            color: { hex: defaultTypography.color, opacity: defaultTypography.opacity },
        };
    }
    const computed = window.getComputedStyle(root);
    const fontSize = Number.parseFloat(computed.fontSize) || defaultTypography.fontSize;
    const lineHeightPx = Number.parseFloat(computed.lineHeight); // NaN for "normal"
    const letterSpacing = Number.parseFloat(computed.letterSpacing) || 0; // "normal" → 0
    return {
        fontSize,
        lineHeight: Number.isNaN(lineHeightPx)
            ? defaultTypography.lineHeight
            : Math.round((lineHeightPx / fontSize) * 10) / 10,
        letterSpacing,
        color: parseColorToHexOpacity(computed.color) ?? { hex: defaultTypography.color, opacity: 100 },
    };
}

function FontFamilyItem() {
    const { values, patch } = useLexicalSelectionStyle(["font-family"]);
    return (
        <LexicalToolbarSelect
            title="Font family"
            options={FONT_OPTIONS}
            value={values["font-family"] || null}
            onChange={(stack) => patch({ "font-family": stack })}
            placeholder="Font"
            clearable
            minWidth={200}
        />
    );
}

function FontSizeItem() {
    const { values, patch } = useLexicalSelectionStyle(["font-size"]);
    const inherited = useInheritedTextStyle();
    const parsed = Number.parseFloat(values["font-size"]);
    return (
        <LexicalToolbarNumber
            title="Font size (px)"
            prefix="Aa"
            value={Number.isNaN(parsed) ? inherited.fontSize : parsed}
            onChange={(size) => patch({ "font-size": `${size}px` })}
            min={8}
            max={96}
        />
    );
}

function LineHeightItem() {
    const [editor] = useLexicalComposerContext();
    const inherited = useInheritedTextStyle();
    const value = useSelectionLineHeight(editor);
    return (
        <LexicalToolbarNumber
            title="Line height (multiplier)"
            prefix="Lh"
            value={value ?? inherited.lineHeight}
            onChange={(multiplier) => editor.update(() => $setLineHeightOnSelection(multiplier))}
            min={0.5}
            max={3}
            step={0.1}
        />
    );
}

function LetterSpacingItem() {
    const { values, patch } = useLexicalSelectionStyle(["letter-spacing"]);
    const inherited = useInheritedTextStyle();
    const parsed = Number.parseFloat(values["letter-spacing"]);
    return (
        <LexicalToolbarNumber
            title="Letter spacing (px)"
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
    const { values, patch } = useLexicalSelectionStyle(["color"]);
    const inherited = useInheritedTextStyle();
    const current = parseColorToHexOpacity(values["color"]) ?? inherited.color;
    return (
        <>
            <LexicalToolbarColor
                title="Text color"
                value={current.hex}
                onChange={(hex) => patch({ color: hexToRgba(hex, current.opacity) })}
            />
            <LexicalToolbarNumber
                title="Text opacity (%)"
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
        <FontSizeItem />
        <LineHeightItem />
        <LetterSpacingItem />
        <TextColorItem />
        <LexicalToolbarDivider />
        <LexicalAlignButtons />
    </>
);
