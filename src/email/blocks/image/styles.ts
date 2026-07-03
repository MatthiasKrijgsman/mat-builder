import type { CSSProperties } from "react";

export interface EmailImageProps {
    src: string;
    alt: string;
    /** Rendered width in px (capped at 100% of the container) */
    width: number;
    align: "left" | "center" | "right";
    /** Optional link target — wraps the image in an anchor */
    href: string;
}

export const emailImageDefaults: EmailImageProps = {
    src: "",
    alt: "",
    width: 552,
    align: "center",
    href: "",
};

export const emailImageStyles = (props: EmailImageProps): CSSProperties => ({
    width: props.width,
    maxWidth: "100%",
    height: "auto",
    display: "block",
    marginLeft: props.align === "left" ? 0 : "auto",
    marginRight: props.align === "right" ? 0 : "auto",
});
