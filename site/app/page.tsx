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
import { dockedPanel, dottedSurface, transparentSurface } from "./floating-chrome";

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
 * table, button, spacer, a horizontal container, divider) so the demo doubles
 * as a visual smoke test.
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

/** Neutral container style-group values — spread and override per container. */
const containerBase = {
    direction: "vertical" as const,
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
                contentWidth: 600,
                spacing: { padding: symmetricSides(32, 12), margin: uniformSides(0) },
                typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK },
                previewText: "Your July invoice \u2014 \u20ac97.00, auto-pay on August 1st",
            },
            children: { main: ["page"] },
        },

        /* Page: the root's default white container \u2014 owns the content background */
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
            type: "container",
            props: {
                ...containerBase,
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

type Mode = "edit" | "preview";

/** Name of the open document, shown as the top bar's trailing breadcrumb.
 * A constant for now: the playground opens one fixed sample, and the
 * document model has no name field (docs/03 §BuilderDocument) — a host app
 * would pass whatever its own storage calls this record. */
const DOCUMENT_NAME = "July invoice";

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

/** App bar docked full-width at the top of the screen, above the side
 * panels and canvas. Sits in flow above the work area so the artboard fits
 * (and resize-clamps) below it rather than expanding underneath.
 *
 * Left side is the doc-aware identity: an app chip (accent tile + app icon),
 * the app name, then the open document's name behind a slash — a breadcrumb,
 * so the app name stays fixed and only the trailing segment changes per
 * document. Geometry mirrors the inspector's block header (`pl-4` to line the
 * chip up with the panel icons below it, semibold label at the inherited
 * size) so the bar reads as the same chrome. */
function TopBar({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
    return (
        <header
            // mat-builder-compact-controls: the mode tabs and undo/redo are
            // mat-ui controls like the inspector's, and opt into the same
            // compact sm scale so they match the panels rather than sitting a
            // size larger with a rounder corner
            className={`mat-builder-compact-controls z-30 flex shrink-0 items-center gap-3 border-b py-3 pl-4 pr-3 ${dockedPanel}`}
        >
            {/* min-w-0 all the way down so a long document name truncates
                instead of shoving the mode tabs off the bar */}
            <div className="flex min-w-0 items-center gap-3">
                <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-(--border-radius-menu-item)"
                    style={{ backgroundColor: "var(--mat-builder-color-selection)" }}
                >
                    <IconMail className="size-4" style={{ color: "var(--mat-builder-color-chrome-tag-fg)" }} />
                </span>
                {/* Tighter gap than the chip's: the two segments read as one
                    path, the chip as a separate object */}
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className="shrink-0 font-semibold">Email builder</h1>
                    <span aria-hidden className="shrink-0" style={{ color: "var(--mat-builder-color-panel-border)" }}>
                        /
                    </span>
                    <p className="truncate" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                        {DOCUMENT_NAME}
                    </p>
                </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-3">
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
        <div className="absolute inset-0 flex flex-col">
            <TopBar mode={mode} onModeChange={onModeChange} />
            {/* Work area below the bar: canvas column between the docked panels */}
            <div className="relative min-h-0 flex-1">
                {/* Canvas column. Wrapper, not className: the Artboard root is
                    position:relative itself. transparentSurface lets the root's
                    dot layer show through, so there is no phase seam where the
                    canvas meets the app background */}
                <div
                    className="absolute inset-y-0 left-(--mat-builder-sidebar-width) right-(--mat-builder-sidebar-width)"
                    style={transparentSurface}
                >
                    {mode === "edit" ? (
                        <Canvas className="h-full" artboardWidth="fill" artboardHeight="fill" />
                    ) : (
                        <EmailPreview className="h-full" initialWidth="fill" initialHeight="fill" />
                    )}
                </div>
                <aside
                    className={`absolute inset-y-0 left-0 z-30 flex w-(--mat-builder-sidebar-width) flex-col border-r ${dockedPanel}`}
                >
                    <Palette className="min-h-0 flex-1" />
                    <LayersPanel className="min-h-0 flex-1 border-t border-stone-200" />
                </aside>
                <Inspector
                    className={`absolute inset-y-0 right-0 z-30 w-(--mat-builder-sidebar-width) border-l ${dockedPanel}`}
                />
            </div>
        </div>
    );
}
