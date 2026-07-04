import { createElement, type ReactElement, type ReactNode } from "react";

/*
 * Children gap for the email output — table-safe: flex/grid gap does not
 * exist in email clients, so every child but the last is wrapped in a div
 * carrying paddingBottom. The canvas equivalent is ContainerSlot's flex
 * column gap (applied via ContainerDef.getGap). Server-safe module.
 */

export function withVerticalGap(children: ReactElement[] | undefined, gap: number): ReactNode {
    if (!children || children.length === 0) return children;
    if (gap <= 0) return children;
    return children.map((child, index) =>
        index < children.length - 1
            ? createElement("div", { key: child.key ?? index, style: { paddingBottom: gap } }, child)
            : child,
    );
}
