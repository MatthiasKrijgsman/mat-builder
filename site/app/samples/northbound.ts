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
 * "Northbound '26" — a fictional two-day conference invite, and the sample
 * that carries colour: a tinted page around a white card, a gradient header
 * band, three tinted stat chips and a striped agenda table. Aura One is the
 * restrained monochrome end of the range, this is the other end — still one
 * accent doing the work (indigo), with mint/sand tints for the surfaces that
 * need to be told apart.
 *
 * It covers what the other sample covers — every block in the preset — plus
 * the two things Aura One has no use for: a gradient background and a
 * conditional block (the workshop-pass card, §visibility below).
 */

const mergeTags: MergeTag[] = [
    { token: "{{first_name}}", label: "First name", group: "Contact" },
    { token: "{{company}}", label: "Company", group: "Contact" },
    { token: "{{ticket_url}}", label: "Ticket URL", group: "Campaign" },
    // A closed set of values, so the visibility rule and the preview data
    // sheet offer a dropdown instead of a free-text field (docs/06 §merge tags)
    { token: "{{ticket_type}}", label: "Ticket type", group: "Campaign", values: ["Standard", "Workshop pass", "Crew"] },
    { token: "{{unsubscribe_url}}", label: "Unsubscribe URL" },
];

/* The palette: navy ink over two greys, indigo as the single accent, coral
 * for the two moments that need to catch the eye, and three tints that only
 * ever fill a surface — never text. */
const INK = "#161a3d";
const BODY = "#565d7e";
const MUTED = "#8d93ad";
const INDIGO = "#4c4ddc";
const CORAL = "#f2603c";
const MINT = "#0f9b8a";
const PAGE = "#f1f1fa";
const INDIGO_TINT = "#ecedfd";
const MINT_TINT = "#e6f5f2";
const SAND = "#fdf1e7";
const CLAY = "#c2610f";
const HAIRLINE = "#e6e7f2";

const EYEBROW = `font-size: 12px;letter-spacing: 2px;font-weight: 600;color: ${CORAL}`;
const LEAD = `font-size: 17px;color: ${BODY}`;
const CAPTION = `font-size: 14px;color: ${BODY}`;
const LEGAL_TEXT = `font-size: 12px;color: ${MUTED}`;
const SECTION_TITLE = `font-size: 26px;font-weight: 600;letter-spacing: -0.5px;color: ${INK}`;
const CARD_TITLE = `font-size: 18px;font-weight: 600;color: ${INK}`;
const STAT_LABEL = `font-size: 11px;letter-spacing: 1.5px;font-weight: 600;color: ${MUTED}`;

/* Header band: wordmark left, dates right, both on the gradient */
const headerBrand = richDoc(
    paragraph([text("NORTHBOUND ’26", "font-size: 14px;letter-spacing: 3px;font-weight: 600;color: #ffffff")]),
);

const headerMeta = richDoc(
    paragraph([text("12–13 NOV · ROTTERDAM", "font-size: 11px;letter-spacing: 1.5px;color: #cfd0fa")], "right"),
);

/* Hero: eyebrow, headline, lead and the personalized line — four paragraphs
 * in one text block, so the rich text's own margins do the spacing rather
 * than four blocks and a container gap. */
const heroCopy = richDoc(
    paragraph([text("YOU’RE ON THE LIST", EYEBROW)], "center"),
    heading("h1", [text("Two days for the people who ship", `font-size: 34px;font-weight: 600;letter-spacing: -0.8px;color: ${INK}`)], "center"),
    paragraph([text("Talks, workshops and a long hallway track for designers, engineers, and the product people in between.", LEAD)], "center"),
    paragraph(
        [
            richTextMergeTagNode("{{first_name}}", "First name", LEGAL_TEXT),
            text(", your seat is held until 1 October — ", LEGAL_TEXT),
            richTextMergeTagNode("{{company}}", "Company", LEGAL_TEXT),
            text(" is on the team pass.", LEGAL_TEXT),
        ],
        "center",
    ),
);

const tracksTitle = richDoc(
    heading("h3", [text("What’s on", SECTION_TITLE)], "center"),
    paragraph([text("Two stages, one very long lunch.", CAPTION)], "center"),
);

const stageCopy = richDoc(
    paragraph([text("The main stage", CARD_TITLE)]),
    // Both cards keep their copy to two lines at 600px: the columns are
    // top-aligned in the email render, so uneven copy leaves uneven cards
    paragraph([text("Twelve talks on shipping, scaling, and the parts nobody demos.", CAPTION)]),
);

const floorCopy = richDoc(
    paragraph([text("The workshop floor", CARD_TITLE)]),
    paragraph([text("Hands-on sessions, capped at twenty seats each.", CAPTION)]),
);

