import { describe, expect, it } from "vitest";
import { insertBlock, updateProps } from "../../../core/commands.ts";
import { createDocument, validateDocument } from "../../../core/document.ts";
import { createRegistry } from "../../../core/registry.ts";
import type { BlockId, BuilderDocument } from "../../../core/types.ts";
import { emailBlocks } from "../../index.tsx";
import { renderEmail } from "../../render.ts";
import { richTextParagraph } from "../../rich-text/index.ts";

/*
 * Data table SPIKE — the decomposed table's output. These cover the parts the
 * decomposition put at risk: the seeded subtree, and whether a cell can still
 * resolve table-level styling (borders, stripes) now that it lives two blocks
 * away from it.
 */

const registry = createRegistry(emailBlocks);

/** email-root > container > data-table, built through the real preset. */
function buildTableEmail(): { document: BuilderDocument; tableId: BlockId } {
    const document = createDocument(registry, "email-root");
    const containerId = document.blocks[document.rootId].children.main[0];
    const inserted = insertBlock(
        document,
        { type: "data-table", at: { parentId: containerId, container: "content", index: 0 } },
        registry,
    );
    return { document: inserted.document, tableId: inserted.blockId };
}

const rowIds = (document: BuilderDocument, tableId: BlockId) => document.blocks[tableId].children.rows;
const cellIds = (document: BuilderDocument, rowId: BlockId) => document.blocks[rowId].children.cells;

/** The data table's own `<tr>` chunks — react-email wraps everything else in
 * layout tables, so matching `<tr` document-wide would count those too. */
function tableRowsOf(html: string): string[] {
    // `table-layout` is emitted only by the data table, so it pins down which
    // of react-email's many nested tables is ours.
    const start = html.indexOf("table-layout:");
    const body = html.slice(start, html.indexOf("</table>", start));
    return body.split("<tr").slice(1);
}

describe("data table (spike)", () => {
    it("seeds a header row plus body rows, each with cells holding a text block", () => {
        const { document, tableId } = buildTableEmail();
        const rows = rowIds(document, tableId);
        expect(rows).toHaveLength(3);
        expect(document.blocks[rows[0]].props.variant).toBe("header");
        expect(document.blocks[rows[1]].props.variant).toBe("body");

        const cells = cellIds(document, rows[0]);
        expect(cells).toHaveLength(3);
        const [firstCell] = cells;
        const content = document.blocks[firstCell].children.content;
        expect(content).toHaveLength(1);
        expect(document.blocks[content[0]].type).toBe("text");
    });

    it("keeps the parent's seeded cell text instead of each child's onCreate default", () => {
        const { document, tableId } = buildTableEmail();
        const headerCells = cellIds(document, rowIds(document, tableId)[0]);
        const texts = headerCells.map((cellId) => {
            const textId = document.blocks[cellId].children.content[0];
            return document.blocks[textId].props.content as string;
        });
        expect(texts).toEqual([
            richTextParagraph("Item"),
            richTextParagraph("Description"),
            richTextParagraph("Amount"),
        ]);
    });

    it("produces a document that passes validation", () => {
        const { document } = buildTableEmail();
        expect(validateDocument(document, registry)).toEqual([]);
    });

    it("emits table/tbody/tr/td with the header fill as style AND bgcolor", async () => {
        const { document } = buildTableEmail();
        const { html } = await renderEmail(document);
        expect(html).toContain("<tbody>");
        expect(html).toMatch(/<tr[^>]*bgcolor="#f4f4f5"/);
        expect(html).toMatch(/background-color:#f4f4f5/);
    });

    it("resolves table-level borders from inside a cell, two blocks away", async () => {
        const { document } = buildTableEmail();
        const { html } = await renderEmail(document);
        // Default borderMode "all", 1px — every cell paints right+bottom
        expect(html).toMatch(/<td[^>]*border-bottom:1px solid #e4e4e7/);
    });

    it("honours the table's borderMode from the cells", async () => {
        const { document, tableId } = buildTableEmail();
        const next = updateProps(document, { id: tableId, patch: { borderMode: "none" } });
        const { html } = await renderEmail(next);
        expect(html).not.toContain("border-bottom:1px solid");
    });

    it("stripes only body rows, counting body rows rather than all rows", async () => {
        const { document, tableId } = buildTableEmail();
        const next = updateProps(document, {
            id: tableId,
            patch: { stripe: { enabled: true, color: "#eeeeee" } },
        });
        const { html } = await renderEmail(next);
        // Rows are [header, body0, body1]; body1 is the odd BODY row, so the
        // stripe must land on the last row only — striping the middle one would
        // mean the index was counted over all rows, header included.
        const striped = tableRowsOf(html).map((row) => row.includes("#eeeeee"));
        expect(striped).toEqual([false, false, true]);
    });
});
