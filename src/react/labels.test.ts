import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, formatLabel, resolveLabels } from "./labels.ts";

describe("labels", () => {
    it("resolves to the English when nothing is overridden — the same object, no copy", () => {
        expect(resolveLabels(undefined)).toBe(DEFAULT_LABELS);
    });

    it("deep-merges any subset over the English and leaves the rest", () => {
        const labels = resolveLabels({
            toolbar: { undo: "Ongedaan maken" },
            visibility: { operators: { eq: "is gelijk aan" } },
            blocks: { container: { label: "Sectie", containers: { content: { placeholder: "Sleep hier" } } } },
            categories: { Layout: "Indeling" },
        });
        expect(labels.toolbar).toEqual({ undo: "Ongedaan maken", redo: "Redo" });
        expect(labels.visibility.operators.eq).toBe("is gelijk aan");
        expect(labels.visibility.operators.neq).toBe("is not");
        expect(labels.visibility.always).toBe("Always");
        expect(labels.blocks.container).toEqual({ label: "Sectie", containers: { content: { placeholder: "Sleep hier" } } });
        expect(labels.categories.Layout).toBe("Indeling");
        // The English is never mutated
        expect(DEFAULT_LABELS.toolbar.undo).toBe("Undo");
    });

    it("fills placeholders and leaves unknown ones alone", () => {
        expect(formatLabel(DEFAULT_LABELS.shell.needsRoom, { minWidth: 768 })).toBe(
            "Widen the window to at least 768px, or open it on a larger screen.",
        );
        expect(formatLabel("{count} rules of {kind}", { count: 3 })).toBe("3 rules of {kind}");
    });
});