const agendaTitle = richDoc(
    heading("h3", [text("Day one at a glance", SECTION_TITLE)], "center"),
    paragraph([text("Doors at 09:30. Day two opens with the community track.", CAPTION)], "center"),
);

const agendaNote = richDoc(
    paragraph([text("The full programme lands in your inbox a week before.", LEGAL_TEXT)], "center"),
);

const workshopCopy = richDoc(
    paragraph([text("Your workshop pass is confirmed", `font-size: 22px;font-weight: 600;letter-spacing: -0.4px;color: ${INK}`)], "center"),
    paragraph([text("Pick your two sessions before 20 October — every room caps at twenty seats.", CAPTION)], "center"),
);

const footerCopy = richDoc(
    paragraph([text("Northbound Events BV · Van Nelleweg 1 · Rotterdam", LEGAL_TEXT)], "center"),
    paragraph(
        [
            text("You’re hearing from us because you came to Northbound ’25. ", LEGAL_TEXT),
            richTextMergeTagNode("{{unsubscribe_url}}", "Unsubscribe URL", LEGAL_TEXT),
        ],
        "center",
    ),
    paragraph([text("© 2026 Northbound Events. Made in Rotterdam.", LEGAL_TEXT)], "center"),
);

/* The agenda: no rules between rows — zebra stripes carry the eye instead,
 * and the outer border keeps the rounded frame the rest of the mail uses. */
const AGENDA_HEAD = `font-size: 11px;letter-spacing: 1.5px;font-weight: 600;color: ${INK}`;
const AGENDA_TIME = `font-size: 13px;font-weight: 600;color: ${INDIGO}`;
const AGENDA_SESSION = `font-size: 14px;color: ${INK}`;
const AGENDA_ROOM = `font-size: 13px;color: ${MUTED}`;

const agendaRow = (time: string, session: string, room: string): SampleTableRow => ({
    variant: "body",
    cells: [
        { value: time, style: AGENDA_TIME },
        { value: session, style: AGENDA_SESSION },
        { value: room, style: AGENDA_ROOM, align: "right" },
    ],
});

const agendaRows: SampleTableRow[] = [
    {
        variant: "header",
        background: INDIGO_TINT,
        cells: [
            { value: "TIME", style: AGENDA_HEAD, width: "20%" },
            { value: "SESSION", style: AGENDA_HEAD, width: "55%" },
            { value: "ROOM", style: AGENDA_HEAD, align: "right", width: "25%" },
        ],
    },
    agendaRow("09:30", "Doors, coffee and stroopwafels", "Foyer"),
    agendaRow("10:15", "Opening: the cost of a good default", "Main stage"),
    agendaRow("11:30", "Workshop: designing with real data", "Studio 2"),
    agendaRow("14:30", "Panel: shipping without a spec", "Main stage"),
    agendaRow("16:00", "Prototyping clinic — bring a laptop", "Studio 1"),
    {
        // The evening slot reads as a different kind of thing, so it gets the
        // warm fill rather than another striped row
        variant: "footer",
        background: SAND,
        cells: [
            { value: "20:00", style: `font-size: 13px;font-weight: 600;color: ${CLAY}` },
            { value: "Northbound after-hours", style: `font-size: 14px;font-weight: 600;color: ${INK}` },
            { value: "Courtyard", style: AGENDA_ROOM, align: "right" },
        ],
    },
];

const agendaTableProps = {
    tableLayout: "fixed" as const,
    background: defaultBackground,
    border: { width: uniformSides(1), style: "solid" as const, color: HAIRLINE, radius: 14 },
    borderMode: "outer",
    cellPadding: symmetricSides(13, 14),
    stripe: { enabled: true, color: "#f8f8fd" },
    spacing: defaultSpacing,
    effects: defaultEffects,
};

/** A stat chip: tinted surface, big number over a small caps label. */
const statChip = (id: string, tint: string, valueColor: string, value: string, label: string): BuilderDocument["blocks"] => ({
    [id]: {
        id,
        type: "container",
        props: {
            ...containerBase,
            background: { ...defaultBackground, type: "solid", color: tint },
            border: { ...defaultBorder, radius: 14 },
            spacing: { padding: symmetricSides(16, 12), margin: uniformSides(0) },
        },
        children: { content: [`${id}-copy`] },
    },
    [`${id}-copy`]: {
        id: `${id}-copy`,
        type: "text",
        props: {
            ...textBase,
            content: richDoc(
                paragraph([text(value, `font-size: 24px;font-weight: 600;color: ${valueColor}`)], "center"),
                paragraph([text(label, STAT_LABEL)], "center"),
            ),
        },
        children: {},
    },
});

