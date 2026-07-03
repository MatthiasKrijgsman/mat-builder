import { createContext, useContext } from "react";
import type { BlockRegistry } from "../core/registry.ts";
import type { EditorStore } from "./store.ts";

export interface BuilderContextValue {
    store: EditorStore;
    registry: BlockRegistry;
    /** Brands all drag data for this builder instance — see docs/05 §1 */
    instanceId: symbol;
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
