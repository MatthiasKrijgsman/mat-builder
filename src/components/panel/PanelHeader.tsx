import { Divider } from "@matthiaskrijgsman/mat-ui";
import type { ComponentType, ReactNode } from "react";

/*
 * PanelHeader — the shared header for editor panels (Palette, LayersPanel,
 * Inspector): icon in a tinted square, title, optional trailing actions,
 * closed off by a Divider. The Inspector's selected-block header set the
 * pattern; the other panels reuse it so all floating panels read the same.
 */

export interface PanelHeaderProps {
    Icon?: ComponentType<{ className?: string }>;
    title: ReactNode;
    /** Trailing controls (e.g. the Inspector's delete button) */
    actions?: ReactNode;
}

export function PanelHeader({ Icon, title, actions }: PanelHeaderProps) {
    return (
        <header className="flex shrink-0 flex-col gap-2">
            <div className="flex flex-row items-center gap-2 py-1.5 pl-3 pr-1">
                {Icon && (
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100">
                        <Icon className="size-4 shrink-0 stroke-2 text-gray-800" />
                    </div>
                )}
                <div className="line-clamp-1 flex-1 break-all text-[1.125rem] font-semibold">{title}</div>
                {actions && <div className="flex shrink-0 flex-row items-center gap-2">{actions}</div>}
            </div>
            <Divider />
        </header>
    );
}
