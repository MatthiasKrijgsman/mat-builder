/*
 * Client-support check from the command line — the CLI twin of the
 * playground's /email-check page (same report code: site/app/email-check/report.ts).
 *
 *   node scripts/email-check.ts <file> [--clients=major|outlook|gmail|all|<glob,glob>] [--json] [--out=file.html]
 *
 * <file> is either rendered HTML (.html) or JSON: a BuilderDocument, a stored
 * playground template ({ document }), or an array of those (each checked).
 * Documents are rendered with the BUILT export pipeline (dist/), so run
 * `pnpm build` (or keep `pnpm dev:watch` running) first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { checkEmail, CLIENT_PRESETS, formatReport } from "../site/app/email-check/report.ts";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const flag = (name: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

if (!file) {
    console.error("usage: node scripts/email-check.ts <file.html|file.json> [--clients=major] [--json] [--out=file.html]");
    process.exit(2);
}

const clientsArg = flag("clients") ?? "major";
const clients = CLIENT_PRESETS[clientsArg]?.clients ?? clientsArg.split(",");

const source = readFileSync(file, "utf8");
const inputs: { name: string; html: string }[] = [];

if (extname(file) === ".html") {
    inputs.push({ name: basename(file), html: source });
} else {
    const { loadDocument, renderEmail } = await import("../dist/email/render.js");
    const parsed = JSON.parse(source);
    for (const [index, item] of (Array.isArray(parsed) ? parsed : [parsed]).entries()) {
        const raw = item.document ?? item;
        const { document } = loadDocument(raw);
        const { html } = await renderEmail(document);
        inputs.push({ name: item.name ?? `${basename(file)}#${index}`, html });
    }
}

const out = flag("out");
if (out) writeFileSync(out, inputs.map((input) => input.html).join("\n"));

const reports = inputs.map((input) => ({ name: input.name, report: checkEmail(input.html, clients) }));
if (args.includes("--json")) {
    console.log(JSON.stringify(reports, null, 2));
} else {
    for (const { name, report } of reports) console.log(`── ${name}\n${formatReport(report)}\n`);
}
