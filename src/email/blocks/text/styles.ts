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
    text: "Write something…",
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
 */
export const emailTextMarkdownStyles: Record<string, CSSProperties> = {
    p: { margin: "0 0 12px" },
    ul: { listStyleType: "disc", paddingLeft: 24, margin: "0 0 12px" },
    ol: { listStyleType: "decimal", paddingLeft: 24, margin: "0 0 12px" },
    li: { margin: "4px 0" },
};
