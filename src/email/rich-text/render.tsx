import type { CSSProperties, ReactNode } from "react";
import type {
    RichElementNode,
    RichHeadingNode,
    RichLinkNode,
    RichListNode,
    RichMergeTagNode,
    RichNode,
    RichTextDocument,
    RichTextNode,
} from "./types.ts";
import {
    BLOCKQUOTE_STYLES,
    CODE_FONT_FAMILY,
    HEADING_SIZES,
    heading,
    LI_STYLES,
    LINK_STYLES,
    OL_STYLES,
    PARAGRAPH_STYLES,
    parseTextStyle,
    TEXT_FORMAT,
    UL_STYLES,
} from "./styles.ts";

/*
 * Pure renderer for stored rich text (serialized Lexical JSON) — walks the
 * plain JSON tree and emits inline-styled elements. Used identically by the
 * idle canvas view and the email output (docs/06), so what you see while not
 * editing IS the export. Server-safe: no lexical, no react-email, no DOM.
 */

const isElement = (node: RichNode): node is RichElementNode =>
    Array.isArray((node as RichElementNode).children);

/** Element `format` → text-align (start/end normalise to left/right). */
const alignOf = (node: RichElementNode): CSSProperties["textAlign"] => {
    const format = node.format;
    if (typeof format !== "string" || format === "") return undefined;
    if (format === "start") return "left";
    if (format === "end") return "right";
    if (format === "left" || format === "center" || format === "right" || format === "justify") return format;
    return undefined;
};

/** Block-level style overrides: alignment + NodeState line-height. */
const blockOverrides = (node: RichElementNode): CSSProperties => {
    const css: CSSProperties = {};
    const textAlign = alignOf(node);
    if (textAlign) css.textAlign = textAlign;
    const lineHeight = node.$?.lineHeight;
    if (typeof lineHeight === "number" && lineHeight > 0) {
        // Percentage so it resolves against each element's own font size —
        // stays correct under per-selection font sizes and heading scales.
        css.lineHeight = `${Math.round(lineHeight * 100)}%`;
    }
    return css;
};

const renderText = (node: RichTextNode, key: number): ReactNode => {
    const format = node.format ?? 0;
    const css: CSSProperties = parseTextStyle(node.style);
    if (format & TEXT_FORMAT.bold) css.fontWeight = 700;
    if (format & TEXT_FORMAT.italic) css.fontStyle = "italic";
    const decorations = [
        format & TEXT_FORMAT.underline ? "underline" : null,
        format & TEXT_FORMAT.strikethrough ? "line-through" : null,
    ].filter(Boolean);
    if (decorations.length) css.textDecoration = decorations.join(" ");
    if (format & TEXT_FORMAT.code) css.fontFamily = CODE_FONT_FAMILY;

    if (Object.keys(css).length === 0) return node.text;
    return (
        <span key={key} style={css}>
            {node.text}
        </span>
    );
};

/** Non-structural render hooks threaded through the walk (editor-side
 * customization; the output path passes none and gets literal text). */
interface RenderOptions {
    renderMergeTag?: (node: RichMergeTagNode) => ReactNode;
}

const renderChildren = (node: RichElementNode, options: RenderOptions): ReactNode[] =>
    (node.children ?? []).map((child, index) => renderNode(child, index, options));

