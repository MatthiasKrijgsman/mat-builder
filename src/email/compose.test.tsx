import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { defineBlock, slot } from "../core/index.ts";
import type { BuilderDocument, BlockSpec } from "../core/types.ts";
import { renderEmail } from "./render.ts";
import { richTextParagraph } from "./rich-text/index.ts";
import type { EmailBlockOverride } from "./types.ts";

/*
 * Composed blocks, output side — docs/08 §4.
 *
 * The promise being tested is that a consumer writes NO renderer: every byte
 * of a composed block's HTML comes from preset blocks that already know how
 * to be email.
 */

interface ProductCardProps {
    title: string;
    price: string;
    ctaLabel: string;
    ctaHref: string;
}

const productCardDefaults: ProductCardProps = {
    title: richTextParagraph("Product"),
    price: "€0",
    ctaLabel: "Buy",
    ctaHref: "https://example.com",
};

const composeProductCard = (props: ProductCardProps): BlockSpec => ({
    type: "container",
    props: { direction: "vertical" },
    children: {
        content: [
            { type: "text", props: { content: props.title }, bind: { content: "title" } },
            { type: "text", props: { content: richTextParagraph(props.price) } },
            {
                type: "button",
                props: { label: props.ctaLabel, href: props.ctaHref },
                bind: { label: "ctaLabel" },
            },
        ],
    },
});

const productCard: EmailBlockOverride<ProductCardProps> = {
    type: "product-card",
    defaultProps: productCardDefaults,
    compose: composeProductCard,
};

/** A composite exposing a slot for arbitrary content. */
const calloutDefaults = { heading: richTextParagraph("Note") };
const callout: EmailBlockOverride<typeof calloutDefaults> = {
    type: "callout",
    defaultProps: calloutDefaults,
    compose: (props) => ({
        type: "container",
        children: {
            content: [
                { type: "text", props: { content: props.heading } },
                { type: "container", children: { content: slot("body") } },
            ],
        },
    }),
};

function doc(blocks: BuilderDocument["blocks"], childIds: string[]): BuilderDocument {
    return {
        version: 1,
        rootId: "root",
        blocks: {
            root: { id: "root", type: "email-root", props: {}, children: { main: childIds } },
            ...blocks,
        },
    };
}

const cardDoc = (props: Partial<ProductCardProps> = {}) =>
    doc({ card: { id: "card", type: "product-card", props, children: {} } }, ["card"]);

describe("composed blocks in the output", () => {
    it("renders from the blocks it composes, with no renderer of its own", async () => {
        const { html } = await renderEmail(cardDoc({ title: richTextParagraph("Kettle"), price: "€49", ctaLabel: "Add to bag" }), {
            blocks: [productCard],
        });
        expect(html).toContain("Kettle");
        expect(html).toContain("€49");
        expect(html).toContain("Add to bag");
        // The button's href came through the composed tree
        expect(html).toContain("https://example.com");
    });

    it("fills unset props from the composite's defaults", async () => {
        const { html } = await renderEmail(cardDoc(), { blocks: [productCard] });
        expect(html).toContain("Product");
        expect(html).toContain("€0");
        expect(html).toContain("Buy");
    });

    it("emits table-based markup, because the preset blocks did", async () => {
        const { html } = await renderEmail(cardDoc(), { blocks: [productCard] });
        // The container block renders as a table — a composed block cannot
        // opt out of that, which is the whole safety argument (docs/08 §1)
        expect(html).toContain("<table");
    });

    it("renders nothing when the host forgets to pass the definition", async () => {
        const { html } = await renderEmail(cardDoc());
        expect(html).not.toContain("Product");
    });

    it("splices real children into a slot", async () => {
        const document = doc(
            {
                note: { id: "note", type: "callout", props: {}, children: { body: ["t1"] } },
                t1: { id: "t1", type: "text", props: { content: richTextParagraph("Slotted copy") }, children: {} },
            },
            ["note"],
        );
        const { html } = await renderEmail(document, { blocks: [callout] });
        expect(html).toContain("Note");
        expect(html).toContain("Slotted copy");
    });

    it("resolves a composite that composes another composite", async () => {
        const wrapper: EmailBlockOverride<{ label: string }> = {
            type: "featured-card",
            defaultProps: { label: "Featured" },
            compose: (props) => ({
                type: "container",
                children: {
                    content: [
                        { type: "text", props: { content: richTextParagraph(props.label) } },
                        { type: "product-card", props: { price: "€99" } },
                    ],
                },
            }),
        };
        const document = doc({ f: { id: "f", type: "featured-card", props: {}, children: {} } }, ["f"]);
        const { html } = await renderEmail(document, { blocks: [wrapper, productCard] });
        expect(html).toContain("Featured");
        expect(html).toContain("€99");
    });

    it("survives a composite that composes itself, instead of hanging", async () => {
        const cyclic: EmailBlockOverride = {
            type: "loop",
            defaultProps: {},
            compose: () => ({ type: "loop" }),
        };
        const document = doc({ l: { id: "l", type: "loop", props: {}, children: {} } }, ["l"]);
        await expect(renderEmail(document, { blocks: [cyclic] })).resolves.toBeDefined();
    });

    it("still honours conditional visibility on the composite", async () => {
        const document = cardDoc();
        document.blocks.card.visibility = { mode: "rules", match: "all", rules: [{ token: "{{vip}}", operator: "exists" }] };
        const hidden = await renderEmail(document, { blocks: [productCard], values: {} });
        expect(hidden.html).not.toContain("Buy");
        const shown = await renderEmail(document, { blocks: [productCard], values: { "{{vip}}": "yes" } });
        expect(shown.html).toContain("Buy");
    });

    it("lets a host entry replace a PRESET block's output", async () => {
        const document = doc(
            { t1: { id: "t1", type: "text", props: { content: richTextParagraph("original") }, children: {} } },
            ["t1"],
        );
        const override: EmailBlockOverride = {
            type: "text",
            render: () => createElement("p", null, "replaced"),
        };
        const { html } = await renderEmail(document, { blocks: [override] });
        expect(html).toContain("replaced");
        expect(html).not.toContain("original");
    });
});

describe("a composed definition is the same object the editor registers", () => {
    it("satisfies defineBlock and the render option from one source", () => {
        // The point of the split: `compose` + `defaultProps` live in a
        // server-safe module, and the client spreads them into defineBlock.
        const definition = defineBlock<ProductCardProps>({
            type: productCard.type,
            label: "Product card",
            defaultProps: productCardDefaults,
            compose: composeProductCard,
        });
        expect(definition.compose).toBe(composeProductCard);
        expect(definition.editRender).toBeUndefined();
    });
});
