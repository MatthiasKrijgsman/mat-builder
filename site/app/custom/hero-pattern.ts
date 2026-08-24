import {
    definePattern,
    richTextParagraph,
    richTextHeading,
    defaultBackground,
    symmetricSides,
    uniformSides,
} from "@matthiaskrijgsman/mat-builder";

/*
 * A pattern (docs/08 §7) — a starting point, not a durable type.
 *
 * Dropping it stamps out a container, a heading, a paragraph and a button as
 * ORDINARY blocks: after the drop there is no "hero" in the document, so it
 * needs no renderer and no registry entry, and a document built with it opens
 * fine on a build of the library that has never heard of it.
 *
 * The contrast with the product card is the point: a pattern is for "give me
 * this layout so I can edit it", a composite for "this stays one thing".
 */

export const heroPattern = definePattern({
    id: "hero",
    label: "Hero",
    category: "Patterns",
    keywords: ["header", "banner", "intro"],
    spec: {
        type: "container",
        props: {
            direction: "vertical",
            background: { ...defaultBackground, type: "solid", color: "#1C1917" },
            spacing: { padding: symmetricSides(48, 32), margin: uniformSides(0) },
            layout: { gap: 16 },
        },
        children: {
            content: [
                { type: "text", props: { content: richTextHeading("Your headline here", "h1") } },
                { type: "text", props: { content: richTextParagraph("A sentence of supporting copy.") } },
                { type: "button", props: { label: "Get started", href: "https://example.com" } },
            ],
        },
    },
});
