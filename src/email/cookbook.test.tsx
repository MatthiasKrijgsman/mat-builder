import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
    defaultBackground,
    defaultLayout,
    defaultSize,
    defaultSpacing,
    paddingToCss,
    richTextParagraph,
    slot,
    symmetricSides,
    type BlockSpec,
    type BackgroundValue,
    type SpacingValue,
} from "../index.tsx";
import { renderEmail } from "./render.ts";
import type { BuilderDocument } from "../core/types.ts";

/*
 * The cookbook's recipes, executed — docs/guides/custom-blocks.md.
 *
 * The doc's examples typecheck against `dist` as part of writing it; these
 * assert they actually RENDER, so a change that quietly breaks a documented
 * recipe fails here rather than in a consumer's inbox.
 */

/* ── §4: the composed recipe ─────────────────────────────────────── */

interface ProductCardProps {
    title: string;
    price: string;
    imageSrc: string;
    ctaLabel: string;
    ctaHref: string;
    background: BackgroundValue;
    spacing: SpacingValue;
}

const productCardDefaults: ProductCardProps = {
    title: richTextParagraph("Ceramic pour-over kettle"),
    price: "€49,00",
    imageSrc: "https://example.com/placeholder.png",
    ctaLabel: "Add to bag",
    ctaHref: "https://example.com/product",
    background: { ...defaultBackground, type: "solid", color: "#FAFAF9" },
    spacing: { padding: symmetricSides(20, 20), margin: defaultSpacing.margin },
};

const composeProductCard = (props: ProductCardProps): BlockSpec => ({
    type: "container",
    props: {
        direction: "vertical",
        background: props.background,
        spacing: props.spacing,
        layout: { ...defaultLayout, gap: 12 },
    },
    children: {
        content: [
            { type: "image", props: { src: props.imageSrc, size: { ...defaultSize, width: "full" } } },
            { type: "text", props: { content: props.title }, bind: { content: "title" } },
            { type: "text", props: { content: richTextParagraph(props.price) } },
            { type: "button", props: { label: props.ctaLabel, href: props.ctaHref }, bind: { label: "ctaLabel" } },
            { type: "container", children: { content: slot("extras") } },
        ],
    },
});

const productCardEntry = {
    type: "product-card",
    defaultProps: productCardDefaults,
    compose: composeProductCard,
};

/* ── §6: the primitive recipe ────────────────────────────────────── */

interface BadgeProps { label: string; color: string; spacing: SpacingValue }
const badgeDefaults: BadgeProps = { label: "New", color: "#18181B", spacing: defaultSpacing };
const badgeStyles = (props: BadgeProps) => ({
    ...paddingToCss(props.spacing),
    backgroundColor: props.color,
    color: "#fff",
    borderRadius: 999,
});
const badgeEntry = {
    type: "badge",
    defaultProps: badgeDefaults,
    render: (props: BadgeProps) => createElement("span", { style: badgeStyles(props) }, props.label),
};

function doc(childIds: string[], blocks: BuilderDocument["blocks"]): BuilderDocument {
    return {
        version: 1,
        rootId: "root",
        blocks: {
            root: { id: "root", type: "email-root", props: {}, children: { main: childIds } },
            ...blocks,
        },
    };
}

describe("§4 composed recipe", () => {
    it("renders every prop into the output", async () => {
        const document = doc(["c"], { c: { id: "c", type: "product-card", props: {}, children: { extras: [] } } });
        const { html } = await renderEmail(document, { blocks: [productCardEntry] });
        expect(html).toContain("Ceramic pour-over kettle");
        expect(html).toContain("€49,00");
        expect(html).toContain("Add to bag");
        expect(html).toContain("https://example.com/product");
    });

    it("composes to the shape the doc describes", () => {
        const spec = composeProductCard(productCardDefaults);
        expect(spec.type).toBe("container");
        expect(spec.children?.content).toHaveLength(5);
    });
});

describe("§6 primitive recipe", () => {
    it("renders through a `render` entry, with defaults filled in", async () => {
        const document = doc(["b"], { b: { id: "b", type: "badge", props: {}, children: {} } });
        const { html } = await renderEmail(document, { blocks: [badgeEntry] });
        expect(html).toContain("New");
        expect(html).toContain("#18181B");
    });

    it("takes stored props over defaults", async () => {
        const document = doc(["b"], { b: { id: "b", type: "badge", props: { label: "Sale" }, children: {} } });
        const { html } = await renderEmail(document, { blocks: [badgeEntry] });
        expect(html).toContain("Sale");
    });
});

describe("§4.2 the shallow-merge hazard the doc warns about", () => {
    it("a partial nested value drops the block's other defaults", async () => {
        // The doc's warning, made executable: a spec that sets only `gap`
        // replaces the whole layout value, losing the centring.
        const centred = { ...defaultLayout, horizontal: "center" as const };
        const bad: BlockSpec = { type: "container", props: { layout: { gap: 12 } } };
        const good: BlockSpec = { type: "container", props: { layout: { ...centred, gap: 12 } } };
        expect((bad.props!.layout as Record<string, unknown>).horizontal).toBeUndefined();
        expect((good.props!.layout as Record<string, unknown>).horizontal).toBe("center");
    });
});

describe("§11 troubleshooting: forgetting `blocks`", () => {
    it("renders the composed block as nothing, silently", async () => {
        const document = doc(["c"], { c: { id: "c", type: "product-card", props: {}, children: { extras: [] } } });
        const { html } = await renderEmail(document);
        expect(html).not.toContain("Add to bag");
    });
});
