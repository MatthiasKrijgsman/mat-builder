import {
    richTextParagraph,
    slot,
    type BlockSpec,
    type SpacingValue,
    type BackgroundValue,
    defaultSpacing,
    defaultBackground,
    symmetricSides,
} from "@matthiaskrijgsman/mat-builder";

/*
 * A composed block, defined the way a consuming project would (docs/08).
 *
 * This half is SERVER-SAFE on purpose: `compose` returns data, never JSX, so
 * `defaultProps` + `compose` can be handed to `renderEmail({ blocks })` from
 * a route handler without dragging the editor into the server bundle. The
 * client half — icon, label, inspector — is ./product-card-block.tsx.
 *
 * Note what is NOT here: no editRender, and no email renderer. The card is
 * a container, two texts and a button, so both surfaces already exist.
 */

export interface ProductCardProps {
    title: string;
    price: string;
    imageSrc: string;
    ctaLabel: string;
    ctaHref: string;
    background: BackgroundValue;
    spacing: SpacingValue;
}

export const PRODUCT_CARD_TYPE = "product-card";

export const productCardDefaults: ProductCardProps = {
    title: richTextParagraph("Ceramic pour-over kettle"),
    price: "€49,00",
    imageSrc: "https://placehold.co/600x360/e7e5e4/78716c?text=Product",
    ctaLabel: "Add to bag",
    ctaHref: "https://example.com/product",
    background: { ...defaultBackground, type: "solid", color: "#FAFAF9" },
    spacing: { padding: symmetricSides(20, 20), margin: defaultSpacing.margin },
};

export function composeProductCard(props: ProductCardProps): BlockSpec {
    return {
        type: "container",
        props: {
            direction: "vertical",
            background: props.background,
            spacing: props.spacing,
            layout: { gap: 12 },
        },
        children: {
            content: [
                { type: "image", props: { src: props.imageSrc, size: { width: "full" } } },
                // `bind` is what makes the title editable in place: an edit to
                // the composed text block's `content` is written to the card's
                // own `title` prop (docs/08 §3).
                { type: "text", props: { content: props.title }, bind: { content: "title" } },
                { type: "text", props: { content: richTextParagraph(props.price) } },
                {
                    type: "button",
                    props: { label: props.ctaLabel, href: props.ctaHref },
                    bind: { label: "ctaLabel" },
                },
                // Anything the user drops into the card lands here — real
                // blocks in the card's own `extras` container.
                { type: "container", props: { direction: "vertical" }, children: { content: slot("extras") } },
            ],
        },
    };
}
