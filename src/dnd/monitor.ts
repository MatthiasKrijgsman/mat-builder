import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
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
                store.getState().actions.setDrag(
                    data.kind === "new-block"
                        ? { kind: "new-block", blockType: data.blockType }
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
                    landedId = actions.insertBlock(data.blockType, to);
                } else if (actions.moveBlock(data.blockId, to)) {
                    landedId = data.blockId;
                }
                if (!landedId) return;

                const type = dragBlockType(document, data);
                const label = (type && registry.getDefinition(type)?.label) ?? type ?? "Block";
                announce(`${label} ${data.kind === "new-block" ? "added" : "moved"}, position ${to.index + 1}`);

                // Flash once React has committed the re-render of the landed block
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => {
                        const element = window.document.querySelector(`[data-block-id="${landedId}"]`);
                        if (element instanceof HTMLElement) triggerPostMoveFlash(element);
                    }),
                );
            },
        });

        return () => {
            stopMonitor();
            cleanupLiveRegion();
        };
    }, [store, registry, instanceId]);
}
