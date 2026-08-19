"use client";

import { dottedSurface } from "@matthiaskrijgsman/mat-builder";
import {
    IconArrowsVertical,
    IconChevronDown,
    IconChevronRight,
    IconClick,
    IconGrid3x3,
    IconGripVertical,
    IconLetterA,
    IconMail,
    IconPhoto,
    IconSearch,
    IconSeparator,
    IconTable,
    IconTypography,
} from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";

/*
 * The 1200×630 artboard itself (see ./page.tsx). Hand-built rather than a live
 * <EmailBuilder>: a capture has to be pixel-identical every time, and the real
 * editor brings remote images, focus rings and a fill-height artboard that
 * would all move between shots. The tokens are the real ones, so the mock
 * still recolors with the theme.
 */

/* Palette category tints, in registry order — Layout is 1, Content is 2 (see
 * src/components/palette/tints.ts). */
const LAYOUT_TINT = 1;
const CONTENT_TINT = 2;

const tint = (index: number, part: "bg" | "border" | "fg") => `var(--mat-builder-palette-tint-${index}-${part})`;

const PANEL_BG = "var(--mat-builder-color-panel-bg)";
const PANEL_BORDER = "var(--mat-builder-color-panel-border)";
const PANEL_FG = "var(--mat-builder-color-panel-fg)";
const MUTED_FG = "var(--mat-builder-color-panel-muted-fg)";
const SELECTION = "var(--mat-builder-color-selection)";

export function OgFrame() {
    return (
        <div
            id="og-frame"
            className="relative shrink-0 overflow-hidden"
            style={{ width: 1200, height: 630, ...dottedSurface }}
        >
            {/* A soft light behind the wordmark so the flat dotted field does
                not read as a texture swatch at feed size. */}
            <div
                className="pointer-events-none absolute"
                style={{
                    inset: "-20% 30% -20% -25%",
                    background: "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0))",
                }}
            />
            <Wordmark />
            <EditorMock />
        </div>
    );
}

/* ── Left half ──────────────────────────────────────────────────────────── */

/** The heading and the line under it are mirrored by `og:title` and
 * `og:description` in app/layout.tsx — a card whose image and text disagree
 * reads as two products. Change them together. */
function Wordmark() {
    return (
        <div className="absolute inset-y-0 left-0 flex w-[600px] flex-col justify-center pl-[76px]">
            <p
                className="font-mono"
                style={{ fontSize: 15, letterSpacing: "0.01em", color: MUTED_FG }}
            >
                @matthiaskrijgsman/mat-builder
            </p>
            <h1
                className="mt-4 font-semibold"
                style={{ fontSize: 78, lineHeight: 1, letterSpacing: "-0.035em", color: "#18181b" }}
            >
                Email Builder
            </h1>
            <p className="mt-5 max-w-[440px]" style={{ fontSize: 24, lineHeight: 1.4, color: "#52525b" }}>
                Compose templates from blocks, edit them inline, and export email-safe HTML.
            </p>
        </div>
    );
}

/* ── Right half: the editor, bled off the right edge ────────────────────── */

function EditorMock() {
    return (
        <div
            className="absolute overflow-hidden"
            style={{
                left: 606,
                top: 74,
                width: 680,
                height: 482,
                backgroundColor: PANEL_BG,
                borderRadius: 12,
                border: `1px solid ${PANEL_BORDER}`,
                boxShadow: "0 40px 80px -20px rgb(24 24 27 / 0.28), 0 8px 24px -8px rgb(24 24 27 / 0.12)",
            }}
        >
            <MockTopBar />
            <div className="flex" style={{ height: 442 }}>
                <MockLeftPanel />
                <MockCanvas />
                <MockInspector />
            </div>
        </div>
    );
}