const renderNode = (node: RichNode, key: number, options: RenderOptions): ReactNode => {
    switch (node.type) {
        case "text":
            return renderText(node as RichTextNode, key);
        case "linebreak":
            return <br key={key} />;
        case "merge-tag": {
            const element = node as RichMergeTagNode;
            if (options.renderMergeTag) {
                return <span key={key}>{options.renderMergeTag(element)}</span>;
            }
            // Output path: the literal token as escaped text — substitution
            // happens downstream (the ESP), never here.
            return element.token;
        }
        case "paragraph": {
            const element = node as RichElementNode;
            const children = renderChildren(element, options);
            return (
                <p key={key} style={{ ...PARAGRAPH_STYLES, ...blockOverrides(element) }}>
                    {/* An empty paragraph still takes a line (matches the editor). */}
                    {children.length ? children : " "}
                </p>
            );
        }
        case "heading": {
            const element = node as RichHeadingNode;
            const Tag = HEADING_SIZES[element.tag] ? element.tag : "h2";
            return (
                <Tag key={key} style={{ ...heading(HEADING_SIZES[Tag]), ...blockOverrides(element) }}>
                    {renderChildren(element, options)}
                </Tag>
            );
        }
        case "quote":
            return (
                <blockquote key={key} style={{ ...BLOCKQUOTE_STYLES, ...blockOverrides(node as RichElementNode) }}>
                    {renderChildren(node as RichElementNode, options)}
                </blockquote>
            );
        case "list": {
            const element = node as RichListNode;
            if (element.listType === "number") {
                return (
                    <ol key={key} start={element.start && element.start !== 1 ? element.start : undefined} style={OL_STYLES}>
                        {renderChildren(element, options)}
                    </ol>
                );
            }
            return (
                <ul key={key} style={UL_STYLES}>
                    {renderChildren(element, options)}
                </ul>
            );
        }
        case "listitem": {
            const element = node as RichElementNode;
            // A list item that only wraps a nested list carries no marker of
            // its own (lexical's nesting structure).
            const onlyNestedList =
                element.children?.length === 1 && (element.children[0] as RichElementNode).type === "list";
            return (
                <li key={key} style={onlyNestedList ? { ...LI_STYLES, listStyleType: "none" } : LI_STYLES}>
                    {renderChildren(element, options)}
                </li>
            );
        }
        case "link":
        case "autolink": {
            const element = node as RichLinkNode;
            return (
                <a
                    key={key}
                    href={element.url}
                    target={element.target ?? undefined}
                    rel={element.rel ?? undefined}
                    style={LINK_STYLES}
                >
                    {renderChildren(element, options)}
                </a>
            );
        }
        default:
            // Unknown node: render what we can of its children (tolerance —
            // a stored document must never become unrenderable).
            return isElement(node) ? <span key={key}>{renderChildren(node, options)}</span> : null;
    }
};

const parseDocument = (content: string): RichTextDocument | null => {
    try {
        const parsed: unknown = JSON.parse(content);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            typeof (parsed as RichTextDocument).root === "object" &&
            (parsed as RichTextDocument).root !== null
        ) {
            return parsed as RichTextDocument;
        }
    } catch {
        // fall through
    }
    return null;
};

export interface RichTextProps {
    /** Serialized editor state JSON (see rich-text/types.ts). */
    content: string;
    /** Editor-side hook: custom rendering for merge-tag nodes (canvas chips).
     * Omitted — the server/output path — the literal token is emitted as text. */
    renderMergeTag?: (node: RichMergeTagNode) => ReactNode;
}

export const RichText = ({ content, renderMergeTag }: RichTextProps) => {
    const document = parseDocument(content);
    if (!document) return null;
    return <>{renderChildren(document.root, { renderMergeTag })}</>;
};

const collectPlain = (node: RichNode, out: string[]): void => {
    if (node.type === "text") {
        out.push((node as RichTextNode).text);
        return;
    }
    if (node.type === "merge-tag") {
        out.push((node as RichMergeTagNode).token);
        return;
    }
    if (isElement(node)) {
        for (const child of node.children ?? []) collectPlain(child, out);
        // Block boundaries become spaces so words don't fuse.
        if (node.type !== "link" && node.type !== "autolink") out.push(" ");
    }
};

/** Plain-text projection of stored rich text (display names, previews). */
export const richTextToPlain = (content: string): string => {
    const document = parseDocument(content);
    if (!document) return "";
    const out: string[] = [];
    for (const child of document.root.children ?? []) collectPlain(child, out);
    return out.join("").replace(/\s+/g, " ").trim();
};
