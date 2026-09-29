"use client";

import type { BuilderDocument } from "@matthiaskrijgsman/mat-builder";
import { Badge, Button, InputSelect, InputTextArea, Spinner, TabButtons } from "@matthiaskrijgsman/mat-ui";
import { IconArrowLeft, IconCopy, IconDownload, IconFileCode } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { composeProductCard, PRODUCT_CARD_TYPE, productCardDefaults } from "../custom";
import { readLibrary, readOpenId } from "../templates/storage";
import type { StoredTemplate } from "../templates/types";
import { canHighlight, highlight, HIT_ATTRIBUTE } from "./highlight";
import { checkEmail, CLIENT_PRESETS, clientLabel, DATA_SNAPSHOT, formatReport, type FeatureFinding } from "./report";

/*
 * /email-check — the export pipeline's output, run through doiuse-email
 * (caniemail.com). Pick a template from the playground's library (the same
 * localStorage the builder autosaves to, so an edit in another tab shows up
 * here live) or paste HTML from anywhere — a production send, say. Clicking
 * a finding outlines the elements that use it in the preview.
 *
 * Static analysis only: it says which features a client is documented not to
 * support, not what the client actually draws. Real-client screenshots
 * (Litmus, Email on Acid, testi.at) remain the final word.
 */

// Composed custom blocks from ./custom, so the playground's own templates
// render here exactly as they do in the builder's preview.
const RENDER_BLOCKS = [{ type: PRODUCT_CARD_TYPE, defaultProps: productCardDefaults, compose: composeProductCard }];

/*
 * Frame widths are the frame's VIEWPORT (content-box, border outside), since
 * that is what the email's media query measures. Desktop is the whole email:
 * the root's content width plus its page padding. A 600px viewport would
 * trip the `max-width: 600px` stacking rule, which is the phone layout.
 * Pasted HTML has no root props to read, so it gets a common reading-pane width.
 */
const MOBILE_WIDTH = 375;
const PASTED_DESKTOP_WIDTH = 640;

function desktopWidth(document: BuilderDocument | undefined): number {
    const props = document?.blocks[document.rootId]?.props as
        | { contentWidth?: number; spacing?: { padding?: { left?: number; right?: number } } }
        | undefined;
    if (!props) return PASTED_DESKTOP_WIDTH;
    const padding = (props.spacing?.padding?.left ?? 0) + (props.spacing?.padding?.right ?? 0);
    return Math.max(PASTED_DESKTOP_WIDTH, (props.contentWidth ?? 600) + padding);
}

type Source = "template" | "html";

async function renderDocument(document: BuilderDocument): Promise<string> {
    const { renderEmail } = await import("@matthiaskrijgsman/mat-builder/email/render");
    return (await renderEmail(document, { blocks: RENDER_BLOCKS })).html;
}

