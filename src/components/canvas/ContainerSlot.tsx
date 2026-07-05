import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { canDropAt } from "../../core/commands.ts";
import type { BlockId, ContainerDef } from "../../core/types.ts";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { dragBlockType } from "../../dnd/resolve.ts";
import { useBuilderContext } from "../../react/context.ts";
import { BlockView } from "./BlockView.tsx";

/*
 * ContainerSlot — renders one named container of a block (docs/04) and is
 * the "into me" drop target (docs/05 §2b): appends at the end, makes empty
 * containers droppable, and gives forgiving drop-in-the-padding behavior.
 * Not sticky (per Atlassian's tree example — avoids stale highlights); the
 * ring highlight shows while this slot is the innermost CONTAINER target:
 * full-strength when the slot itself is the drop ("into me"), softer when a
 * child block's edge line is the precise target — so the drop's parent
 * container is always visible during a drag without shouting over the line.
 */

export function ContainerSlot(props: { parentId: BlockId; container: ContainerDef; childIds: BlockId[]; gap?: number }) {
    const { parentId, container, childIds, gap = 0 } = props;
    const { store, registry, instanceId } = useBuilderContext();
    const ref = useRef<HTMLDivElement>(null);
    const [over, setOver] = useState<"none" | "parent" | "direct">("none");

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        return dropTargetForElements({
            element,
            canDrop: ({ source }) => {
                if (!isBuilderDrag(source.data, instanceId)) return false;
                const { document } = store.getState();
                const type = dragBlockType(document, source.data);
                if (!type) return false;
                const movingId = source.data.kind === "move-block" ? source.data.blockId : undefined;
                const index = (document.blocks[parentId]?.children[container.name] ?? []).length;
                return canDropAt(document, registry, type, { parentId, container: container.name, index }, movingId);
            },
            getIsSticky: () => false,
            getData: () => ({ targetKind: "container", parentId, container: container.name }),
            onDrag: ({ location }) => {
                // "direct" = this slot is the innermost target ("drop into me").
                // "parent" = a child block's edge line is the precise target and this
                // slot is the next container up — the drop's parent, kept visible.
                const targets = location.current.dropTargets;
                const next =
                    targets[0]?.element === element ? "direct"
                    : targets.find((target) => target.data.targetKind === "container")?.element === element ? "parent"
                    : "none";
                setOver((current) => (current === next ? current : next));
            },
            onDragLeave: () => setOver("none"),
            onDrop: () => setOver("none"),
        });
    }, [store, registry, instanceId, parentId, container.name]);

    const highlight: CSSProperties | undefined =
        over === "none" ? undefined : (
            {
                boxShadow: `inset 0 0 0 var(--mat-builder-drop-indicator-thickness) ${
                    over === "direct" ? "var(--mat-builder-color-drop-indicator)" : "var(--mat-builder-color-drop-parent)"
                }`,
            }
        );

    if (childIds.length === 0) {
        return (
            <div
                ref={ref}
                data-container={container.name}
                data-parent-id={parentId}
                className="flex min-h-12 items-center justify-center rounded border border-dashed p-2 text-xs"
                style={{
                    // An empty slot has no child sibling targets, so it's only ever "direct"
                    borderColor:
                        over === "direct"
                            ? "var(--mat-builder-color-drop-indicator)"
                            : "var(--mat-builder-color-placeholder-border)",
                    color: "var(--mat-builder-color-placeholder-fg)",
                    ...highlight,
                }}
            >
                {container.placeholder ?? "Drop content here"}
            </div>
        );
    }

    let className = "";
    let layoutStyle: CSSProperties | undefined;
    if (container.layout === "horizontal") className = "flex flex-row";
    else if (container.layout === "grid") {
        layoutStyle = {
            display: "grid",
            gridTemplateColumns: `repeat(${container.grid?.columns ?? 2}, minmax(0, 1fr))`,
        };
    } else if (gap > 0) {
        // Only when a gap is set — at 0 the default block flow (and its margin
        // collapsing) is preserved, keeping canvas/email parity.
        className = "flex flex-col";
    }
    if (gap > 0) layoutStyle = { ...layoutStyle, gap };

    return (
        <div
            ref={ref}
            data-container={container.name}
            data-parent-id={parentId}
            className={className}
            style={{ ...layoutStyle, ...highlight }}
        >
            {childIds.map((childId, index) => (
                <BlockView
                    key={childId}
                    id={childId}
                    location={{ parentId, container: container.name, index }}
                    layout={container.layout}
                />
            ))}
        </div>
    );
}
