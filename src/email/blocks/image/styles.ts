import type { CSSProperties } from "react";
import {
    borderToCss,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSpacing,
    effectsToCss,
    paddingToCss,
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
    /** width: fixed px (capped at 100%), full, or hug (intrinsic) */
    size: SizeValue;
    /** horizontal = self-alignment within the parent (margin-auto technique) */
    layout: LayoutValue;
    border: BorderValue;
    /** padding only — the margin axis is owned by the alignment auto-margins */
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
        width: props.size?.width === "fixed" ? props.size.widthPx : props.size?.width === "full" ? "100%" : "auto",
        maxWidth: "100%",
        height: props.size?.height === "fixed" ? props.size.heightPx : "auto",
        display: "block",
        marginLeft: horizontal === "start" ? 0 : "auto",
        marginRight: horizontal === "end" ? 0 : "auto",
        ...borderToCss(props.border),
        ...paddingToCss(props.spacing),
        ...effectsToCss(props.effects),
    };
};
