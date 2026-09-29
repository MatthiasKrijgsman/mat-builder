import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { canDropAt } from "../../core/commands.ts";
import type { GroupContext } from "../../core/selection.ts";
import type { BlockId, ContainerDef } from "../../core/types.ts";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { dragBlockType } from "../../dnd/resolve.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState, useLabels } from "../../react/hooks.ts";
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
 *
 * The slot element is a `<div>` unless `ContainerDef.slotAs` names another tag
 * (`"tbody"` inside a table). `slotAs: "none"` means the slot renders NO
 * element at all — HTML allows nothing between `<tr>` and `<td>` — so it also
 * registers no "into me" target: reordering runs entirely off the children's
 * sibling edges, and only the empty-state placeholder (a real `emptyAs`
 * element) is droppable. Two drop targets cannot share one element anyway;
 * Pragmatic's registry is a WeakMap keyed by element, so borrowing the parent
 * block's wrapper would silently clobber its sibling target.
 */

export function ContainerSlot(props: {
    parentId: BlockId;
    container: ContainerDef;
    childIds: BlockId[];
    gap?: number;
    /** Resolved layout (ContainerDef.getLayout ?? ContainerDef.layout) — passed by BlockView */
    layout?: ContainerDef["layout"];
    /** Extra style for the layout element (ContainerDef.getSlotStyle) */
    slotStyle?: CSSProperties;
    /** Enclosing `selectsAsGroup` block — passed straight through to the children */
    group?: GroupContext;
}) {
    const { parentId, container, childIds, gap = 0, layout = container.layout, slotStyle, group } = props;
    const { store, registry, instanceId } = useBuilderContext();
    const t = useLabels();
    const parentType = useBuilderState((s) => s.document.blocks[parentId]?.type);
    const ref = useRef<HTMLElement>(null);
    const elementless = container.slotAs === "none";
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
        const Empty = container.emptyAs ?? "div";
        return (
            <Empty
                ref={ref as never}
                data-container={container.name}
                data-parent-id={parentId}
                className="mat:flex mat:min-h-12 mat:items-center mat:justify-center mat:rounded mat:border mat:border-dashed mat:p-2 mat:text-xs"
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
                {(parentType && t.blocks[parentType]?.containers?.[container.name]?.placeholder) ?? container.placeholder ?? t.canvas.dropContentHere}
            </Empty>
        );
    }

    const children = childIds.map((childId, index) => (
        <BlockView
            key={childId}
            id={childId}
            location={{ parentId, container: container.name, index }}
            layout={layout}
            group={group}
        />
    ));

    // No element of our own: the children go straight into the parent block's
    // wrapper (a <tr>). Table layout does the arranging, so no flex/gap/ring.
    if (elementless) return <>{children}</>;

    let className = "";
    let layoutStyle: CSSProperties | undefined;
    // A custom tag is table structure (a <tbody>): the browser's table layout
    // arranges it, and flex/grid/gap would destroy that box tree. It also can't
    // hold the absolute overlay div, so its ring goes on the element itself.
    const Slot = container.slotAs && container.slotAs !== "none" ? container.slotAs : "div";
    if (Slot === "div") {
        // Horizontal = equal-width cells (*:flex-1), mirroring the email output's
        // equal-split table columns. The absolute highlight overlay ignores flex.
        if (layout === "horizontal") className = "mat:flex mat:flex-row mat:*:min-w-0 mat:*:flex-1";
        else if (layout === "grid") {
            layoutStyle = {
                display: "grid",
                gridTemplateColumns: `repeat(${container.grid?.columns ?? 2}, minmax(0, 1fr))`,
            };
        } else if (gap > 0) {
            // Only when a gap is set — at 0 the default block flow (and its margin
            // collapsing) is preserved, keeping canvas/email parity.
            className = "mat:flex mat:flex-col";
        }
        if (gap > 0) layoutStyle = { ...layoutStyle, gap };
        if (slotStyle) layoutStyle = { ...layoutStyle, ...slotStyle };
    } else if (highlight) {
        layoutStyle = highlight;
    }

    return (
        <Slot
            ref={ref as never}
            data-container={container.name}
            data-parent-id={parentId}
            className={`mat:relative ${className}`}
            style={layoutStyle}
        >
            {children}
            {/* The ring paints ABOVE the children (not as the container's own
                box-shadow, which sits in the background layer and shows through
                transparent blocks — during a drag the lines read as the ring
                "clipping" the lifted drag source). Below the sibling edge
                indicator (z-20). */}
            {highlight && Slot === "div" && (
                <div className="mat:pointer-events-none mat:absolute mat:inset-0 mat:z-10" style={highlight} />
            )}
        </Slot>
    );
}
