import type { TablerIcon } from "@tabler/icons-react";
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";

/*
 * Figma-style spacing icons — a muted square outline with solid bars marking
 * the side(s) the input controls. Tabler's spacing/box-align icons read as
 * "gaps" rather than sides of a box, so the padding/margin fields draw their
 * own. Same 24px grid, stroke and props contract as Tabler so they drop into
 * any Icon slot typed as TablerIcon.
 */

function createSpacingIcon(displayName: string, bars: ReactNode): TablerIcon {
    const Component = forwardRef<SVGSVGElement, ComponentPropsWithoutRef<"svg">>((props, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <rect x="4" y="4" width="16" height="16" rx="2" opacity={0.35} />
            {bars}
        </svg>
    ));
    Component.displayName = displayName;
    return Component as unknown as TablerIcon;
}

/** Left & right sides (linked horizontal padding/margin). */
export const IconSidesX = createSpacingIcon("IconSidesX", (
    <>
        <path d="M8 9v6" />
        <path d="M16 9v6" />
    </>
));

/** Top & bottom sides (linked vertical padding/margin). */
export const IconSidesY = createSpacingIcon("IconSidesY", (
    <>
        <path d="M9 8h6" />
        <path d="M9 16h6" />
    </>
));

export const IconSideLeft = createSpacingIcon("IconSideLeft", <path d="M8 9v6" />);
export const IconSideRight = createSpacingIcon("IconSideRight", <path d="M16 9v6" />);
export const IconSideTop = createSpacingIcon("IconSideTop", <path d="M9 8h6" />);
export const IconSideBottom = createSpacingIcon("IconSideBottom", <path d="M9 16h6" />);

/** The "set each side individually" toggle — one tick per side. */
export const IconSidesIndividual = createSpacingIcon("IconSidesIndividual", (
    <>
        <path d="M8 10.5v3" />
        <path d="M16 10.5v3" />
        <path d="M10.5 8h3" />
        <path d="M10.5 16h3" />
    </>
));
