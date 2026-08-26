import type { CSSProperties } from "react";

/*
 * Theming — see docs/guides/theming.md.
 *
 * The editor's chrome is built entirely from `--mat-builder-*` custom
 * properties (src/styles/tokens.css), so a host restyles it by overriding
 * variables rather than forking components. There are two ways to do that
 * and they are complementary:
 *
 *   - A stylesheet rule, for "our builder always looks like this".
 *   - This `theme` prop, for per-instance overrides and for values that come
 *     from data rather than from CSS — a brand colour out of a database, a
 *     preview of a theme the user is editing.
 *
 * Keys are token names WITHOUT the `--mat-builder-` prefix, so they read the
 * same here as in the stylesheet and stay greppable against it. The union is
 * kept in step with tokens.css by src/styles/tokens.test.ts.
 */

/** Every themeable token, minus the `--mat-builder-` prefix. */
export type BuilderToken =
    | "chrome-handle-border"
    | "chrome-handle-radius"
    | "chrome-handle-size"
    | "chrome-lift-scale"
    | "chrome-radius"
    | "chrome-ring-offset"
    | "chrome-ring-width"
    | "chrome-ring-width-strong"
    | "chrome-shadow-drag"
    | "chrome-shadow-hover"
    | "chrome-shadow-selected"
    | "color-artboard-bg"
    | "color-artboard-border"
    | "color-artboard-shadow"
    | "color-canvas-bg"
    | "color-canvas-dot"
    | "color-chrome-handle-bg"
    | "color-chrome-tag-fg"
    | "color-conditional-bg"
    | "color-conditional-fg"
    | "color-conditional-ring"
    | "color-drop-blocked"
    | "color-drop-indicator"
    | "color-drop-parent"
    | "color-hover"
    | "color-input-label"
    | "color-layer-row-hover-bg"
    | "color-layer-row-selected-bg"
    | "color-layer-row-selected-fg"
    | "color-merge-tag-bg"
    | "color-merge-tag-fg"
    | "color-missing-bg"
    | "color-missing-border"
    | "color-missing-fg"
    | "color-panel-bg"
    | "color-panel-border"
    | "color-panel-fg"
    | "color-panel-muted-fg"
    | "color-placeholder-border"
    | "color-placeholder-fg"
    | "color-resize-handle"
    | "color-resize-handle-active"
    | "color-resize-handle-hover"
    | "color-rule-accent"
    | "color-rule-bg"
    | "color-rule-border"
    | "color-rule-joiner-bg"
    | "color-rule-joiner-fg"
    | "color-scrollbar-thumb"
    | "color-selection"
    | "conditional-badge-opacity"
    | "conditional-badge-size"
    | "drag-source-opacity"
    | "drop-indicator-thickness"
    | "duration-lift"
    | "duration-panel-slide"
    | "duration-ring"
    | "duration-shadow"
    | "ease-panel-slide"
    | "ease-spring"
    | "palette-tint-1-fg"
    | "palette-tint-2-fg"
    | "palette-tint-3-fg"
    | "palette-tint-4-fg"
    | "palette-tint-5-fg"
    | "palette-tint-6-fg"
    | "palette-tint-7-fg"
    | "sidebar-width";

/**
 * Token overrides for one builder instance. Values are raw CSS, so anything
 * valid for that property works — a hex, a `color-mix()`, a `var()` pointing
 * at the host's own design tokens.
 */
export type BuilderTheme = Partial<Record<BuilderToken, string>>;

/**
 * Turns a theme into inline custom properties for the shell's root element.
 * Custom properties inherit, so setting them there reaches every panel, the
 * canvas, and the chrome overlay.
 */
export function themeToStyle(theme: BuilderTheme | undefined): CSSProperties {
    if (!theme) return {};
    const style: Record<string, string> = {};
    for (const [token, value] of Object.entries(theme)) {
        if (value !== undefined) style[`--mat-builder-${token}`] = value;
    }
    return style as CSSProperties;
}

/**
 * Which colour scheme a builder uses.
 *
 * `"inherit"` (the default) takes it from a `.dark` ancestor — the Tailwind
 * convention most hosts already drive, so a host that toggles dark mode
 * toggles the builder with it and needs none of this. The explicit values
 * pin one instance regardless of the page around it.
 */
export type BuilderColorScheme = "inherit" | "light" | "dark";

/** The attribute the CSS keys off; `undefined` for "inherit" (no attribute). */
export function colorSchemeAttr(scheme: BuilderColorScheme | undefined): string | undefined {
    return scheme && scheme !== "inherit" ? scheme : undefined;
}
