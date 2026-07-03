import { describe, expect, it } from "vitest";
import { createHistory, recordHistory, redo, undo } from "./history.ts";
import { exampleDoc } from "./test-fixtures.ts";
import type { HistoryEntry } from "./types.ts";

const entry = (selectedId: string | null): HistoryEntry => ({ document: exampleDoc(), selectedId });

describe("recordHistory / undo / redo", () => {
    it("round-trips snapshots including selectedId", () => {
        const a = entry("a");
        const b = entry("b");
        const current = entry("current");

        let history = createHistory();
        history = recordHistory(history, a, { timestamp: 0 });
        history = recordHistory(history, b, { timestamp: 1000 });
        expect(history.past).toEqual([a, b]);

        const undone = undo(history, current);
        expect(undone).not.toBeNull();
        expect(undone?.entry).toBe(b);
        expect(undone?.history.past).toEqual([a]);
        expect(undone?.history.future).toEqual([current]);

        const redone = redo(undone!.history, undone!.entry);
        expect(redone?.entry).toBe(current);
        expect(redone?.history.past).toEqual([a, b]);
        expect(redone?.history.future).toEqual([]);
    });

    it("returns null when there is nothing to undo or redo", () => {
        expect(undo(createHistory(), entry(null))).toBeNull();
        expect(redo(createHistory(), entry(null))).toBeNull();
    });

    it("clears the future on a new record (no redo after a fresh edit)", () => {
        let history = recordHistory(createHistory(), entry("a"), { timestamp: 0 });
        const undone = undo(history, entry("current"));
        expect(undone?.history.future).toHaveLength(1);

        history = recordHistory(undone!.history, undone!.entry, { timestamp: 5000 });
        expect(history.future).toEqual([]);
    });

    it("caps the past, dropping the oldest entries", () => {
        let history = createHistory();
        for (let i = 0; i < 5; i++) {
            history = recordHistory(history, entry(`e${i}`), { timestamp: i * 10_000, cap: 3 });
        }
        expect(history.past.map((e) => e.selectedId)).toEqual(["e2", "e3", "e4"]);
    });
});

describe("coalescing", () => {
    const key = "updateProps:t1";

    it("collapses same-key records within the window into one entry", () => {
        let history = recordHistory(createHistory(), entry("a"), { timestamp: 0, coalesceKey: key });
        history = recordHistory(history, entry("b"), { timestamp: 500, coalesceKey: key });
        expect(history.past).toHaveLength(1);
        expect(history.past[0].selectedId).toBe("a");
    });

    it("refreshes the timer on each coalesced record (a steady burst stays one entry)", () => {
        let history = recordHistory(createHistory(), entry("a"), { timestamp: 0, coalesceKey: key });
        history = recordHistory(history, entry("b"), { timestamp: 600, coalesceKey: key });
        history = recordHistory(history, entry("c"), { timestamp: 1200, coalesceKey: key });
        expect(history.past).toHaveLength(1);

        // …but a pause longer than the window starts a new entry
        history = recordHistory(history, entry("d"), { timestamp: 2500, coalesceKey: key });
        expect(history.past).toHaveLength(2);
    });

    it("does not coalesce across different keys", () => {
        let history = recordHistory(createHistory(), entry("a"), { timestamp: 0, coalesceKey: "updateProps:t1" });
        history = recordHistory(history, entry("b"), { timestamp: 100, coalesceKey: "updateProps:b1" });
        expect(history.past).toHaveLength(2);
    });

    it("does not coalesce around a keyless (structural) record", () => {
        let history = recordHistory(createHistory(), entry("a"), { timestamp: 0, coalesceKey: key });
        history = recordHistory(history, entry("b"), { timestamp: 100 });
        history = recordHistory(history, entry("c"), { timestamp: 200, coalesceKey: key });
        expect(history.past).toHaveLength(3);
    });

    it("starts a fresh entry after an undo", () => {
        let history = recordHistory(createHistory(), entry("a"), { timestamp: 0, coalesceKey: key });
        const undone = undo(history, entry("current"));

        history = recordHistory(undone!.history, entry("b"), { timestamp: 100, coalesceKey: key });
        expect(history.past.map((e) => e.selectedId)).toEqual(["b"]);
    });
});
