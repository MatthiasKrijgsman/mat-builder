import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { announce, cleanup as cleanupLiveRegion } from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { useEffect } from "react";
import type { BlockId } from "../core/types.ts";
import type { BuilderContextValue } from "../react/context.ts";
import { isBuilderDrag, isBuilderDropTarget } from "./drag-data.ts";
import { dragBlockType, resolveDropLocation } from "./resolve.ts";

/*
 * The one DnD monitor per provider — see docs/05-drag-and-drop.md §4.
 * Owns ALL drop mutations; drop targets only ever render indicators.
 * Called by <BuilderProvider> with its own instance (it sits above the
 * context, so it can't use useBuilderContext).
 */

export function useDndMonitor(instance: BuilderContextValue): void {
    const { store, registry, instanceId } = instance;

    useEffect(() => {
        const stopMonitor = monitorForElements({
            canMonitor: ({ source }) => isBuilderDrag(source.data, instanceId),

            onDragStart: ({ source }) => {
                const data = source.data;
                if (!isBuilderDrag(data, instanceId)) return;
                const { actions } = store.getState();
                // Grabbing a block selects it (native drag never fires click) —
                // so on release it lands with the selected chrome, per the
                // interaction spec's "stays selected after drop"
                if (data.kind === "move-block") actions.select(data.blockId);
                actions.setDrag(
                    data.kind === "new-block"
                        ? { kind: "new-block", blockType: data.blockType, spec: data.spec }
                        : { kind: "move-block", blockId: data.blockId },
                );
            },

            onDrop: ({ source, location }) => {
                const { actions, document } = store.getState();
                actions.setDrag(null);

                const data = source.data;
                if (!isBuilderDrag(data, instanceId)) return;
                const target = location.current.dropTargets[0]; // innermost wins
                if (!target || !isBuilderDropTarget(target.data)) return; // dropped nowhere → native cancel animation
                const to = resolveDropLocation(document, registry, target.data, data);
                if (!to) return;

                let landedId: BlockId | null = null;
                if (data.kind === "new-block") {
                    // A pattern carries the subtree to stamp out; a plain
                    // block drag carries only its type.
                    landedId = actions.insertBlock(data.spec ?? data.blockType, to);
                } else if (actions.moveBlock(data.blockId, to)) {
                    landedId = data.blockId;
                }
                if (!landedId) return;

                const type = dragBlockType(document, data);
                const label = (type && registry.getDefinition(type)?.label) ?? type ?? "Block";
                announce(`${label} ${data.kind === "new-block" ? "added" : "moved"}, position ${to.index + 1}`);
                // Visual landing feedback is the lift spring-back + selected
                // chrome/pill entrance (chrome.css + ChromeOverlay) — no flash
            },
        });

        return () => {
            stopMonitor();
            cleanupLiveRegion();
        };
    }, [store, registry, instanceId]);
}
