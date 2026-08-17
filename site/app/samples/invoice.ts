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
 * A fictional "Northwind" July invoice. Deliberately uses every block type in
 * the preset (image, rich text with merge-tag chips, table, button, spacer, a
 * horizontal container, divider) so the demo doubles as a visual smoke test.
 */

/** Consumer-provided personalization tokens (docs/06 §merge tags) — the
 * Mailchimp-style entry proves the library assumes no delimiter syntax. */
const mergeTags: MergeTag[] = [
    { token: "{{first_name}}", label: "First name", group: "Contact" },
    { token: "{{last_name}}", label: "Last name", group: "Contact" },
    { token: "{{invoice_url}}", label: "Invoice URL", group: "Billing" },
    { token: "*|COMPANY|*", label: "Company", group: "Billing" },
    // A closed set of values, so visibility rules and the preview data sheet
    // offer a dropdown instead of a free-text field (docs/06 §merge tags)
    { token: "{{plan}}", label: "Plan", group: "Billing", values: ["Free", "Pro", "Enterprise"] },
    { token: "{{unsubscribe_url}}", label: "Unsubscribe URL" },
];

const SMALL_MUTED = "font-size: 12px;color: #a1a1aa";

const heroContent = richDoc(
    heading("h2", [text("Your July invoice is ready", "color: #18181b")]),
    paragraph([
        text("Hi "),
        richTextMergeTagNode("{{first_name}}", "First name"),
        text(" — thanks for building with Northwind. Here’s the monthly summary for "),
        richTextMergeTagNode("*|COMPANY|*", "Company"),
        text(": everything at a glance, no surprises."),
    ]),
);

const invoiceLabel = richDoc(
    paragraph([text("INVOICE — JULY 2026", "font-size: 12px;letter-spacing: 2px;font-weight: 600;color: #a1a1aa")]),
);

const invoiceNote = richDoc(
    paragraph([text("All amounts in EUR. VAT (21%) included where applicable.", SMALL_MUTED)]),
);

const ctaContent = richDoc(
    paragraph([text("Auto-pay is scheduled for August 1st", "font-size: 18px;font-weight: 600;color: #ffffff")], "center"),
    paragraph([text("No action needed — or review the invoice first:", "font-size: 13px;color: #a1a1aa")], "center"),
);

const questionsContent = richDoc(
    paragraph([text("Questions?", "font-weight: 600;color: #18181b")]),
    paragraph([text("Just reply to this email — a human answers within a day.", SMALL_MUTED)]),
);

const billingContent = richDoc(
    paragraph([text("Billed to", "font-weight: 600;color: #18181b")]),
    paragraph([
        richTextMergeTagNode("*|COMPANY|*", "Company", SMALL_MUTED),
        text(" · attn. ", SMALL_MUTED),
        richTextMergeTagNode("{{first_name}}", "First name", SMALL_MUTED),
        text(" ", SMALL_MUTED),
        richTextMergeTagNode("{{last_name}}", "Last name", SMALL_MUTED),
    ]),
);

const footerContent = richDoc(
    paragraph([text("Northwind Cloud BV · Herengracht 100 · Amsterdam", SMALL_MUTED)], "center"),
    paragraph([
        text("You receive invoice emails for your active subscription. Prefer fewer emails? ", SMALL_MUTED),
        richTextMergeTagNode("{{unsubscribe_url}}", "Unsubscribe URL", SMALL_MUTED),
    ], "center"),
);

/* The invoice table — the amount column is right-aligned per cell, and the
 * row variants carry the header fill and the footer's total line. */
const invoiceRows: SampleTableRow[] = [
    { variant: "header", cells: [{ value: "Item" }, { value: "Qty" }, { value: "Amount", align: "right" }] },
    { variant: "body", cells: [{ value: "Pro plan" }, { value: "1" }, { value: "€49.00", align: "right" }] },
    { variant: "body", cells: [{ value: "Additional seats" }, { value: "4" }, { value: "€36.00", align: "right" }] },
    { variant: "body", cells: [{ value: "Priority support" }, { value: "1" }, { value: "€12.00", align: "right" }] },
    { variant: "footer", cells: [{ value: "Total" }, { value: "" }, { value: "€97.00", align: "right" }] },
];

const invoiceTableProps = {
    tableLayout: "auto" as const,
    background: defaultBackground,
    border: { width: uniformSides(1), style: "solid" as const, color: "#e7e5e4", radius: 8 },
    borderMode: "all",
    cellPadding: uniformSides(10),
    stripe: { enabled: false, color: "#fafafa" },
    spacing: defaultSpacing,
    effects: defaultEffects,
};

