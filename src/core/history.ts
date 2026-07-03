import type { HistoryEntry, HistoryState } from "./types.ts";

/*
 * Snapshot history — see docs/03-architecture.md §3.
 *
 * Pure functions over HistoryState; the current document lives in the
 * editor state, `past`/`future` hold the snapshots around it. Immer's
 * structural sharing keeps snapshots cheap. Timestamps are passed in
 * (never read from Date.now() here) so coalescing is deterministic to test
 * — the store layer supplies real time.
 */

/** Consecutive same-key records within this window collapse into one undo step. */
export const HISTORY_COALESCE_MS = 800;
export const HISTORY_CAP = 100;

export function createHistory(): HistoryState {
    return { past: [], future: [] };
}

export interface RecordHistoryOptions {
    timestamp: number;
    /**
     * Identity of a coalescable edit, e.g. `updateProps:<blockId>` — when it
     * matches the previous record within HISTORY_COALESCE_MS, the snapshot is
     * NOT pushed (the previous one already captured the pre-edit state), so a
     * typing burst is a single undo step. Omit for structural commands.
     */
    coalesceKey?: string;
    /** @default HISTORY_CAP */
    cap?: number;
}

/**
 * Records the PRE-command snapshot onto `past` and clears `future`.
 * Call before applying a command to the editor state.
 */
export function recordHistory(
    history: HistoryState,
    snapshot: HistoryEntry,
    options: RecordHistoryOptions,
): HistoryState {
    const { timestamp, coalesceKey, cap = HISTORY_CAP } = options;

    const coalesce =
        coalesceKey !== undefined &&
        history.lastRecord !== undefined &&
        history.lastRecord.coalesceKey === coalesceKey &&
        timestamp - history.lastRecord.at < HISTORY_COALESCE_MS;

    const lastRecord = coalesceKey !== undefined ? { coalesceKey, at: timestamp } : undefined;
    if (coalesce) {
        // Skip the push but refresh the timer, so a steady typing burst stays one entry
        return { past: history.past, future: [], lastRecord };
    }

    const past = [...history.past, snapshot];
    return { past: past.length > cap ? past.slice(past.length - cap) : past, future: [], lastRecord };
}

/** Pops the previous snapshot; `current` (what the editor shows now) moves onto `future`. */
export function undo(
    history: HistoryState,
    current: HistoryEntry,
): { history: HistoryState; entry: HistoryEntry } | null {
    if (history.past.length === 0) return null;
    const entry = history.past[history.past.length - 1];
    return {
        // lastRecord is dropped: the next edit after an undo starts a fresh entry
        history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
        entry,
    };
}

export function redo(
    history: HistoryState,
    current: HistoryEntry,
): { history: HistoryState; entry: HistoryEntry } | null {
    if (history.future.length === 0) return null;
    const entry = history.future[0];
    return {
        history: { past: [...history.past, current], future: history.future.slice(1) },
        entry,
    };
}
