import { createContext, useContext, type RefObject } from "react";
import type { BlockRegistry } from "../core/registry.ts";
import type { EditorStore } from "./store.ts";

export interface BuilderContextValue {
    store: EditorStore;
    registry: BlockRegistry;
    /** Brands all drag data for this builder instance — see docs/05 §1 */
    instanceId: symbol;
    /**
     * This instance's canvas scroller, published by <Canvas> while mounted (null
     * otherwise). Lets panels outside the canvas read the DOM of rendered blocks
     * — e.g. the dimension fields showing a block's resolved px. Per instance, so
     * two builders on one page never measure each other's blocks (docs/04).
     */
    canvasRef: RefObject<HTMLElement | null>;
}

export const BuilderContext = createContext<BuilderContextValue | null>(null);

/** Internal — components/hooks resolve their builder instance through this. */
export function useBuilderContext(): BuilderContextValue {
    const ctx = useContext(BuilderContext);
    if (!ctx) {
        throw new Error("mat-builder components and hooks must be rendered inside a <BuilderProvider>");
    }
    return ctx;
}
