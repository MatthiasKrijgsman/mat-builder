import type { CSSProperties } from "react";
import type { BlockId, ContainerDef } from "../../core/types.ts";
import { BlockView } from "./BlockView.tsx";

/*
 * ContainerSlot — renders one named container of a block (docs/04).
 * The block's editRender decides WHERE the slot sits; the slot decides how
 * children stack (the container's layout in editor space). Empty containers
 * show a dashed placeholder — phase 3 turns it into a full-surface drop target.
 */

export function ContainerSlot(props: { parentId: BlockId; container: ContainerDef; childIds: BlockId[] }) {
    const { parentId, container, childIds } = props;

    if (childIds.length === 0) {
        return (
            <div
                data-container={container.name}
                data-parent-id={parentId}
                className="flex min-h-12 items-center justify-center rounded border border-dashed p-2 text-xs"
                style={{
                    borderColor: "var(--mat-builder-color-placeholder-border)",
                    color: "var(--mat-builder-color-placeholder-fg)",
                }}
            >
                {container.placeholder ?? "Drop content here"}
            </div>
        );
    }

    let className = "";
    let style: CSSProperties | undefined;
    if (container.layout === "horizontal") className = "flex flex-row";
    else if (container.layout === "grid") {
        style = { display: "grid", gridTemplateColumns: `repeat(${container.grid?.columns ?? 2}, minmax(0, 1fr))` };
    }

    return (
        <div data-container={container.name} data-parent-id={parentId} className={className} style={style}>
            {childIds.map((childId) => (
                <BlockView key={childId} id={childId} />
            ))}
        </div>
    );
}
