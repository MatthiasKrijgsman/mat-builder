import type { CSSProperties } from "react";
import {
    borderToCss,
    DEFAULT_WIDTH_PCT,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSpacing,
    effectsToCss,
    cssNumber,
    paddingToCss,
    sideShorthand,
    verticalAlignToCss,
    type BorderValue,
    type EffectsValue,
    type LayoutValue,
    type SizeValue,
    type SpacingValue,
} from "../../../style-props/index.ts";

export interface EmailImageProps {
    src: string;
    alt: string;
    /** Optional link target — wraps the image in an anchor */
    href: string;
    /** width: fixed px (capped at 100%), full, % of available width, or hug (intrinsic) */
    size: SizeValue;
    /** horizontal = self-alignment within the parent (margin-auto technique) */
    layout: LayoutValue;
    border: BorderValue;
    /** padding on the picture; margin = space around it, emitted as padding on
     *  a wrapper (the picture's own margin axis is the alignment auto-margins) */
    spacing: SpacingValue;
    effects: EffectsValue;
}

export const emailImageDefaults: EmailImageProps = {
    src: "",
    alt: "",
    href: "",
    size: { width: "fixed", widthPx: 552, height: "hug", heightPx: 100 },
    layout: { ...defaultLayout, horizontal: "center" },
    border: defaultBorder,
    spacing: defaultSpacing,
    effects: defaultEffects,
};

export const emailImageStyles = (props: EmailImageProps): CSSProperties => {
    const horizontal = props.layout?.horizontal ?? "center";
    return {
        width:
            props.size?.width === "fixed" ? props.size.widthPx
            : props.size?.width === "full" ? "100%"
            : props.size?.width === "percent" ? `${props.size.widthPct ?? DEFAULT_WIDTH_PCT}%`
            : "auto",
        maxWidth: "100%",
        height: props.size?.height === "fixed" ? props.size.heightPx : "auto",
        display: "block",
        marginLeft: horizontal === "start" ? 0 : "auto",
        marginRight: horizontal === "end" ? 0 : "auto",
        ...borderToCss(props.border),
        ...paddingToCss(props.spacing),
        ...effectsToCss(props.effects),
        ...verticalAlignToCss(props.layout),
    };
};

/** Space around the image — the wrapper's padding on both surfaces, since the
 *  picture's own margins carry its alignment. Undefined when there is none. */
export const emailImageMarginPadding = (props: EmailImageProps): string | undefined => {
    const margin = props.spacing?.margin;
    if (!margin) return undefined;
    const sides = [margin.top, margin.right, margin.bottom, margin.left].map((n) => cssNumber(n));
    return sides.some((n) => n !== 0) ? sideShorthand(margin) : undefined;
};