/** A track card: tinted surface, image over a title and one line. */
const trackCard = (id: string, tint: string, seed: string, alt: string, copy: string): BuilderDocument["blocks"] => ({
    [id]: {
        id,
        type: "container",
        props: {
            ...containerBase,
            background: { ...defaultBackground, type: "solid", color: tint },
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
            src: `https://picsum.photos/seed/${seed}/720/500`,
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
                // Tinted page, white card: the padding here is what lets the
                // sheet float rather than run edge to edge
                backgroundColor: PAGE,
                contentWidth: 600,
                spacing: { padding: symmetricSides(28, 12), margin: uniformSides(0) },
                typography: { ...defaultTypography, fontFamily: SYSTEM_FONT_STACK, fontSize: 15, lineHeight: 1.6, color: BODY },
            },
            children: { main: ["page"] },
        },

        page: {
            id: "page",
            type: "container",
            props: {
                ...containerBase,
                background: { ...defaultBackground, type: "solid", color: "#ffffff" },
                border: { ...defaultBorder, radius: 24 },
                spacing: { padding: uniformSides(0), margin: uniformSides(0) },
            },
            children: {
                content: ["header", "hero", "stats", "tracks-section", "agenda", "workshop", "footer"],
            },
        },

        /* Header: the one gradient — its top corners match the card's, since
         * email clients don't clip a child to its parent's radius */
        header: {
            id: "header",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                background: {
                    ...defaultBackground,
                    type: "gradient" as const,
                    // `color` is the fallback for clients that drop the gradient
                    color: INDIGO,
                    gradient: { from: INDIGO, to: "#7b4fe0", angle: 120 },
                },
                border: { ...defaultBorder, radius: { topLeft: 24, topRight: 24, bottomRight: 0, bottomLeft: 0 } },
                spacing: { padding: symmetricSides(18, 24), margin: uniformSides(0) },
                layout: { ...defaultLayout, vertical: "middle" as const, gap: 16 },
            },
            children: { content: ["header-brand", "header-meta"] },
        },
        "header-brand": {
            id: "header-brand",
            type: "text",
            props: { ...textBase, content: headerBrand },
            children: {},
        },
        "header-meta": {
            id: "header-meta",
            type: "text",
            props: { ...textBase, content: headerMeta },
            children: {},
        },

        /* Hero: headline block, photo, then the two calls to action side by side */
        hero: {
            id: "hero",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 44, right: 24, bottom: 8, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, horizontal: "center" as const, gap: 20 },
            },
            children: { content: ["hero-copy", "hero-image", "hero-actions"] },
        },
        "hero-copy": {
            id: "hero-copy",
            type: "text",
            props: { ...textBase, content: heroCopy },
            children: {},
        },
        "hero-image": {
            id: "hero-image",
            type: "image",
            props: {
                src: "https://picsum.photos/seed/northbound-hall/1104/620",
                alt: "The Northbound main stage before doors",
                href: "",
                size: { width: "full" as const, widthPx: 552, height: "hug" as const, heightPx: 310 },
                layout: { ...defaultLayout, horizontal: "center" as const },
                border: { ...defaultBorder, radius: 16 },
                spacing: defaultSpacing,
                effects: defaultEffects,
            },
            children: {},
        },
        /* Two buttons in one auto row: both Hug their label, and the row's
         * centre alignment places the pair (docs/06 §Rows) */
        "hero-actions": {
            id: "hero-actions",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                spacing: { padding: uniformSides(0), margin: uniformSides(0) },
                columns: "auto" as const,
                layout: { ...defaultLayout, horizontal: "center" as const, vertical: "middle" as const, gap: 12 },
            },
            children: { content: ["hero-save", "hero-programme"] },
        },
        "hero-save": {
            id: "hero-save",
            type: "button",
            props: {
                label: "Save my seat",
                href: "{{ticket_url}}",
                size: defaultSize,
                background: { ...defaultBackground, type: "solid", color: INDIGO },
                border: { ...defaultBorder, radius: 10 },
                typography: { ...defaultTypography, color: "#ffffff", align: "center" as const, fontSize: 15 },
                spacing: { padding: symmetricSides(13, 24), margin: uniformSides(0) },
                layout: defaultLayout,
                effects: defaultEffects,
            },
            children: {},
        },
        /* Secondary action: outlined instead of filled — same tap target,
         * clearly the second choice */
        "hero-programme": {
            id: "hero-programme",
            type: "button",
            props: {
                label: "See the programme",
                href: "https://example.com/northbound/programme",
                size: defaultSize,
                background: defaultBackground,
                border: { ...defaultBorder, width: uniformSides(1), color: "#c9caf5", radius: 10 },
                typography: { ...defaultTypography, color: INDIGO, align: "center" as const, fontSize: 15 },
                spacing: { padding: symmetricSides(12, 22), margin: uniformSides(0) },
                layout: defaultLayout,
                effects: defaultEffects,
            },
            children: {},
        },

        /* Stats: three tinted chips — the colour is doing counting, not decoration */
        stats: {
            id: "stats",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                spacing: { padding: { top: 36, right: 24, bottom: 8, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, vertical: "stretch" as const, gap: 12 },
            },
            children: { content: ["stat-talks", "stat-workshops", "stat-makers"] },
        },
        ...statChip("stat-talks", INDIGO_TINT, INDIGO, "48", "TALKS"),
        ...statChip("stat-workshops", MINT_TINT, MINT, "12", "WORKSHOPS"),
        ...statChip("stat-makers", SAND, CLAY, "900", "MAKERS"),

        /* Tracks: title, then two cards side by side — a horizontal container
         * whose children are containers, so each column stacks image over copy */
        "tracks-section": {
            id: "tracks-section",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 40, right: 24, bottom: 8, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, gap: 20 },
            },
            children: { content: ["tracks-title", "tracks"] },
        },
        "tracks-title": {
            id: "tracks-title",
            type: "text",
            props: { ...textBase, content: tracksTitle },
            children: {},
        },
        tracks: {
            id: "tracks",
            type: "container",
            props: {
                ...containerBase,
                direction: "horizontal" as const,
                spacing: { padding: uniformSides(0), margin: uniformSides(0) },
                layout: { ...defaultLayout, vertical: "stretch" as const, gap: 16 },
            },
            children: { content: ["track-stage", "track-floor"] },
        },
        ...trackCard("track-stage", MINT_TINT, "northbound-stage", "The main stage", stageCopy),
        ...trackCard("track-floor", SAND, "northbound-floor", "The workshop floor", floorCopy),

        /* Agenda: title, striped table, small print */
        agenda: {
            id: "agenda",
            type: "container",
            props: {
                ...containerBase,
                spacing: { padding: { top: 44, right: 24, bottom: 8, left: 24 }, margin: uniformSides(0) },
                layout: { ...defaultLayout, gap: 20 },
            },
            children: { content: ["agenda-title", "agenda-table", "agenda-note"] },
        },
        "agenda-title": {
            id: "agenda-title",
            type: "text",
            props: { ...textBase, content: agendaTitle },
            children: {},
        },
        ...sampleTableBlocks("agenda-table", agendaRows, agendaTableProps),
        "agenda-note": {
            id: "agenda-note",
            type: "text",
            props: { ...textBase, content: agendaNote },
            children: {},
        },

        /* Workshop pass: the conditional card (docs/06 §Conditional visibility)
         * — only a workshop-pass holder with a ticket to open needs it. Switch
         * to Preview and fill the data sheet to watch it appear. */
        workshop: {
            id: "workshop",
            type: "container",
            props: {
                ...containerBase,
                background: { ...defaultBackground, type: "solid", color: SAND },
                border: { ...defaultBorder, radius: 18 },
                spacing: { padding: symmetricSides(32, 28), margin: { top: 32, right: 24, bottom: 8, left: 24 } },
                layout: { ...defaultLayout, horizontal: "center" as const, gap: 18 },
            },
            children: { content: ["workshop-copy", "workshop-button"] },
            visibility: {
                mode: "rules",
                match: "all",
                rules: [
                    { token: "{{ticket_type}}", operator: "eq", value: "Workshop pass" },
                    { token: "{{ticket_url}}", operator: "exists" },
                ],
            },
        },
        "workshop-copy": {
            id: "workshop-copy",
            type: "text",
            props: { ...textBase, content: workshopCopy },
            children: {},
        },
        "workshop-button": {
            id: "workshop-button",
            type: "button",
            props: {
                label: "Choose your sessions",
                href: "{{ticket_url}}",
                size: defaultSize,
                background: { ...defaultBackground, type: "solid", color: CORAL },
                border: { ...defaultBorder, radius: 10 },
                typography: { ...defaultTypography, color: "#ffffff", align: "center" as const, fontSize: 15 },
                spacing: { padding: symmetricSides(13, 24), margin: uniformSides(0) },
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
                spacing: { padding: { top: 24, right: 24, bottom: 36, left: 24 }, margin: uniformSides(0) },
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

export const northboundSample: EmailSample = {
    id: "northbound",
    name: "Northbound ’26 invite",
    mergeTags,
    document,
};
