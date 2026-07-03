import type { ReactNode } from "react";
import type { BlockId } from "../../core/types.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBlockNode, useBuilderState } from "../../react/hooks.ts";
import { ContainerSlot } from "./ContainerSlot.tsx";

/*
 * BlockView + chrome — the per-block wrapper (docs/04 §BlockFrame).
 * Selection/hover chrome is an absolutely-positioned overlay SIBLING of the
 * editRender, never wrapper styles on the block itself: the chrome must not
 * change the block's box or the edit render drifts from the real output.
 * Phase 3 adds drag-source/drop-target behavior here.
 */

export function BlockView({ id }: { id: BlockId }) {
    const { registry } = useBuilderContext();
    const node = useBlockNode(id);
    const actions = useBuilderState((s) => s.actions);
    const isSelected = useBuilderState((s) => s.selectedId === id);
    const isHovered = useBuilderState((s) => s.hoveredId === id);
    const isRoot = useBuilderState((s) => s.document.rootId === id);

    if (!node) return null;
    const definition = registry.getDefinition(node.type);

    const containers: Record<string, ReactNode> = {};
    for (const container of definition?.containers ?? []) {
        containers[container.name] = (
            <ContainerSlot
                key={container.name}
                parentId={id}
                container={container}
                childIds={node.children[container.name] ?? []}
            />
        );
    }

    const label = definition?.getDisplayName?.(node.props) ?? definition?.label ?? node.type;

    return (
        <div
            className="relative"
            data-block-id={id}
            // stopPropagation everywhere: the innermost block under the pointer wins
            onClick={(event) => {
                event.stopPropagation();
                actions.select(id);
            }}
            onPointerOver={(event) => {
                event.stopPropagation();
                actions.hover(id);
            }}
            onPointerOut={(event) => {
                event.stopPropagation();
                actions.hover(null);
            }}
        >
            {definition ? (
                <definition.editRender id={id} props={node.props} containers={containers} isSelected={isSelected} />
            ) : (
                <MissingBlock type={node.type} />
            )}
            {(isSelected || (isHovered && !isRoot)) && <BlockChrome label={label} selected={isSelected} />}
        </div>
    );
}

function BlockChrome({ label, selected }: { label: string; selected: boolean }) {
    const color = selected ? "var(--mat-builder-color-selection)" : "var(--mat-builder-color-hover)";
    return (
        <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${color}` }}
        >
            {selected && (
                <span
                    className="absolute left-0 top-0 -translate-y-full rounded-t px-1.5 py-0.5 text-[10px] font-medium leading-none"
                    style={{ backgroundColor: color, color: "var(--mat-builder-color-chrome-tag-fg)" }}
                >
                    {label}
                </span>
            )}
        </div>
    );
}

/** Unknown block types render this instead of crashing (docs/03 §2). */
function MissingBlock({ type }: { type: string }) {
    return (
        <div
            className="rounded border border-dashed p-3 text-xs"
            style={{
                borderColor: "var(--mat-builder-color-missing-border)",
                backgroundColor: "var(--mat-builder-color-missing-bg)",
                color: "var(--mat-builder-color-missing-fg)",
            }}
        >
            Missing block type &ldquo;{type}&rdquo;
        </div>
    );
}