export default function EmailCheckPage() {
    const [templates, setTemplates] = useState<StoredTemplate[] | null>(null);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [source, setSource] = useState<Source>("template");
    const [pasted, setPasted] = useState("");
    const [preset, setPreset] = useState("major");
    const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
    const [selected, setSelected] = useState<string | null>(null);
    const [rendered, setRendered] = useState<{ html: string; error: string | null }>({ html: "", error: null });

    // localStorage is read after mount (static export), and again whenever the
    // builder in another tab writes to it — its autosave makes this live.
    useEffect(() => {
        const load = () => setTemplates(readLibrary() ?? []);
        load();
        setTemplateId((current) => current ?? readOpenId());
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const template = templates?.find((entry) => entry.id === templateId) ?? templates?.[0] ?? null;

    useEffect(() => {
        if (source !== "template" || !template) return;
        let cancelled = false;
        renderDocument(template.document)
            .then((html) => !cancelled && setRendered({ html, error: null }))
            .catch((reason: unknown) => {
                if (!cancelled) setRendered({ html: "", error: reason instanceof Error ? reason.message : String(reason) });
            });
        return () => {
            cancelled = true;
        };
    }, [source, template]);

    const html = source === "html" ? pasted : rendered.html;
    const desktop = desktopWidth(source === "template" ? template?.document : undefined);
    const frameWidth = width === "desktop" ? desktop : MOBILE_WIDTH;
    const clients = CLIENT_PRESETS[preset].clients;
    const report = useMemo(() => (html.trim() ? checkEmail(html, clients) : null), [html, clients]);
    const marked = useMemo(() => highlight(html, selected), [html, selected]);

    // A finding that no longer exists (new HTML, other clients) deselects.
    useEffect(() => {
        if (selected && !report?.features.some((finding) => finding.feature === selected)) setSelected(null);
    }, [report, selected]);

    // Scroll the first outlined element into view. The iframe is sandboxed
    // without scripts, but same-origin so the page can reach into it.
    const frame = useRef<HTMLIFrameElement>(null);
    const scrollToHit = () => {
        frame.current?.contentDocument?.querySelector(`[${HIT_ATTRIBUTE}]`)?.scrollIntoView({ block: "center" });
    };

    const copy = (text: string) => void navigator.clipboard.writeText(text);
    const download = () => {
        const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        const link = Object.assign(document.createElement("a"), { href: url, download: `${template?.name ?? "email"}.html` });
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!templates) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-[var(--mat-builder-color-canvas-bg)] text-[var(--mat-builder-color-panel-fg)]">
            <header className="flex flex-wrap items-center gap-3 border-b border-[var(--mat-builder-color-panel-border)] bg-[var(--mat-builder-color-panel-bg)] px-4 py-2">
                <Link href="/">
                    <Button size="sm" variant="white" Icon={IconArrowLeft}>
                        Builder
                    </Button>
                </Link>
                <h1 className="font-semibold">Client support check</h1>
                <TabButtons
                    size="sm"
                    tabs={[
                        { label: "Template", active: source === "template", onClick: () => setSource("template") },
                        { label: "Paste HTML", active: source === "html", onClick: () => setSource("html") },
                    ]}
                />
                {source === "template" && (
                    <InputSelect
                        size="sm"
                        options={templates.map((entry) => ({ label: entry.name, value: entry.id }))}
                        value={template?.id ?? null}
                        placeholder="No templates"
                        onChange={(id) => id && setTemplateId(id)}
                    />
                )}
                <InputSelect
                    size="sm"
                    options={Object.entries(CLIENT_PRESETS).map(([value, entry]) => ({
                        label: `${entry.label} (${entry.clients.length})`,
                        value,
                    }))}
                    value={preset}
                    onChange={(value) => value && setPreset(value)}
                />
                <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="white" Icon={IconCopy} disabled={!report} onClick={() => report && copy(formatReport(report))}>
                        Copy report
                    </Button>
                    {source === "template" && template && (
                        <Button size="sm" variant="white" Icon={IconFileCode} onClick={() => copy(JSON.stringify(template, null, 2))}>
                            Copy document JSON
                        </Button>
                    )}
                    <Button size="sm" variant="white" Icon={IconDownload} disabled={!html} onClick={download}>
                        HTML
                    </Button>
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-auto p-6">
                    {source === "html" && (
                        <div className="mx-auto w-full max-w-[900px] shrink-0">
                            <InputTextArea
                                label="Email HTML"
                                description="Paste the HTML of a sent email (e.g. “Show original” in Gmail, or your ESP’s source view)."
                                rows={6}
                                value={pasted}
                                onChange={(event) => setPasted(event.target.value)}
                                className="font-mono text-xs"
                            />
                        </div>
                    )}
                    <TabButtons
                        size="sm"
                        className="shrink-0 self-center"
                        tabs={[
                            { label: `Desktop ${desktop}`, active: width === "desktop", onClick: () => setWidth("desktop") },
                            { label: `Mobile ${MOBILE_WIDTH}`, active: width === "mobile", onClick: () => setWidth("mobile") },
                        ]}
                    />
                    {rendered.error && source === "template" ? (
                        <pre className="whitespace-pre-wrap text-xs text-[var(--mat-builder-color-missing-fg)]">{rendered.error}</pre>
                    ) : (
                        <iframe
                            ref={frame}
                            title="Email preview"
                            srcDoc={marked.html}
                            // No scripts, ever — but same-origin so the page
                            // can scroll to an outlined element.
                            sandbox="allow-same-origin"
                            onLoad={scrollToHit}
                            style={{ width: frameWidth, boxSizing: "content-box" }}
                            className="mx-auto min-h-[600px] shrink-0 grow border border-[var(--mat-builder-color-artboard-border)] bg-white shadow-sm"
                        />
                    )}
                </main>

                <aside className="flex w-[440px] shrink-0 flex-col overflow-auto border-l border-[var(--mat-builder-color-panel-border)] bg-[var(--mat-builder-color-panel-bg)]">
                    <div className="border-b border-[var(--mat-builder-color-panel-border)] p-4">
                        {report ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge color="red">{report.unsupportedCount} unsupported</Badge>
                                <Badge color="amber">{report.partialCount} partial</Badge>
                                <span className="text-xs text-[var(--mat-builder-color-panel-muted-fg)]">
                                    across {report.clients.length} clients
                                </span>
                            </div>
                        ) : (
                            <p className="text-[var(--mat-builder-color-panel-muted-fg)]">Nothing to check yet.</p>
                        )}
                        <p className="mt-2 text-xs text-[var(--mat-builder-color-panel-muted-fg)]">
                            caniemail data snapshot {DATA_SNAPSHOT} (via doiuse-email). Documented support only — confirm in real
                            clients. Click a finding to outline where it is used.
                        </p>
                        {selected && (
                            <p className="mt-2 text-xs">
                                Outlining <code>{selected}</code>: {marked.hits} element{marked.hits === 1 ? "" : "s"}.
                            </p>
                        )}
                    </div>
                    <ul className="flex flex-col">
                        {report?.features.map((finding) => (
                            <FindingRow
                                key={finding.feature}
                                finding={finding}
                                clients={report.clients}
                                selected={finding.feature === selected}
                                onSelect={() => setSelected(finding.feature === selected ? null : finding.feature)}
                            />
                        ))}
                    </ul>
                </aside>
            </div>
        </div>
    );
}

