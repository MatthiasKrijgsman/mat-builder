import type { CSSProperties } from "react";
import {
    defaultEffects,
    defaultLayout,
    defaultSpacing,
    effectsToCss,
    spacingToCss,
    verticalAlignToCss,
    type EffectsValue,
    type LayoutValue,
    type SpacingValue,
} from "../../../style-props/index.ts";
import { DEFAULT_TEXT_CONTENT } from "../../rich-text/index.ts";

/*
 * Text block props (docs/06): `content` holds rich text as serialized
 * Lexical JSON — per-range typography (font, size, color, …) lives INSIDE
 * the content as inline styles/node state, edited on-canvas via the inline
 * toolbar. There is deliberately no block-level typography prop: unstyled
 * text inherits the email-root's base typography.
 */

export interface EmailTextProps {
    /** Stored rich text — serialized Lexical JSON (see src/email/rich-text/). */
    content: string;
    /** Only `vertical` is used — block alignment within a parent cell
     * (horizontal align is per-paragraph, inside the rich text). */
    layout: LayoutValue;
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailTextDefaults: EmailTextProps = {
    content: DEFAULT_TEXT_CONTENT,
    layout: defaultLayout,
    spacing: defaultSpacing,
    effects: defaultEffects,
};

export const emailTextStyles = (props: EmailTextProps): CSSProperties => ({
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
    ...verticalAlignToCss(props.layout),
});