function MockTopBar() {
    return (
        <div
            className="flex items-center gap-2 border-b px-3"
            style={{ height: 40, borderColor: PANEL_BORDER }}
        >
            <span
                className="flex items-center justify-center"
                style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: SELECTION }}
            >
                <IconMail className="size-3" style={{ color: "#ffffff" }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#18181b" }}>Email builder</span>
            <span style={{ fontSize: 12, color: PANEL_BORDER }}>/</span>
            <span style={{ fontSize: 12, color: MUTED_FG }}>Aura One launch</span>

            <div className="ml-auto flex items-center gap-1.5">
                <div
                    className="flex items-center gap-0.5 rounded-md p-0.5"
                    style={{ backgroundColor: "#f4f4f5" }}
                >
                    <span
                        className="rounded px-2 py-1"
                        style={{ fontSize: 10, fontWeight: 500, backgroundColor: PANEL_BG, color: PANEL_FG }}
                    >
                        Edit
                    </span>
                    <span className="px-2 py-1" style={{ fontSize: 10, color: MUTED_FG }}>
                        Preview
                    </span>
                </div>
                <span
                    className="rounded-md px-2.5 py-1.5"
                    style={{ fontSize: 10, fontWeight: 500, backgroundColor: SELECTION, color: "#ffffff" }}
                >
                    Save
                </span>
            </div>
        </div>
    );
}

const PALETTE_LAYOUT = [{ label: "Container", Icon: IconGrid3x3 }];
const PALETTE_CONTENT = [
    { label: "Text", Icon: IconTypography },
    { label: "Button", Icon: IconClick },
    { label: "Image", Icon: IconPhoto },
    { label: "Divider", Icon: IconSeparator },
    { label: "Spacer", Icon: IconArrowsVertical },
    { label: "Table", Icon: IconTable },
];

function MockLeftPanel() {
    return (
        <div
            className="flex shrink-0 flex-col border-r"
            style={{ width: 150, borderColor: PANEL_BORDER }}
        >
            <div className="flex flex-col gap-2 p-2">
                <div
                    className="flex items-center gap-1.5 rounded-md border px-2"
                    style={{ height: 22, borderColor: PANEL_BORDER }}
                >
                    <IconSearch className="size-2.5" style={{ color: MUTED_FG }} />
                    <span style={{ fontSize: 9, color: MUTED_FG }}>Search blocks…</span>
                </div>
                <PaletteGroup label="Layout" items={PALETTE_LAYOUT} tintIndex={LAYOUT_TINT} />
                <PaletteGroup label="Content" items={PALETTE_CONTENT} tintIndex={CONTENT_TINT} />
            </div>
            <div className="flex flex-1 flex-col gap-0.5 border-t p-2" style={{ borderColor: PANEL_BORDER }}>
                <LayerRow depth={0} Icon={IconMail} label="Email" trailing="Root" />
                <LayerRow depth={1} Icon={IconGrid3x3} label="Container" tintIndex={LAYOUT_TINT} caret />
                <LayerRow depth={2} Icon={IconGrid3x3} label="Container" tintIndex={LAYOUT_TINT} caret />
                <LayerRow depth={3} Icon={IconLetterA} label="A U R A" tintIndex={CONTENT_TINT} />
                <LayerRow depth={3} Icon={IconLetterA} label="Store · Support" tintIndex={CONTENT_TINT} />
                <LayerRow depth={2} Icon={IconGrid3x3} label="Container" tintIndex={LAYOUT_TINT} caret />
                <LayerRow depth={3} Icon={IconLetterA} label="Aura One" tintIndex={CONTENT_TINT} selected />
                <LayerRow depth={3} Icon={IconClick} label="Pre-order" tintIndex={CONTENT_TINT} />
                <LayerRow depth={3} Icon={IconPhoto} label="Aura One in titanium" tintIndex={CONTENT_TINT} />
            </div>
        </div>
    );
}

interface PaletteItem {
    label: string;
    Icon: (props: { className?: string; style?: CSSProperties }) => ReactNode;
}

