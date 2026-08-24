import {
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    defaultSpacing,
    defaultTypography,
    richTextMergeTagNode,
    symmetricSides,
    SYSTEM_FONT_STACK,
    uniformSides,
    type BuilderDocument,
    type MergeTag,
} from "@matthiaskrijgsman/mat-builder";
import { containerBase, sampleTableBlocks, textBase, type SampleTableRow } from "./blocks";
import { heading, paragraph, richDoc, text } from "./rich-text";
import type { EmailSample } from "./types";

/*
 * "Aura One" — a fictional product-launch announcement in the restrained
 * consumer-tech style: a white full-bleed sheet, one oversized headline per
 * section, generous vertical rhythm, grey feature cards and a comparison
 * table with hairline rules only.
 *
 * It uses every block in the preset, deliberately — nav and feature grid are
 * horizontal containers, the spec sheet is a table, and the hero pairs a
 * filled button with a borderless one as the quiet secondary action — so
 * whichever sample is open doubles as a visual smoke test. `./northbound` is
 * the colourful counterpart, and covers the gradient and conditional block
 * this one has no use for.
 */

const mergeTags: MergeTag[] = [
    { token: "{{first_name}}", label: "First name", group: "Contact" },
    { token: "{{last_name}}", label: "Last name", group: "Contact" },
    { token: "{{city}}", label: "City", group: "Contact" },
    { token: "{{preorder_url}}", label: "Pre-order URL", group: "Campaign" },
    { token: "{{unsubscribe_url}}", label: "Unsubscribe URL" },
];

/* One palette, used everywhere below: near-black ink, two greys for secondary
 * and legal copy, the accent blue, and the hairline/surface greys. */
const INK = "#1d1d1f";
const SECONDARY = "#6e6e73";
const LEGAL = "#86868b";
const ACCENT = "#0071e3";
const SURFACE = "#f5f5f7";
const HAIRLINE = "#e8e8ed";

const CAPTION = `font-size: 14px;color: ${SECONDARY}`;
const LEGAL_TEXT = `font-size: 12px;color: ${LEGAL}`;
const FEATURE_TITLE = `font-size: 19px;font-weight: 600;color: ${INK}`;

const navBrand = richDoc(
    paragraph([text("A U R A", `font-size: 13px;letter-spacing: 3px;font-weight: 600;color: ${INK}`)]),
);

const navLinks = richDoc(
    paragraph([text("Store · Support", `font-size: 12px;color: ${SECONDARY}`)], "right"),
);

/* Hero: eyebrow, the one big headline, tagline, then the availability line —
 * four paragraphs in a single text block so the rich text's own margins do
 * the spacing rather than four blocks and a container gap. */
const heroCopy = richDoc(
    paragraph([text("NEW", `font-size: 12px;letter-spacing: 2px;font-weight: 600;color: ${ACCENT}`)], "center"),
    heading("h1", [text("Aura One", `font-size: 44px;font-weight: 600;letter-spacing: -1px;color: ${INK}`)], "center"),
    paragraph([text("Titanium. Featherlight. Unmistakably Aura.", `font-size: 20px;color: ${SECONDARY}`)], "center"),
    paragraph(
        [
            text("Pre-order from August 8 in ", LEGAL_TEXT),
            richTextMergeTagNode("{{city}}", "City", LEGAL_TEXT),
            text(".", LEGAL_TEXT),
        ],
        "center",
    ),
);

const chipCopy = richDoc(
    paragraph([text("Aura A1 chip", FEATURE_TITLE)]),
    // Both cards keep their copy to two lines at 600px: the columns are
    // top-aligned in the email render, so uneven copy leaves uneven cards
    paragraph([text("Our fastest neural engine yet — and the most efficient.", CAPTION)]),
);

const batteryCopy = richDoc(
    paragraph([text("All-day battery", FEATURE_TITLE)]),
    paragraph([text("Up to 29 hours of video. 50% charge in 20 minutes.", CAPTION)]),
);

