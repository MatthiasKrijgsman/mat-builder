"use client";

import { defineBlock, Fields } from "@matthiaskrijgsman/mat-builder";
import {
    IconClick,
    IconHeading,
    IconLayoutColumns,
    IconLayoutRows,
    IconTypography,
} from "@tabler/icons-react";

/*
 * Kitchen-sink block set for the playground — exercises containers, accepts,
 * onCreate, getDisplayName and every shipped field helper. Consuming projects
 * define their own sets exactly like this.
 */

const CONTENT_TYPES = ["heading", "text", "button", "columns"];

export const pageRootBlock = defineBlock<{ backgroundColor: string; padding: number }>({
    type: "page-root",
    label: "Page",
    hidden: true,
    canDrag: false,
    canDelete: false,
    defaultProps: { backgroundColor: "#ffffff", padding: 24 },
    containers: [{ name: "main", layout: "vertical", accepts: ["section"], placeholder: "Add a section to get started" }],
    editRender: ({ props, containers }) => (
        <div
            className="flex min-h-32 flex-col gap-4"
            style={{ backgroundColor: props.backgroundColor, padding: props.padding }}
        >
            {containers.main}
        </div>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.ColorField
                label="Background"
                value={props.backgroundColor}
                onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <Fields.NumberField
                label="Padding"
                value={props.padding}
                min={0}
                max={96}
                onChange={(padding) => update({ padding })}
            />
        </>
    ),
});

export const sectionBlock = defineBlock<{ backgroundColor: string; padding: number }>({
    type: "section",
    label: "Section",
    icon: IconLayoutRows,
    defaultProps: { backgroundColor: "#fafafa", padding: 16 },
    containers: [{ name: "body", layout: "vertical", accepts: CONTENT_TYPES, placeholder: "Drop content here" }],
    editRender: ({ props, containers }) => (
        <section
            className="flex flex-col gap-3 rounded"
            style={{ backgroundColor: props.backgroundColor, padding: props.padding }}
        >
            {containers.body}
        </section>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.ColorField
                label="Background"
                value={props.backgroundColor}
                onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <Fields.NumberField
                label="Padding"
                value={props.padding}
                min={0}
                max={64}
                onChange={(padding) => update({ padding })}
            />
        </>
    ),
});

export const columnsBlock = defineBlock<{ gap: number; ratio: "50/50" | "33/67" | "67/33" }>({
    type: "columns",
    label: "Columns",
    icon: IconLayoutColumns,
    defaultProps: { gap: 16, ratio: "50/50" },
    containers: [
        { name: "left", layout: "vertical", accepts: CONTENT_TYPES, placeholder: "Left column" },
        { name: "right", layout: "vertical", accepts: CONTENT_TYPES, placeholder: "Right column" },
    ],
    editRender: ({ props, containers }) => {
        const [left, right] = props.ratio.split("/").map(Number);
        return (
            <div className="flex" style={{ gap: props.gap }}>
                <div style={{ flexGrow: left, flexBasis: 0, minWidth: 0 }}>{containers.left}</div>
                <div style={{ flexGrow: right, flexBasis: 0, minWidth: 0 }}>{containers.right}</div>
            </div>
        );
    },
    inspector: ({ props, update }) => (
        <>
            <Fields.SelectField
                label="Ratio"
                value={props.ratio}
                options={["50/50", "33/67", "67/33"]}
                onChange={(ratio) => update({ ratio: ratio as "50/50" | "33/67" | "67/33" })}
            />
            <Fields.NumberField label="Gap" value={props.gap} min={0} max={64} onChange={(gap) => update({ gap })} />
        </>
    ),
});

export const headingBlock = defineBlock<{ text: string; level: "1" | "2" | "3"; align: "left" | "center" | "right" }>({
    type: "heading",
    label: "Heading",
    icon: IconHeading,
    defaultProps: { text: "Heading", level: "2", align: "left" },
    getDisplayName: (props) => props.text.slice(0, 24) || undefined,
    editRender: ({ props }) => {
        const Tag = `h${props.level}` as "h1" | "h2" | "h3";
        const size = { "1": "text-3xl", "2": "text-2xl", "3": "text-xl" }[props.level];
        return (
            <Tag className={`${size} font-semibold`} style={{ textAlign: props.align }}>
                {props.text}
            </Tag>
        );
    },
    inspector: ({ props, update }) => (
        <>
            <Fields.TextField label="Text" value={props.text} onChange={(text) => update({ text })} />
            <Fields.SelectField
                label="Level"
                value={props.level}
                options={[
                    { label: "H1", value: "1" },
                    { label: "H2", value: "2" },
                    { label: "H3", value: "3" },
                ]}
                onChange={(level) => update({ level: level as "1" | "2" | "3" })}
            />
            <Fields.SelectField
                label="Align"
                value={props.align}
                options={["left", "center", "right"]}
                onChange={(align) => update({ align: align as "left" | "center" | "right" })}
            />
        </>
    ),
});

export const textBlock = defineBlock<{ text: string; muted: boolean }>({
    type: "text",
    label: "Text",
    icon: IconTypography,
    defaultProps: { text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", muted: false },
    getDisplayName: (props) => props.text.slice(0, 24) || undefined,
    editRender: ({ props }) => (
        <p className={`text-sm leading-relaxed ${props.muted ? "text-gray-500" : "text-gray-900"}`}>{props.text}</p>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.TextField label="Text" value={props.text} onChange={(text) => update({ text })} />
            <Fields.ToggleField label="Muted" value={props.muted} onChange={(muted) => update({ muted })} />
        </>
    ),
});

export const buttonBlock = defineBlock<{ label: string; href: string; color: string }>({
    type: "button",
    label: "Button",
    icon: IconClick,
    defaultProps: { label: "Click me", href: "https://example.com", color: "#3b82f6" },
    getDisplayName: (props) => props.label || undefined,
    editRender: ({ props }) => (
        <span
            className="inline-block cursor-default rounded px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: props.color }}
        >
            {props.label}
        </span>
    ),
    inspector: ({ props, update }) => (
        <>
            <Fields.TextField label="Label" value={props.label} onChange={(label) => update({ label })} />
            <Fields.TextField label="Link" value={props.href} onChange={(href) => update({ href })} />
            <Fields.ColorField label="Color" value={props.color} onChange={(color) => update({ color })} />
        </>
    ),
});

export const playgroundBlocks = [pageRootBlock, sectionBlock, columnsBlock, headingBlock, textBlock, buttonBlock];
