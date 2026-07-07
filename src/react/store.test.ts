import { describe, expect, it, vi } from "vitest";
import { block, exampleDoc, testRegistry } from "../core/test-fixtures.ts";
import type { BuilderDocument } from "../core/types.ts";
import { createEditorStore, syncExternalDocument, type EditorCallbacks } from "./store.ts";

function makeStore(overrides?: { document?: BuilderDocument; callbacks?: EditorCallbacks }) {
    let time = 0;
    const store = createEditorStore({
        registry: testRegistry,
        document: overrides?.document ?? exampleDoc(),
        callbacks: overrides?.callbacks,
        now: () => time,
    });
    return { store, tick: (ms: number) => (time += ms) };
}

const at = { parentId: "root", container: "main", index: 1 };

describe("selection & hover", () => {
    it("selects and notifies, deduplicating repeats", () => {
        const onSelectionChange = vi.fn();
        const { store } = makeStore({ callbacks: { onSelectionChange } });
        const { actions } = store.getState();

        actions.select("t1");
        actions.select("t1");
        expect(store.getState().selectedId).toBe("t1");
        expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith("t1");

        actions.hover("b1");
        expect(store.getState().hoveredId).toBe("b1");
    });
});

describe("structural actions", () => {
    it("insertBlock commits, records history, selects the new block and fires onChange", () => {
        const onChange = vi.fn();
        const { store } = makeStore({ callbacks: { onChange } });
        const { actions } = store.getState();

        const blockId = actions.insertBlock("text", at);
        const state = store.getState();
        expect(blockId).not.toBeNull();
        expect(state.document.blocks[blockId as string].type).toBe("text");
        expect(state.selectedId).toBe(blockId);
        expect(state.history.past).toHaveLength(1);
        expect(onChange).toHaveBeenCalledExactlyOnceWith(state.document);
    });

    it("insertBlock is a no-op returning null for invalid targets", () => {
        const onChange = vi.fn();
        const { store } = makeStore({ callbacks: { onChange } });
        const before = store.getState().document;

        expect(store.getState().actions.insertBlock("nope", at)).toBeNull();
        expect(store.getState().actions.insertBlock("text", { ...at, container: "bogus" })).toBeNull();
        expect(store.getState().document).toBe(before);
        expect(store.getState().history.past).toHaveLength(0);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("moveBlock commits valid moves and refuses invalid ones", () => {
        const { store } = makeStore();
        const { actions } = store.getState();

        expect(actions.moveBlock("t1", { parentId: "root", container: "main", index: 0 })).toBe(true);
        expect(store.getState().document.blocks.root.children.main).toEqual(["t1", "sec1"]);

        expect(actions.moveBlock("root", at)).toBe(false);
        expect(actions.moveBlock("sec1", { parentId: "sec1", container: "left", index: 0 })).toBe(false);
        expect(store.getState().history.past).toHaveLength(1);
    });

    it("removeBlock falls selection back to the parent and refuses the root", () => {
        const { store } = makeStore();
        const { actions } = store.getState();
        actions.select("t1");

        expect(actions.removeBlock("t1")).toBe(true);
        expect(store.getState().selectedId).toBe("sec1");
        expect(store.getState().document.blocks.t1).toBeUndefined();

        expect(actions.removeBlock("root")).toBe(false);
    });

    it("duplicateBlock selects the clone", () => {
        const { store } = makeStore();
        const cloneId = store.getState().actions.duplicateBlock("sec1");

        expect(cloneId).not.toBeNull();
        expect(store.getState().selectedId).toBe(cloneId);
        expect(store.getState().document.blocks.root.children.main).toEqual(["sec1", cloneId]);
    });

    it("duplicateBlock refuses when the container is full", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.right.push("b2");
        doc.blocks.b2 = block({ id: "b2", type: "button" });
        const { store } = makeStore({ document: doc });

        expect(store.getState().actions.duplicateBlock("b1")).toBeNull();
    });
});

describe("updateProps & history coalescing", () => {
    it("coalesces a typing burst into one undo step", () => {
        const { store, tick } = makeStore();
        const { actions } = store.getState();
        actions.select("t1");

        actions.updateProps("t1", { text: "H" });
        tick(100);
        actions.updateProps("t1", { text: "He" });
        tick(100);
        actions.updateProps("t1", { text: "Hey" });

        expect(store.getState().document.blocks.t1.props.text).toBe("Hey");
        expect(store.getState().history.past).toHaveLength(1);

        actions.undo();
        expect(store.getState().document.blocks.t1.props.text).toBe("Hello");
    });

    it("starts a new undo step after the coalescing window", () => {
        const { store, tick } = makeStore();
        const { actions } = store.getState();

        actions.updateProps("t1", { text: "A" });
        tick(2000);
        actions.updateProps("t1", { text: "B" });
        expect(store.getState().history.past).toHaveLength(2);
    });
});

describe("undo / redo", () => {
    it("restores document and selection, notifying the host", () => {
        const onChange = vi.fn();
        const onSelectionChange = vi.fn();
        const { store } = makeStore({ callbacks: { onChange, onSelectionChange } });
        const { actions } = store.getState();
        const original = store.getState().document;

        actions.select("sec1");
        const blockId = actions.insertBlock("text", at);
        onChange.mockClear();
        onSelectionChange.mockClear();

        actions.undo();
        expect(store.getState().document).toBe(original);
        expect(store.getState().selectedId).toBe("sec1");
        expect(onChange).toHaveBeenCalledOnce();
        expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith("sec1");

        actions.redo();
        expect(store.getState().document.blocks[blockId as string]).toBeDefined();
        expect(store.getState().selectedId).toBe(blockId);

        actions.redo(); // empty future — no-op
        expect(onChange).toHaveBeenCalledTimes(2);
    });
});

describe("loadDocument & external sync", () => {
    it("loadDocument records history and drops a dangling selection", () => {
        const { store } = makeStore();
        const { actions } = store.getState();
        actions.select("t1");

        const doc = exampleDoc();
        doc.blocks = { root: block({ id: "root", type: "root", children: { main: [] } }) };
        actions.loadDocument(doc);

        expect(store.getState().selectedId).toBeNull();
        expect(store.getState().history.past).toHaveLength(1);
        expect(() => actions.loadDocument({ ...doc, version: 99 })).toThrow(/newer/);
    });

    it("syncExternalDocument replaces without onChange and clears history", () => {
        const onChange = vi.fn();
        const { store } = makeStore({ callbacks: { onChange } });
        const { actions } = store.getState();
        actions.insertBlock("text", at); // selects the new block
        actions.select("t1");
        onChange.mockClear();

        const external = exampleDoc();
        syncExternalDocument(store, external, testRegistry);

        expect(store.getState().document).toBe(external);
        expect(store.getState().history.past).toHaveLength(0);
        expect(store.getState().selectedId).toBe("t1"); // still exists in the new doc
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe("inline editing", () => {
    it("startEditing selects the block and records the target", () => {
        const { store } = makeStore();
        const { actions } = store.getState();

        actions.startEditing("t1", "content");
        expect(store.getState().editing).toEqual({ blockId: "t1", field: "content" });
        expect(store.getState().selectedId).toBe("t1");
    });

    it("startEditing on a missing block is a no-op", () => {
        const { store } = makeStore();
        store.getState().actions.startEditing("ghost", "content");
        expect(store.getState().editing).toBeNull();
    });

    it("selecting another block (or nothing) ends the session; same block keeps it", () => {
        const { store } = makeStore();
        const { actions } = store.getState();
        actions.startEditing("t1", "content");

        actions.select("t1");
        expect(store.getState().editing).not.toBeNull();

        actions.select("sec1");
        expect(store.getState().editing).toBeNull();

        actions.startEditing("t1", "content");
        actions.select(null);
        expect(store.getState().editing).toBeNull();
    });

    it("a drag start ends the session", () => {
        const { store } = makeStore();
        const { actions } = store.getState();
        actions.startEditing("t1", "content");

        actions.setDrag({ kind: "move-block", blockId: "sec1" });
        expect(store.getState().editing).toBeNull();
    });

    it("removing the edited block ends the session", () => {
        const { store } = makeStore();
        const { actions } = store.getState();
        actions.startEditing("t1", "content");

        actions.removeBlock("t1");
        expect(store.getState().editing).toBeNull();
    });

    it("undo and redo end the session (the mounted editor must never go stale)", () => {
        const { store, tick } = makeStore();
        const { actions } = store.getState();
        actions.updateProps("t1", { text: "changed" });
        tick(1000);

        actions.startEditing("t1", "content");
        actions.undo();
        expect(store.getState().editing).toBeNull();

        actions.startEditing("t1", "content");
        actions.redo();
        expect(store.getState().editing).toBeNull();
    });

    it("loadDocument and syncExternalDocument end the session", () => {
        const { store } = makeStore();
        const { actions } = store.getState();

        actions.startEditing("t1", "content");
        actions.loadDocument(exampleDoc());
        expect(store.getState().editing).toBeNull();

        actions.startEditing("t1", "content");
        syncExternalDocument(store, exampleDoc(), testRegistry);
        expect(store.getState().editing).toBeNull();
    });

    it("stopEditing ends the session and keeps the selection", () => {
        const { store } = makeStore();
        const { actions } = store.getState();
        actions.startEditing("t1", "content");

        actions.stopEditing();
        expect(store.getState().editing).toBeNull();
        expect(store.getState().selectedId).toBe("t1");
    });
});

describe("merge tags", () => {
    it("defaults to an empty list and accepts a configured one", () => {
        const { store } = makeStore();
        expect(store.getState().mergeTags).toEqual([]);

        const tags = [{ token: "{{first_name}}", label: "First name" }];
        const configured = createEditorStore({ registry: testRegistry, document: exampleDoc(), mergeTags: tags });
        expect(configured.getState().mergeTags).toBe(tags);
    });

    it("survives undo — editor configuration, not document state", () => {
        const tags = [{ token: "{{x}}", label: "X" }];
        const store = createEditorStore({ registry: testRegistry, document: exampleDoc(), mergeTags: tags });
        const { actions } = store.getState();
        actions.updateProps("t1", { text: "changed" });
        actions.undo();
        expect(store.getState().mergeTags).toBe(tags);
    });
});