const specsTitle = richDoc(
    heading("h3", [text("Which Aura is for you?", `font-size: 26px;font-weight: 600;letter-spacing: -0.5px;color: ${INK}`)], "center"),
    paragraph([text("Two sizes. One obsession with detail.", CAPTION)], "center"),
);

const specsNote = richDoc(
    paragraph([text("Prices include VAT. Availability varies by region.", LEGAL_TEXT)], "center"),
);

const tradeCopy = richDoc(
    paragraph([text("Trade in your Aura Zero", "font-size: 24px;font-weight: 600;letter-spacing: -0.5px;color: #f5f5f7")], "center"),
    paragraph(
        [
            richTextMergeTagNode("{{first_name}}", "First name", "font-size: 15px;color: #a1a1a6"),
            text(", your device is worth up to €420 in credit when you pre-order.", "font-size: 15px;color: #a1a1a6"),
        ],
        "center",
    ),
);

const footerCopy = richDoc(
    paragraph([text("Aura Europe BV · Keizersgracht 62 · Amsterdam", LEGAL_TEXT)], "center"),
    paragraph(
        [
            text("You get product announcements because you asked to hear about new Aura releases. ", LEGAL_TEXT),
            richTextMergeTagNode("{{unsubscribe_url}}", "Unsubscribe URL", LEGAL_TEXT),
        ],
        "center",
    ),
    paragraph([text("© 2026 Aura Inc. All rights reserved.", LEGAL_TEXT)], "center"),
);

/* The comparison table: hairline horizontal rules, no fills except the price
 * row — the header keeps a white fill so it drops the variant's grey. */
const SPEC_LABEL = `font-size: 13px;color: ${SECONDARY}`;
const SPEC_VALUE = `font-size: 14px;color: ${INK}`;
const SPEC_HEAD = `font-size: 15px;font-weight: 600;color: ${INK}`;
const SPEC_PRICE = `font-size: 15px;font-weight: 600;color: ${INK}`;

const specRow = (label: string, one: string, pro: string): SampleTableRow => ({
    variant: "body",
    cells: [
        { value: label, style: SPEC_LABEL },
        { value: one, style: SPEC_VALUE, align: "center" },
        { value: pro, style: SPEC_VALUE, align: "center" },
    ],
});

const specRows: SampleTableRow[] = [
    {
        variant: "header",
        background: "#ffffff",
        cells: [
            { value: "", width: "34%" },
            { value: "Aura One", style: SPEC_HEAD, align: "center", width: "33%" },
            { value: "Aura One Pro", style: SPEC_HEAD, align: "center", width: "33%" },
        ],
    },
    specRow("Display", "6.1″ Retina XDR", "6.7″ Retina XDR"),
    specRow("Chip", "Aura A1", "Aura A1 Pro"),
    specRow("Video", "Up to 22 hrs", "Up to 29 hrs"),
    specRow("Finish", "Titanium", "Titanium"),
    {
        variant: "footer",
        background: SURFACE,
        cells: [
            { value: "From", style: SPEC_LABEL },
            { value: "€899", style: SPEC_PRICE, align: "center" },
            { value: "€1,199", style: SPEC_PRICE, align: "center" },
        ],
    },
];

const specsTableProps = {
    tableLayout: "fixed" as const,
    background: defaultBackground,
    border: { width: uniformSides(1), style: "solid" as const, color: HAIRLINE, radius: 0 },
    // Rules between rows only — vertical lines would fight the airy layout
    borderMode: "horizontal",
    cellPadding: symmetricSides(14, 12),
    stripe: { enabled: false, color: SURFACE },
    spacing: defaultSpacing,
    effects: defaultEffects,
};

