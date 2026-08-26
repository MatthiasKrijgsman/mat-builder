"use client";

import { IconShoppingBag } from "@tabler/icons-react";
import { Divider } from "@matthiaskrijgsman/mat-ui";
import { defineBlock, Fields, InspectorGroup, StyleGroups } from "@matthiaskrijgsman/mat-builder";
import { acceptsEmailContent } from "@matthiaskrijgsman/mat-builder/email";
import {
    composeProductCard,
    productCardDefaults,
    PRODUCT_CARD_TYPE,
    type ProductCardProps,
} from "./product-card";

/*
 * The client half of the composed block — icon, label, and an ORDINARY
 * inspector over the card's own props. No bindings needed here: `compose` is
 * pure, so the card's props are the only stored state and this is just a form
 * over them (docs/08 §1).
 */

export const productCardBlock = defineBlock<ProductCardProps>({
    type: PRODUCT_CARD_TYPE,
    label: "Product card",
    icon: IconShoppingBag,
    category: "Commerce",
    keywords: ["product", "shop", "commerce", "card"],
    defaultProps: productCardDefaults,
    // One slot, so the card can host extra blocks under its button
    containers: [
        { name: "extras", layout: "vertical", accepts: acceptsEmailContent, placeholder: "Drop extras here" },
    ],
    compose: composeProductCard,
    inspector: ({ props, update }) => (
        <>
            <InspectorGroup label="Product">
                <Fields.TextField label="Price" value={props.price} onChange={(price) => update({ price })} />
                <Fields.TextField label="Image" value={props.imageSrc} onChange={(imageSrc) => update({ imageSrc })} />
                <Fields.TextField label="Button" value={props.ctaLabel} onChange={(ctaLabel) => update({ ctaLabel })} />
                <Fields.MergeTagTextField label="Link" value={props.ctaHref} onChange={(ctaHref) => update({ ctaHref })} />
            </InspectorGroup>
            <Divider />
            <StyleGroups.BackgroundGroup
                modes={["none", "solid", "gradient"]}
                value={props.background}
                onChange={(background) => update({ background })}
            />
            <Divider />
            <StyleGroups.SpacingGroup value={props.spacing} onChange={(spacing) => update({ spacing })} />
        </>
    ),
});