function PaletteGroup({ label, items, tintIndex }: { label: string; items: PaletteItem[]; tintIndex: number }) {
    return (
        <div className="flex flex-col gap-0.5">
            <p
                className="px-1 pb-0.5 pt-1 font-semibold uppercase"
                style={{ fontSize: 8, letterSpacing: "0.09em", color: "#a1a1aa" }}
            >
                {label}
            </p>
            {items.map(({ label: itemLabel, Icon }) => (
                <div key={itemLabel} className="flex items-center gap-1.5 rounded-md px-1" style={{ height: 20 }}>
                    <span
                        className="flex shrink-0 items-center justify-center rounded border"
                        style={{
                            width: 15,
                            height: 15,
                            backgroundColor: tint(tintIndex, "bg"),
                            borderColor: tint(tintIndex, "border"),
                        }}
                    >
                        <Icon className="size-2.5" style={{ color: tint(tintIndex, "fg") }} />
                    </span>
                    <span style={{ fontSize: 10, color: PANEL_FG }}>{itemLabel}</span>
                    <IconGripVertical className="ml-auto size-2.5" style={{ color: "#d4d4d8" }} />
                </div>
            ))}
        </div>
    );
}

function LayerRow(props: {
    depth: number;
    Icon: (p: { className?: string; style?: CSSProperties }) => ReactNode;
    label: string;
    tintIndex?: number;
    caret?: boolean;
    selected?: boolean;
    trailing?: string;
}) {
    const { depth, Icon, label, tintIndex, caret, selected, trailing } = props;
    return (
        <div
            className="flex items-center gap-1 rounded-md pr-1"
            style={{
                height: 19,
                paddingLeft: 4 + depth * 9,
                backgroundColor: selected ? SELECTION : undefined,
            }}
        >
            {caret || depth === 0 ? (
                <IconChevronDown className="size-2" style={{ color: selected ? "#ffffff" : "#a1a1aa" }} />
            ) : (
                <span style={{ width: 8 }} />
            )}
            <Icon
                className="size-2.5 shrink-0"
                style={{ color: selected ? "#ffffff" : tintIndex ? tint(tintIndex, "fg") : MUTED_FG }}
            />
            <span
                className="truncate"
                style={{ fontSize: 9.5, color: selected ? "#ffffff" : PANEL_FG }}
            >
                {label}
            </span>
            {trailing && (
                <span className="ml-auto" style={{ fontSize: 8, color: "#a1a1aa" }}>
                    {trailing}
                </span>
            )}
        </div>
    );
}

