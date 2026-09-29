/*
 * Every English string in the editor chrome — docs/07 §B3.
 *
 * One flat-ish dictionary, not an i18n framework: hosts already have theirs.
 * `DEFAULT_LABELS` is the English; the `labels` prop on the provider, shell
 * and `<EmailBuilder>` takes any subset and is deep-merged over it, so a host
 * overrides one string or all of them. Components read the merged result
 * through `useLabels()`.
 *
 * Block labels and categories come from `defineBlock`, which is data, not a
 * component — so they are overridden by type and by category name in
 * `blocks` / `categories` and resolved where they are displayed (palette,
 * layer tree, inspector header, empty-container placeholders). The email
 * preset's inspector strings live under `email`.
 *
 * A string with `{name}` placeholders is filled with `formatLabel`.
 */

export const DEFAULT_LABELS = {
    shell: {
        editorFailed: "The editor could not be shown",
        needsRoomTitle: "This editor needs more room",
        needsRoom: "Widen the window to at least {minWidth}px, or open it on a larger screen.",
    },
    toolbar: { undo: "Undo", redo: "Redo" },
    palette: {
        search: "Search blocks…",
        /** Category for definitions that name none */
        uncategorized: "Blocks",
        /** Category for patterns that name none */
        patterns: "Patterns",
    },
    layers: {
        root: "Root",
        shownConditionally: "Shown conditionally",
        collapse: "Collapse",
        expand: "Expand",
    },
    inspector: {
        noBlockSelected: "No block selected",
        noSettings: "This block has no settings.",
        settingsFailed: "The settings for this block could not be rendered: {message}",
        duplicate: "Duplicate block",
        delete: "Delete block",
    },
    canvas: {
        dropContentHere: "Drop content here",
        /** `{label}` is the block's display name; the error follows on its own line */
        blockFailed: "{label} could not be rendered",
        missingBlock: "Missing block type “{type}”",
        missingComposed: "Composed block “{type}” {reason}",
        notRegistered: "is not registered",
    },
    visibility: {
        heading: "Visibility",
        always: "Always",
        ifRulesMatch: "If rules match",
        showWhen: "Show this block when…",
        oneRule: "1 rule",
        rules: "{count} rules",
        and: "And",
        or: "Or",
        everyToAny: "Every rule must match — switch to any",
        anyToEvery: "Any rule may match — switch to every",
        selectTag: "Select a merge tag",
        value: "Value",
        removeRule: "Remove rule",
        addRule: "Add rule",
        /** The canvas badge's tooltip: `{rules}` is the joined rule phrases */
        shownWhen: "Shown when {rules}",
        /** Joiners between rule phrases in that tooltip, spaces included */
        joinAnd: " and ",
        joinOr: " or ",
        /** Operator labels, by `VisibilityOperator` */
        operators: {
            exists: "is provided",
            notExists: "is empty",
            eq: "is",
            neq: "is not",
            contains: "contains",
            notContains: "does not contain",
        },
    },
    previewData: {
        heading: "Preview data",
        none: "No merge tags in use",
        noneHint: "Insert a merge tag, or add a visibility rule, and it shows up here to preview with.",
        hint: "Stand-in values for this preview only. Tags left empty stay visible as their token.",
        clear: "Clear",
        noValue: "No value",
        rulesOnly: "Used by visibility rules only",
    },
    link: {
        button: "Link",
        url: "Link URL",
        placeholder: "https://… or a merge tag",
        apply: "Apply",
        remove: "Remove link",
        selectFirst: "Select the text you want to link first.",
    },
    mergeTags: {
        insert: "Insert merge tag",
        search: "Search tags…",
    },
    fields: {
        auto: "Auto",
        inherit: "Inherit",
        mix: "Mix",
    },
    typography: {
        font: "Font",
        fontFamily: "Font family",
        fontSize: "Font size (px)",
        fontWeight: "Font weight",
        letterSpacing: "Letter spacing (px)",
        lineHeight: "Line height (multiplier)",
        textColor: "Text color",
        textOpacity: "Text opacity (%)",
        bold: "Bold",
        light: "Light",
        regular: "Regular",
        medium: "Medium",
        semibold: "Semibold",
        alignLeft: "Align left",
        alignCenter: "Align center",
        alignRight: "Align right",
        alignTop: "Align top",
        alignMiddle: "Align middle",
        alignBottom: "Align bottom",
    },
    styleGroups: {
        background: {
            heading: "Background",
            none: "None",
            solid: "Solid",
            gradient: "Gradient",
            image: "Image",
            color: "Color",
            from: "From",
            to: "To",
            angle: "Angle",
            imageUrl: "Image URL",
            size: "Size",
            cover: "Cover",
            contain: "Contain",
            auto: "Auto",
            position: "Position",
            repeat: "Repeat",
            fallbackColor: "Fallback color",
            fallbackHint: "Shown while the image loads and in clients that ignore background images",
        },
        border: { heading: "Border", width: "Width", style: "Style", color: "Color", radius: "Radius" },
        effects: {
            heading: "Effects",
            opacity: "Opacity",
            shadow: "Shadow",
            none: "None",
            drop: "Drop",
            inner: "Inner",
            blur: "Blur",
            spread: "Spread",
            color: "Color",
            shadowOpacity: "Shadow opacity",
        },
        layout: {
            heading: "Layout",
            horizontalAlign: "Horizontal align",
            verticalAlign: "Vertical align",
            start: "Start",
            center: "Center",
            middle: "Middle",
            end: "End",
            stretch: "Stretch",
            gap: "Gap",
        },
        size: { heading: "Size", width: "Width", height: "Height" },
        spacing: { heading: "Spacing", padding: "Padding", margin: "Margin" },
        typography: {
            heading: "Typography",
            fontFamily: "Font family",
            size: "Size",
            lineHeight: "Line height",
            letterSpacing: "Letter spacing",
            color: "Color",
            textOpacity: "Text opacity",
            align: "Align",
            left: "Left",
            center: "Center",
            right: "Right",
        },
    },
    /** Per block type: the palette/tree label, and container labels and placeholders. */
    blocks: {} as Record<string, { label?: string; containers?: Record<string, { label?: string; placeholder?: string }> }>,
    /** Per category name, as `defineBlock` spells it. */
    categories: {} as Record<string, string>,
    /** The email preset's own inspector and canvas strings. */
    email: {
        previewTitle: "Email preview",
        container: {
            direction: "Direction",
            vertical: "Vertical",
            horizontal: "Horizontal",
            stackOnMobile: "Stack on mobile",
            stackOnMobileHint: "Below {breakpoint}px the columns stack top to bottom in the sent email.",
            columns: "Columns",
            columnsAuto: "Auto",
            columnsEqual: "Equal",
            columnsAutoHint: "Each block's width sets its column: Fill shares the row, Fixed and Hug keep their size, and Horizontal alignment places the group.",
            columnsEqualHint: "The row splits into equal columns; each block aligns itself inside its column.",
        },
        button: { label: "Label", link: "Link", alignment: "Alignment" },
        image: {
            imageUrl: "Image URL",
            altText: "Alt text",
            link: "Link (optional)",
            alignment: "Alignment",
            placeholder: "Set an image URL in the inspector",
        },
        divider: { thickness: "Thickness", color: "Color" },
        spacer: { height: "Height" },
        root: {
            contentWidth: "Content width",
            pageBackground: "Page background",
            pagePadding: "Page padding",
            typography: "Typography",
            keepLightColors: "Keep light colors in dark mode",
            keepLightColorsHint: "Asks mail clients not to recolor the email. On by default. Apple Mail and Outlook.com follow it; the Gmail apps and Outlook for Windows invert regardless.",
        },
        table: {
            addRow: "Add a row",
            allCells: "All cells",
            auto: "Auto",
            background: "Background",
            body: "Body",
            borders: "Borders",
            cell: "Cell",
            cellPadding: "Cell padding",
            columnSizing: "Column sizing",
            emptyCell: "Empty cell",
            emptyRow: "Empty row",
            fixed: "Fixed",
            footer: "Footer",
            header: "Header",
            horizontalRules: "Horizontal rules",
            minHeight: "Min height",
            none: "None",
            outerFrameOnly: "Outer frame only",
            row: "Row",
            rowType: "Row type",
            stripeColor: "Stripe color",
            stripedRows: "Striped rows",
            verticalRules: "Vertical rules",
            inheritFromTable: "Inherit from table",
            inheritFromRow: "Inherit from row",
            align: "Align",
            left: "Left",
            center: "Center",
            right: "Right",
            top: "Top",
            middle: "Middle",
            bottom: "Bottom",
            verticalAlign: "Vertical align",
            width: "Width",
            widthPlaceholder: "auto, 30% or 120px",
            columnSpan: "Column span",
            rowSpan: "Row span",
            padding: "Padding",
        },
    },
};

export type BuilderLabels = typeof DEFAULT_LABELS;

/** Any subset of the dictionary, to any depth — what the `labels` prop takes. */
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type BuilderLabelOverrides = DeepPartial<BuilderLabels>;

/** Fills `{name}` placeholders. Unknown placeholders stay as written. */
export function formatLabel(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function deepMerge<T>(base: T, over: unknown): T {
    if (!isRecord(base) || !isRecord(over)) return (over === undefined ? base : over) as T;
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(over)) {
        if (value === undefined) continue;
        out[key] = isRecord(value) && isRecord(out[key]) ? deepMerge(out[key], value) : value;
    }
    return out as T;
}

/** The English with a host's overrides deep-merged over it. */
export function resolveLabels(overrides: BuilderLabelOverrides | undefined): BuilderLabels {
    return overrides ? deepMerge(DEFAULT_LABELS, overrides) : DEFAULT_LABELS;
}