function FindingRow(props: { finding: FeatureFinding; clients: string[]; selected: boolean; onSelect: () => void }) {
    const { finding, clients, selected, onSelect } = props;
    const unsupported = clients.filter((client) => finding.support[client] === "unsupported");
    const partial = clients.filter((client) => finding.support[client] === "partial");
    const pointable = canHighlight(finding.feature);

    return (
        <li
            className={`border-b border-[var(--mat-builder-color-panel-border)] ${selected ? "bg-[var(--mat-builder-color-layer-row-selected-bg)]" : ""}`}
        >
            <button type="button" onClick={onSelect} className="flex w-full flex-col gap-2 p-4 text-left">
                <div className="flex items-center gap-2">
                    <span
                        className={`size-2 shrink-0 rounded-full ${finding.severity === "unsupported" ? "bg-red-500" : "bg-amber-400"}`}
                    />
                    <code className="font-semibold">{finding.feature}</code>
                    <span className="text-xs text-[var(--mat-builder-color-panel-muted-fg)]">
                        {finding.occurrences}× {pointable ? "" : "· in <style>"}
                    </span>
                </div>
                {unsupported.length > 0 && <ClientList label="Unsupported" clients={unsupported} color="red" />}
                {partial.length > 0 && <ClientList label="Partial" clients={partial} color="amber" />}
                {selected && finding.notes.length > 0 && (
                    <ul className="flex flex-col gap-1.5 text-xs text-[var(--mat-builder-color-panel-muted-fg)]">
                        {finding.notes.map((note) => (
                            <li key={note.text}>
                                <span className="font-medium text-[var(--mat-builder-color-panel-fg)]">
                                    {note.clients.map(clientLabel).join(", ")}:
                                </span>{" "}
                                {note.text}
                            </li>
                        ))}
                    </ul>
                )}
            </button>
        </li>
    );
}

function ClientList({ label, clients, color }: { label: string; clients: string[]; color: "red" | "amber" }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            <span className="w-20 text-xs text-[var(--mat-builder-color-panel-muted-fg)]">{label}</span>
            {clients.map((client) => (
                <Badge key={client} color={color}>
                    {clientLabel(client)}
                </Badge>
            ))}
        </div>
    );
}
