import type { CSSProperties } from "react";
import {
    defaultEffects,
    defaultSpacing,
    defaultTypography,
    effectsToCss,
    spacingToCss,
    typographyToCss,
    type EffectsValue,
    type SpacingValue,
    type TypographyValue,
} from "../../../style-props/index.ts";

export interface EmailTextProps {
    text: string;
    typography: TypographyValue;
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailTextDefaults: EmailTextProps = {
    text: "Lorem ipsum dolor sit amet",
    typography: defaultTypography,
    spacing: defaultSpacing,
    effects: defaultEffects,
};

export const emailTextStyles = (props: EmailTextProps): CSSProperties => ({
    ...typographyToCss(props.typography),
    ...spacingToCss(props.spacing),
    ...effectsToCss(props.effects),
});

/**
 * Per-element styles for the markdown render. react-email's <Markdown>
 * inlines defaults for headings/links/etc. but leaves p/ul/ol/li unstyled —
 * exactly the elements that diverge between the canvas (the app's Tailwind
 * preflight zeroes margins and strips bullets) and the preview iframe
 * (browser defaults). Explicit inline styles win in both contexts, and
 * harden the exported email against client resets too. The paragraph margin
 * lives here (not on the container) so multi-paragraph text spaces itself
 * and the last paragraph provides the block's bottom spacing.
 *
 * Headings must be overridden wholesale (custom styles replace react-email's
 * per tag, not merge): the library defaults set rem font sizes with NO
 * line-height, so an h1 inherits the container's px line-height computed
 * from the body font size (14px × 1.5 = 21px) and its 40px glyphs overflow
 * the block. Each level gets a px size and a matching px line-height, plus
 * explicit margins for the same canvas/iframe parity as paragraphs.
 */
const heading = (fontSize: number): CSSProperties => ({
    fontSize,
    lineHeight: `${Math.round(fontSize * 1.2)}px`,
    fontWeight: 500,
    margin: "0 0 12px",
});

export const emailTextMarkdownStyles: Record<string, CSSProperties> = {
    h1: heading(40),
    h2: heading(32),
    h3: heading(28),
    h4: heading(24),
    h5: heading(20),
    h6: heading(16),
    p: { margin: "0 0 12px" },
    ul: { listStyleType: "disc", paddingLeft: 24, margin: "0 0 12px" },
    ol: { listStyleType: "decimal", paddingLeft: 24, margin: "0 0 12px" },
    li: { margin: "4px 0" },
};