function MockCanvas() {
    return (
        <div className="relative flex-1 overflow-hidden" style={dottedSurface}>
            {/* The email sheet, cropped at the bottom like a scrolled canvas */}
            <div
                className="absolute left-1/2 flex flex-col items-center"
                style={{
                    top: 20,
                    width: 258,
                    marginLeft: -129,
                    paddingTop: 0,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 2px rgb(24 24 27 / 0.06)",
                }}
            >
                <div className="flex w-full items-center justify-between px-4" style={{ height: 26 }}>
                    <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.22em", color: "#1d1d1f" }}>
                        A U R A
                    </span>
                    <span style={{ fontSize: 7, color: "#6e6e73" }}>Store · Support</span>
                </div>

                {/* Selected block — the ring and name tag are what say "editor" */}
                <div className="relative mt-3 w-[214px] px-2 pb-2 pt-1 text-center">
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{ boxShadow: `inset 0 0 0 1.5px ${SELECTION}` }}
                    />
                    <span
                        className="absolute -top-[13px] left-0 rounded-t-[2px] px-1 py-[1px]"
                        style={{ fontSize: 7, color: "#ffffff", backgroundColor: SELECTION }}
                    >
                        Text
                    </span>
                    <p style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.2em", color: "#0071e3" }}>NEW</p>
                    <p
                        className="mt-1 font-semibold"
                        style={{ fontSize: 27, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1d1d1f" }}
                    >
                        Aura One
                    </p>
                    <p className="mt-1.5" style={{ fontSize: 9, color: "#6e6e73" }}>
                        Titanium. Featherlight. Unmistakably Aura.
                    </p>
                    {/* Selection handles ride the ring's corners */}
                    {[
                        { top: -3, left: -3 },
                        { top: -3, right: -3 },
                        { bottom: -3, left: -3 },
                        { bottom: -3, right: -3 },
                    ].map((position, index) => (
                        <span
                            key={index}
                            className="absolute"
                            style={{
                                ...position,
                                width: 6,
                                height: 6,
                                borderRadius: 1,
                                backgroundColor: "#ffffff",
                                border: `1.5px solid ${SELECTION}`,
                            }}
                        />
                    ))}
                </div>

                <span
                    className="mt-4 rounded-full px-4 py-1.5"
                    style={{ fontSize: 9, fontWeight: 500, color: "#ffffff", backgroundColor: "#0071e3" }}
                >
                    Pre-order
                </span>
                <span className="mt-2.5" style={{ fontSize: 8.5, color: "#0071e3" }}>
                    Learn more ›
                </span>
                <div
                    className="mb-0 mt-4 w-[214px]"
                    style={{
                        height: 132,
                        background: "linear-gradient(150deg, #8ea3b8 0%, #5b6b7d 45%, #2f3b47 100%)",
                    }}
                />
            </div>
        </div>
    );
}

function MockInspector() {
    return (
        <div
            className="flex shrink-0 flex-col border-l"
            style={{ width: 150, borderColor: PANEL_BORDER }}
        >
            <div
                className="flex items-center gap-1.5 border-b px-2"
                style={{ height: 28, borderColor: PANEL_BORDER }}
            >
                <span
                    className="flex items-center justify-center rounded border"
                    style={{
                        width: 15,
                        height: 15,
                        backgroundColor: tint(CONTENT_TINT, "bg"),
                        borderColor: tint(CONTENT_TINT, "border"),
                    }}
                >
                    <IconTypography className="size-2.5" style={{ color: tint(CONTENT_TINT, "fg") }} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#18181b" }}>Text</span>
            </div>
            <div className="flex flex-col gap-2 p-2">
                <Field label="Content width" value="600" />
                <Field label="Page background" value="#FFFFFF" swatch="#ffffff" />
                <GroupHeader label="Typography" />
                <div className="flex gap-1.5">
                    <Field label="Size" value="27" />
                    <Field label="Line height" value="1.1" />
                </div>
                <Field label="Color" value="#1d1d1f" swatch="#1d1d1f" />
                <GroupHeader label="Spacing" />
                <div className="flex gap-1.5">
                    <Field label="Padding" value="12" />
                    <Field label="" value="24" />
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
            {label && (
                <span style={{ fontSize: 8.5, color: "var(--mat-builder-color-input-label)" }}>{label}</span>
            )}
            <div
                className="flex items-center gap-1.5 rounded-md border px-1.5"
                style={{ height: 20, borderColor: PANEL_BORDER }}
            >
                {swatch && (
                    <span
                        className="shrink-0 rounded-sm border"
                        style={{ width: 9, height: 9, backgroundColor: swatch, borderColor: "#d4d4d8" }}
                    />
                )}
                <span className="truncate" style={{ fontSize: 9, color: PANEL_FG }}>
                    {value}
                </span>
            </div>
        </div>
    );
}

function GroupHeader({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-1 pt-1">
            <IconChevronRight className="size-2.5" style={{ color: "#a1a1aa" }} />
            <span
                className="font-semibold uppercase"
                style={{ fontSize: 8, letterSpacing: "0.09em", color: "#a1a1aa" }}
            >
                {label}
            </span>
        </div>
    );
}