/** A feature card: grey surface, rounded, image over a title and one line. */
const featureCard = (id: string, seed: string, alt: string, copy: string): BuilderDocument["blocks"] => ({
    [id]: {
        id,
        type: "container",
        props: {
            ...containerBase,
            background: { ...defaultBackground, type: "solid", color: SURFACE },
            border: { ...defaultBorder, radius: 18 },
            spacing: { padding: uniformSides(20), margin: uniformSides(0) },
            layout: { ...defaultLayout, gap: 14 },
        },
        children: { content: [`${id}-image`, `${id}-copy`] },
    },
    [`${id}-image`]: {
        id: `${id}-image`,
        type: "image",
        props: {
            src: `https://picsum.photos/seed/${seed}/720/540`,
            alt,
            href: "",
            size: { width: "full" as const, widthPx: 240, height: "hug" as const, heightPx: 160 },
            layout: { ...defaultLayout, horizontal: "center" as const },
            border: { ...defaultBorder, radius: 12 },
            spacing: defaultSpacing,
            effects: defaultEffects,
        },
        children: {},
    },
    [`${id}-copy`]: {
        id: `${id}-copy`,
        type: "text",
        props: { ...textBase, content: copy },
        children: {},
    },
});

const document: BuilderDocument = {
    version: 1,
    rootId: "root",
    blocks: {
        root: {
            id: "root",
            type: "email-root",
            props: {
                // White page, full bleed: the sheet IS the email, the way a
                // product announcement reads on a phone
                backgroundColor: "#ffffff",
                contentWidth: 600,
                spacing: { padding: uniformSides(0), margin: uniformSides(0) },
                typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK, fontSize: 15, lineHeight: 1.6, color: INK },
            },
            children: { main: ["page"] },
        },

        page: {
            id: "page",
            type: "container",
            props: {
                ...containerBase,
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                spacing: { padding: uniformSides(0), margin: uniformSides(0) },
            },
            children: { content: ["nav", "hero", "hero-spacer", "features", "specs", "trade", "footer"] },
        },

        /* Nav: wordmark left, links right — a horizontal container under a hairline */
        nav: {
            id: "nav",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                border: { ...defaultBorder, width: { top: 0, right: 0, bottom: 1, left: 0 }, color: HAIRLINE },
                spacing: { padding: symmetricSides(16, 24), margin: uniformSides(0) },
                layout: { ...defaultLayout, vertical: "middle" as const, gap: 16 },
            },
            children: { content: ["nav-brand", "nav-links"] },
        },
        "nav-brand": {
            id: "nav-brand",
            type: "text",
            props: { ...textBase, content: navBrand },
            children: {},
        },
        "nav-links": {
            id: "nav-links",
            type: "text",
            props: { ...textBase, content: navLinks },
            children: {},
        },

        /* Hero: headline block, filled CTA, quiet secondary CTA, product shot */
        hero: {
            id: "hero",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 56, right: 24, bottom: 40, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, horizontal: "center" as const, gap: 20 },
            },
            children: { content: ["hero-copy", "hero-buy", "hero-learn", "hero-image"] },
        },
        "hero-copy": {
            id: "hero-copy",
            type: "text",
            props: { ...textBase, content: heroCopy },
            children: {},
        },
        "hero-buy": {
            id: "hero-buy",
            type: "button",
            props: {
                label: "Pre-order",
                href: "{{preorder_url}}",
                size: defaultSize,
                background: { ...defaultBackground, type: "solid", color: ACCENT },
                // Pill: the padding puts the button at ~44px, so 22 rounds it fully
                border: { ...defaultBorder, radius: 22 },
                typography: { ...defaultTypography, color: "#ffffff", align: "center" as const, fontSize: 15 },
                spacing: { padding: symmetricSides(12, 28), margin: uniformSides(0) },
                layout: { ...defaultLayout, horizontal: "center" as const },
                effects: defaultEffects,
            },
            children: {},
        },
        /* Secondary action: a button with no fill and no border — the
         * text-link look, but still a real tap target */
        "hero-learn": {
            id: "hero-learn",
            type: "button",
            props: {
                label: "Learn more ›",
                href: "https://example.com/aura-one",
                size: defaultSize,
                background: defaultBackground,
                border: defaultBorder,
                typography: { ...defaultTypography, color: ACCENT, align: "center" as const, fontSize: 15 },
                spacing: { padding: symmetricSides(4, 8), margin: { top: 0, right: 0, bottom: 8, left: 0 } },
                layout: { ...defaultLayout, horizontal: "center" as const },
                effects: defaultEffects,
            },
            children: {},
        },
        "hero-image": {
            id: "hero-image",
            type: "image",
            props: {
                src: "https://picsum.photos/seed/aura-one-hero/1104/760",
                alt: "Aura One in titanium",
                href: "",
                size: { width: "full" as const, widthPx: 552, height: "hug" as const, heightPx: 380 },
                layout: { ...defaultLayout, horizontal: "center" as const },
                border: { ...defaultBorder, radius: 18 },
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },

        "hero-spacer": {
            id: "hero-spacer",
            type: "spacer",
            props: { height: 8 },
            children: {},
        },

        /* Features: two grey cards side by side — a horizontal container whose
         * children are containers, so each column stacks image over copy */
        features: {
            id: "features",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                spacing: { padding: symmetricSides(0, 24), margin: uniformSides(0) },
                layout: { ...defaultLayout, vertical: "stretch" as const, gap: 16 },
            },
            children: { content: ["feature-chip", "feature-battery"] },
        },
        ...featureCard("feature-chip", "aura-chip", "The Aura A1 chip", chipCopy),
        ...featureCard("feature-battery", "aura-battery", "Aura One charging", batteryCopy),

        /* Specs: title, comparison table, legal note */
        specs: {
            id: "specs",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 48, right: 24, bottom: 16, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, gap: 20 },
            },
            children: { content: ["specs-title", "specs-table", "specs-note"] },
        },
        "specs-title": {
            id: "specs-title",
            type: "text",
            props: { ...textBase, content: specsTitle },
            children: {},
        },
        ...sampleTableBlocks("specs-table", specRows, specsTableProps),
        "specs-note": {
            id: "specs-note",
            type: "text",
            props: { ...textBase, content: specsNote },
            children: {},
        },

        /* Trade-in: the one dark card, personalized by merge tag */
        trade: {
            id: "trade",
            type: "container",
            props: {
                ...containerBase,
                background: { ...defaultBackground, type: "solid", color: INK },
                border: { ...defaultBorder, radius: 18 },
                spacing: { padding: symmetricSides(36, 32), margin: { top: 32, right: 24, bottom: 24, left: 24 } },
                layout: { ...defaultLayout, horizontal: "center" as const, gap: 20 },
            },
            children: { content: ["trade-copy", "trade-button"] },
        },
        "trade-copy": {
            id: "trade-copy",
            type: "text",
            props: { ...textBase, content: tradeCopy },
            children: {},
        },
        "trade-button": {
            id: "trade-button",
            type: "button",
            props: {
                label: "Get your estimate",
                href: "https://example.com/aura-trade-in",
                size: defaultSize,
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                border: { ...defaultBorder, radius: 22 },
                typography: { ...defaultTypography, color: INK, align: "center" as const, fontSize: 15 },
                spacing: { padding: symmetricSides(12, 28), margin: uniformSides(0) },
                layout: { ...defaultLayout, horizontal: "center" as const },
                effects: defaultEffects,
            },
            children: {},
        },

        /* Footer: hairline, then the small print */
        footer: {
            id: "footer",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 8, right: 24, bottom: 40, left: 24 }, margin: uniformSides(0) },
            },
            children: { content: ["footer-divider", "footer-spacer", "footer-copy"] },
        },
        "footer-divider": {
            id: "footer-divider",
            type: "divider",
            props: {
                color: HAIRLINE,
                thickness: 1,
                spacing: { padding: uniformSides(0), margin: symmetricSides(8, 0) },
            },
            children: {},
        },
        "footer-spacer": {
            id: "footer-spacer",
            type: "spacer",
            props: { height: 12 },
            children: {},
        },
        "footer-copy": {
            id: "footer-copy",
            type: "text",
            props: { ...textBase, content: footerCopy },
            children: {},
        },
    },
};

export const auraOneSample: EmailSample = {
    id: "aura-one",
    name: "Aura One launch",
    mergeTags,
    document,
};