const document: BuilderDocument = {
    version: 1,
    rootId: "root",
    blocks: {
        root: {
            id: "root",
            type: "email-root",
            props: {
                backgroundColor: "#f4f4f5",
                contentWidth: 600,
                spacing: { padding: symmetricSides(32, 12), margin: uniformSides(0) },
                typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK },
                previewText: "Your July invoice — €97.00, auto-pay on August 1st",
            },
            children: { main: ["page"] },
        },

        /* Page: the root's default white container — owns the content background */
        page: {
            id: "page",
            type: "container",
            props: {
                ...containerBase,
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                spacing: { padding: uniformSides(0), margin: uniformSides(0) },
            },
            children: { content: ["brand", "hero", "invoice", "cta", "details", "footer"] },
        },

        /* Brand row */
        brand: {
            id: "brand",
            type: "container",
            props: { ...containerBase, spacing: { padding: symmetricSides(20, 24), margin: uniformSides(0) } },
            children: { content: ["brand-name"] },
        },
        "brand-name": {
            id: "brand-name",
            type: "text",
            props: {
                ...textBase,
                content: richDoc(
                    paragraph([text("N O R T H W I N D", "font-size: 13px;letter-spacing: 3px;font-weight: 600;color: #57534e")], "center"),
                ),
            },
            children: {},
        },

        /* Hero: image + heading + intro copy */
        hero: {
            id: "hero",
            type: "container",
            props: { ...containerBase, layout: { ...defaultLayout, gap: 16 } },
            children: { content: ["hero-image", "hero-copy"] },
        },
        "hero-image": {
            id: "hero-image",
            type: "image",
            props: {
                src: "https://picsum.photos/seed/northwind-july/1104/400",
                alt: "July at Northwind",
                href: "",
                size: { width: "full" as const, widthPx: 552, height: "hug" as const, heightPx: 200 },
                layout: { ...defaultLayout, horizontal: "center" as const },
                border: { ...defaultBorder, radius: 10 },
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },
        "hero-copy": {
            id: "hero-copy",
            type: "text",
            props: { ...textBase, content: heroContent },
            children: {},
        },

        /* Invoice: label + table + note */
        invoice: {
            id: "invoice",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 8, right: 24, bottom: 8, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, gap: 12 },
            },
            children: { content: ["invoice-label", "invoice-table", "invoice-note"] },
        },
        "invoice-label": {
            id: "invoice-label",
            type: "text",
            props: { ...textBase, content: invoiceLabel },
            children: {},
        },
        ...sampleTableBlocks("invoice-table", invoiceRows, invoiceTableProps),
        "invoice-note": {
            id: "invoice-note",
            type: "text",
            props: { ...textBase, content: invoiceNote },
            children: {},
        },

        /* CTA: dark card with button */
        cta: {
            id: "cta",
            type: "container",
            props: {
                ...containerBase,
                background: { ...defaultBackground, type: "solid", color: "#1c1917" },
                border: { ...defaultBorder, radius: 12 },
                spacing: { padding: symmetricSides(28, 28), margin: { top: 16, right: 24, bottom: 16, left: 24 } },
                layout: { ...defaultLayout, horizontal: "center" as const, gap: 16 },
            },
            children: { content: ["cta-copy", "cta-button"] },
            // Conditional visibility (docs/06): the pay-now card is only worth
            // showing to a paying plan that actually has an invoice to open.
            // Switch to Preview and fill the data sheet to watch it appear.
            visibility: {
                mode: "rules",
                match: "all",
                rules: [
                    { token: "{{plan}}", operator: "eq", value: "Pro" },
                    { token: "{{invoice_url}}", operator: "exists" },
                ],
            },
        },
        "cta-copy": {
            id: "cta-copy",
            type: "text",
            props: { ...textBase, content: ctaContent },
            children: {},
        },
        "cta-button": {
            id: "cta-button",
            type: "button",
            props: {
                label: "View invoice",
                href: "{{invoice_url}}",
                size: defaultSize,
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                border: { ...defaultBorder, radius: 8 },
                typography: { ...defaultTypography, color: "#1c1917", align: "center" as const },
                spacing: { padding: symmetricSides(12, 24), margin: uniformSides(0) },
                layout: { ...defaultLayout, horizontal: "center" as const },
                effects: defaultEffects,
            },
            children: {},
        },

        /* Details: a horizontal container — two equal-width columns */
        details: {
            id: "details",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                layout: { ...defaultLayout, gap: 24 },
                spacing: { padding: symmetricSides(8, 24), margin: uniformSides(0) },
            },
            children: { content: ["details-questions", "details-billing"] },
        },
        "details-questions": {
            id: "details-questions",
            type: "text",
            props: { ...textBase, content: questionsContent },
            children: {},
        },
        "details-billing": {
            id: "details-billing",
            type: "text",
            props: { ...textBase, content: billingContent },
            children: {},
        },

        /* Footer: divider + small print */
        footer: {
            id: "footer",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 8, right: 24, bottom: 24, left: 24 }, margin: uniformSides(0) },
            },
            children: { content: ["footer-divider", "footer-spacer", "footer-copy"] },
        },
        "footer-divider": {
            id: "footer-divider",
            type: "divider",
            props: {
                color: "#e7e5e4",
                thickness: 1,
                spacing: { padding: uniformSides(0), margin: symmetricSides(8, 0) },
            },
            children: {},
        },
        "footer-spacer": {
            id: "footer-spacer",
            type: "spacer",
            props: { height: 8 },
            children: {},
        },
        "footer-copy": {
            id: "footer-copy",
            type: "text",
            props: { ...textBase, content: footerContent },
            children: {},
        },
    },
};

export const invoiceSample: EmailSample = {
    id: "invoice",
    name: "July invoice",
    mergeTags,
    document,
};
