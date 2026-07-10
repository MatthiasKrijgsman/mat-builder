"use client";

import {
    BuilderProvider,
    Canvas,
    defaultBackground,
    defaultBorder,
    defaultEffects,
    defaultLayout,
    defaultSize,
    defaultSpacing,
    defaultTypography,
    Inspector,
    LayersPanel,
    Palette,
    richTextMergeTagNode,
    symmetricSides,
    SYSTEM_FONT_STACK,
    UndoRedoButtons,
    uniformSides,
    type BuilderDocument,
    type MergeTag,
} from "@matthiaskrijgsman/mat-builder";
import { emailBlocks, EmailPreview } from "@matthiaskrijgsman/mat-builder/email";
import { TabButtons } from "@matthiaskrijgsman/mat-ui";
import { IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { dottedSurface, floatingPanel, transparentSurface } from "../floating-chrome";

/*
 * The email builder (docs/06): the ./email preset + preview mode.
 * Edit shows the canvas (editRender); Preview shows the real react-email
 * output in an iframe at desktop/mobile widths.
 */

/** Consumer-provided personalization tokens (docs/06 §merge tags) — the
 * Mailchimp-style entry proves the library assumes no delimiter syntax. */
const mergeTags: MergeTag[] = [
    { token: "{{first_name}}", label: "First name", group: "Contact" },
    { token: "{{last_name}}", label: "Last name", group: "Contact" },
    { token: "{{invoice_url}}", label: "Invoice URL", group: "Billing" },
    { token: "*|COMPANY|*", label: "Company", group: "Billing" },
    { token: "{{unsubscribe_url}}", label: "Unsubscribe URL" },
];

/*
 * Sample document — a fictional "Northwind" July invoice. Deliberately uses
 * every block type in the preset (image, rich text with merge-tag chips,
 * table, button, spacer, columns, divider) so the demo doubles as a visual
 * smoke test.
 */

const text = (t: string, style = "") => ({ type: "text", version: 1, detail: 0, format: 0, mode: "normal", style, text: t });
const paragraph = (children: unknown[], align = "") => ({ type: "paragraph", version: 1, children, direction: null, format: align, indent: 0 });
const heading = (tag: "h1" | "h2" | "h3", children: unknown[], align = "") => ({ type: "heading", version: 1, tag, children, direction: null, format: align, indent: 0 });
const richDoc = (...children: unknown[]) => JSON.stringify({ root: { type: "root", version: 1, children, direction: null, format: "", indent: 0 } });

const MUTED = "color: #78716c";
const SMALL_MUTED = "font-size: 12px;color: #a1a1aa";

const heroContent = richDoc(
    heading("h2", [text("Your July invoice is ready", "color: #18181b")]),
    paragraph([
        text("Hi "),
        richTextMergeTagNode("{{first_name}}", "First name"),
        text(" — thanks for building with Northwind. Here\u2019s the monthly summary for "),
        richTextMergeTagNode("*|COMPANY|*", "Company"),
        text(": everything at a glance, no surprises."),
    ]),
);

const invoiceLabel = richDoc(
    paragraph([text("INVOICE \u2014 JULY 2026", "font-size: 12px;letter-spacing: 2px;font-weight: 600;color: #a1a1aa")]),
);

const invoiceNote = richDoc(
    paragraph([text("All amounts in EUR. VAT (21%) included where applicable.", SMALL_MUTED)]),
);

const ctaContent = richDoc(
    paragraph([text("Auto-pay is scheduled for August 1st", "font-size: 18px;font-weight: 600;color: #ffffff")], "center"),
    paragraph([text("No action needed \u2014 or review the invoice first:", "font-size: 13px;color: #a1a1aa")], "center"),
);

const questionsContent = richDoc(
    paragraph([text("Questions?", "font-weight: 600;color: #18181b")]),
    paragraph([text("Just reply to this email \u2014 a human answers within a day.", SMALL_MUTED)]),
);

const billingContent = richDoc(
    paragraph([text("Billed to", "font-weight: 600;color: #18181b")]),
    paragraph([
        richTextMergeTagNode("*|COMPANY|*", "Company"),
        text(" \u00b7 attn. ", SMALL_MUTED),
        richTextMergeTagNode("{{first_name}}", "First name"),
        text(" ", SMALL_MUTED),
        richTextMergeTagNode("{{last_name}}", "Last name"),
    ]),
);

const footerContent = richDoc(
    paragraph([text("Northwind Cloud BV \u00b7 Herengracht 100 \u00b7 Amsterdam", SMALL_MUTED)], "center"),
    paragraph([
        text("You receive invoice emails for your active subscription. Prefer fewer emails? ", SMALL_MUTED),
        richTextMergeTagNode("{{unsubscribe_url}}", "Unsubscribe URL"),
    ], "center"),
);

/** Neutral section style-group values — spread and override per section. */
const sectionBase = {
    size: { ...defaultSize, width: "full" as const },
    background: defaultBackground,
    border: defaultBorder,
    spacing: { padding: symmetricSides(24, 24), margin: uniformSides(0) },
    effects: defaultEffects,
    layout: defaultLayout,
};

const textBase = { spacing: defaultSpacing, effects: defaultEffects, layout: defaultLayout };

const initialDocument: BuilderDocument = {
    version: 1,
    rootId: "root",
    blocks: {
        root: {
            id: "root",
            type: "email-root",
            props: {
                backgroundColor: "#f4f4f5",
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                contentWidth: 600,
                spacing: { padding: symmetricSides(32, 12), margin: uniformSides(0) },
                typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK },
                previewText: "Your July invoice \u2014 \u20ac97.00, auto-pay on August 1st",
            },
            children: { main: ["brand", "hero", "invoice", "cta", "details", "footer"] },
        },

        /* Brand row */
        brand: {
            id: "brand",
            type: "section",
            props: { ...sectionBase, spacing: { padding: symmetricSides(20, 24), margin: uniformSides(0) } },
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
            type: "section",
            props: { ...sectionBase, layout: { ...defaultLayout, gap: 16 } },
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
            type: "section",
            props: {
                ...sectionBase,
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
        "invoice-table": {
            id: "invoice-table",
            type: "table",
            props: {
                cells: [
                    ["Item", "Qty", "Amount"],
                    ["Pro plan", "1", "\u20ac49.00"],
                    ["Additional seats", "4", "\u20ac36.00"],
                    ["Priority support", "1", "\u20ac12.00"],
                    ["Total", "", "\u20ac97.00"],
                ],
                headerRow: true,
                headerBackground: "#f4f4f5",
                cellPadding: 10,
                border: { width: uniformSides(1), style: "solid" as const, color: "#e7e5e4", radius: 8 },
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },
        "invoice-note": {
            id: "invoice-note",
            type: "text",
            props: { ...textBase, content: invoiceNote },
            children: {},
        },

        /* CTA: dark card with button */
        cta: {
            id: "cta",
            type: "section",
            props: {
                ...sectionBase,
                background: { ...defaultBackground, type: "solid", color: "#1c1917" },
                border: { ...defaultBorder, radius: 12 },
                spacing: { padding: symmetricSides(28, 28), margin: { top: 16, right: 24, bottom: 16, left: 24 } },
                layout: { ...defaultLayout, horizontal: "center" as const, gap: 16 },
            },
            children: { content: ["cta-copy", "cta-button"] },
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

        /* Details: two columns */
        details: {
            id: "details",
            type: "columns",
            props: {
                ratio: "50/50",
                layout: { ...defaultLayout, gap: 24 },
                background: defaultBackground,
                border: defaultBorder,
                spacing: { padding: symmetricSides(8, 24), margin: uniformSides(0) },
                effects: defaultEffects,
            },
            children: { "col-1": ["details-questions"], "col-2": ["details-billing"] },
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
            type: "section",
            props: {
                ...sectionBase,
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

type Mode = "edit" | "preview";

export default function EmailBuilderPage() {
    const [mode, setMode] = useState<Mode>("edit");

    return (
        <BuilderProvider blocks={emailBlocks} defaultValue={initialDocument} mergeTags={mergeTags}>
            {/* One continuous dotted surface; the top bar and panels float over it */}
            <div className="relative h-screen" style={dottedSurface}>
                <MainArea mode={mode} onModeChange={setMode} />
            </div>
        </BuilderProvider>
    );
}

/** Floating app bar at the top of the center column, offset from the side
 * panels by the same 16px the panels keep from the window edge. Sits in
 * flow above the canvas so the artboard fits (and resize-clamps) against
 * it rather than expanding underneath. The title mirrors the panels'
 * PanelHeader look (1.125rem semibold) so the bar reads as the same chrome. */
function TopBar({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
    return (
        <header className={`z-30 mx-4 mt-4 flex shrink-0 items-center gap-3 pl-5 pr-3 py-2 ${floatingPanel}`}>
            <h1 className="text-[1.125rem] font-semibold">Email builder</h1>
            <div className="ml-auto flex items-center gap-3">
                <TabButtons
                    size="sm"
                    tabs={(["edit", "preview"] as const).map((value) => ({
                        label: value === "edit" ? "Edit" : "Preview",
                        active: mode === value,
                        onClick: () => onModeChange(value),
                    }))}
                />
                <UndoRedoButtons />
            </div>
        </header>
    );
}

function MainArea({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
    return (
        <div className="absolute inset-0">
            {/* Center column: top bar in flow, canvas filling the rest — the
                canvas surface starts below the bar, so the artboard cannot
                expand behind it. Wrapper, not className: the Artboard root is
                position:relative itself. transparentSurface lets the root's
                dot layer show through, so there is no phase seam where the
                canvas meets the app background */}
            <div
                className="absolute inset-y-0 left-[416px] right-[416px] flex flex-col"
                style={transparentSurface}
            >
                <TopBar mode={mode} onModeChange={onModeChange} />
                <div className="min-h-0 flex-1">
                    {mode === "edit" ? (
                        <Canvas className="h-full" artboardWidth={640} />
                    ) : (
                        <EmailPreview className="h-full" initialWidth={640} />
                    )}
                </div>
            </div>
            <aside className="pointer-events-none absolute inset-y-4 left-4 z-30 flex w-[400px] flex-col gap-4">
                <Palette className={`pointer-events-auto min-h-0 flex-1 ${floatingPanel}`} />
                <LayersPanel className={`pointer-events-auto h-2/5 shrink-0 ${floatingPanel}`} />
            </aside>
            <Inspector className={`absolute inset-y-4 right-4 z-30 w-[400px] ${floatingPanel}`} />
        </div>
    );
}
