import { createElement, Fragment, type ReactElement, type ReactNode } from "react";

/*
 * Children gap for the email output — table-safe: flex/grid gap does not
 * exist in email clients, so a spacer row follows every child but the last.
 * A spacer TABLE rather than a padded div: Outlook on Windows only honours
 * padding on table cells, and a div's padding-bottom collapses to nothing
 * there. The cell's height is pinned with a matching line-height, a 1px
 * font and `mso-line-height-rule: exactly`, or Outlook grows it to fit the
 * default font. The canvas equivalent is ContainerSlot's flex column gap
 * (applied via ContainerDef.getGap). Server-safe module.
 */

export function gapSpacer(gap: number, key?: string | number): ReactElement {
    return createElement(
        "table",
        { key, role: "presentation", width: "100%", border: 0, cellPadding: 0, cellSpacing: 0 },
        createElement(
            "tbody",
            null,
            createElement(
                "tr",
                null,
                createElement(
                    "td",
                    {
                        height: gap,
                        style: { height: gap, lineHeight: `${gap}px`, fontSize: 1, msoLineHeightRule: "exactly" },
                    },
                    " ",
                ),
            ),
        ),
    );
}

export function withVerticalGap(children: ReactElement[] | undefined, gap: number): ReactNode {
    if (!children || children.length === 0) return children;
    if (gap <= 0) return children;
    return children.map((child, index) =>
        index < children.length - 1
            ? createElement(Fragment, { key: child.key ?? index }, child, gapSpacer(gap))
            : child,
    );
}
