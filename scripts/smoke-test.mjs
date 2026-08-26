#!/usr/bin/env node
/*
 * Clean-room consumer smoke test — docs/07 §A6.
 *
 * Packs the library, installs the tarball into an empty project with only the
 * declared peers, and checks that a real consumer can actually use it. This is
 * the one test that sees packaging: the exports map, the peer/dependency
 * split, the "use client" banners, whether the server entry runs without a
 * bundler, and whether the published types resolve.
 *
 * None of that is visible to vitest, which imports source from inside the repo
 * where everything resolves whether it is declared or not.
 *
 *   node scripts/smoke-test.mjs [--keep]
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const keep = process.argv.includes("--keep");
const work = mkdtempSync(join(tmpdir(), "mat-builder-smoke-"));
const run = (cmd, args, cwd) =>
    execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

let step = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const heading = (msg) => console.log(`\n[${++step}] ${msg}`);

try {
    /* ── Pack ─────────────────────────────────────────────────────────── */
    heading("pack the library");
    run("npm", ["run", "build"], repo);
    const packed = run("npm", ["pack", "--pack-destination", work], repo).trim().split("\n").pop();
    const tarball = join(work, packed);
    ok(`packed ${packed}`);

    // The tarball is the published artifact — check it carries what it claims.
    const files = run("tar", ["-tzf", tarball]).split("\n");
    for (const required of ["package/dist/index.js", "package/dist/email.js", "package/dist/email/render.js",
                            "package/dist/index.d.ts", "package/dist/style.css"]) {
        if (!files.includes(required)) throw new Error(`tarball is missing ${required}`);
    }
    ok("tarball carries every entry point named in `exports`");

    /* ── Install into an empty project ────────────────────────────────── */
    heading("install into a clean project, with only the declared peers");
    const app = join(work, "app");
    run("mkdir", ["-p", app]);
    writeFileSync(join(app, "package.json"),
        JSON.stringify({ name: "smoke", private: true, version: "0.0.0", type: "module" }, null, 2));

    const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
    // mat-ui declares its own peers and zero dependencies, so a consumer has to
    // satisfy those too — install exactly what the docs tell them to.
    const matUiPeers = JSON.parse(
        readFileSync(join(repo, "node_modules/@matthiaskrijgsman/mat-ui/package.json"), "utf8"),
    ).peerDependencies ?? {};
    const wanted = { ...pkg.peerDependencies, ...matUiPeers };
    const specs = Object.entries(wanted).map(([name, range]) => `${name}@${range}`);
    run("npm", ["install", "--silent", "--no-audit", "--no-fund", tarball, ...specs], app);
    ok(`installed the tarball + ${specs.length} peers with no errors`);

    /* ── The server entry must run with no bundler at all ─────────────── */
    heading("render an email from plain node");
    writeFileSync(join(app, "server.mjs"), `
import { renderEmail } from "@matthiaskrijgsman/mat-builder/email/render";
const doc = { version: 1, rootId: "r", blocks: {
  r: { id: "r", type: "email-root", props: {}, children: { main: ["c"] } },
  c: { id: "c", type: "container", props: {}, children: { content: ["b"] } },
  b: { id: "b", type: "button", props: { label: "SMOKE-OK", href: "https://x.test" }, children: {} },
} };
const { html, text } = await renderEmail(doc);
if (!html.includes("SMOKE-OK")) throw new Error("html missing the button label");
if (!text.includes("SMOKE-OK")) throw new Error("text missing the button label");
if (!html.includes("<table")) throw new Error("output is not table-based");
console.log("render ok");
`);
    run("node", ["server.mjs"], app);
    ok("`/email/render` rendered table-based html + text with no bundler");

    /* ── The client entries must typecheck as a consumer sees them ────── */
    heading("typecheck a consumer's own code against the published types");
    run("npm", ["install", "--silent", "--no-audit", "--no-fund", "-D",
        "typescript@~5.8.3", "@types/react@^19", "@types/react-dom@^19"], app);
    writeFileSync(join(app, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
            target: "ES2022", lib: ["ES2022", "DOM"], module: "ESNext", moduleResolution: "Bundler",
            jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true,
        },
        include: ["*.tsx", "*.ts"],
    }, null, 2));
    writeFileSync(join(app, "consumer.tsx"), `
import { defineBlock, definePattern, slot, Fields, StyleGroups, InspectorGroup,
         defaultSpacing, richTextParagraph, type BlockSpec, type BuilderDocument,
         type BuilderTheme } from "@matthiaskrijgsman/mat-builder";
import { EmailBuilder, acceptsEmailContent } from "@matthiaskrijgsman/mat-builder/email";
import "@matthiaskrijgsman/mat-builder/style";

interface CardProps { title: string }
const compose = (props: CardProps): BlockSpec => ({
    type: "container",
    children: { content: [
        { type: "text", props: { content: props.title }, bind: { content: "title" } },
        { type: "container", children: { content: slot("body") } },
    ] },
});

const card = defineBlock<CardProps>({
    type: "card", label: "Card",
    defaultProps: { title: richTextParagraph("Hi") },
    containers: [{ name: "body", layout: "vertical", accepts: acceptsEmailContent }],
    compose,
    inspector: ({ props, update }) => (
        <InspectorGroup label="Card">
            <Fields.TextField label="Title" value={props.title} onChange={(title) => update({ title })} />
            <StyleGroups.SpacingGroup value={defaultSpacing} onChange={() => {}} />
        </InspectorGroup>
    ),
});

const hero = definePattern({ id: "hero", label: "Hero", spec: { type: "container" } });
const theme: BuilderTheme = { "color-selection": "#e11d48" };

export function App({ doc }: { doc: BuilderDocument }) {
    return <EmailBuilder defaultValue={doc} blocks={[card]} patterns={[hero]}
                         theme={theme} colorScheme="dark" onSave={() => {}} />;
}
`);
    run("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], app);
    ok("a custom block, a pattern and a theme all typecheck against `dist`");

    /* ── The optional peers must really be optional ───────────────────── */
    heading("core entry works without the optional email peers");
    const core = join(work, "core-only");
    run("mkdir", ["-p", core]);
    writeFileSync(join(core, "package.json"),
        JSON.stringify({ name: "core-only", private: true, version: "0.0.0", type: "module" }, null, 2));
    const nonOptional = Object.entries(pkg.peerDependencies)
        .filter(([name]) => !pkg.peerDependenciesMeta?.[name]?.optional)
        .map(([name, range]) => `${name}@${range}`);
    run("npm", ["install", "--silent", "--no-audit", "--no-fund", tarball,
        ...nonOptional, ...Object.entries(matUiPeers).map(([n, r]) => `${n}@${r}`)], core);
    const coreModules = readdirSync(join(core, "node_modules"));
    if (coreModules.includes("react-email")) {
        throw new Error("`react-email` was installed despite being an optional peer");
    }
    ok("`react-email` is genuinely skippable — nothing pulled it in");

    console.log("\nSMOKE TEST PASSED\n");
} catch (error) {
    console.error("\nSMOKE TEST FAILED\n");
    console.error(error.stdout?.toString() ?? "");
    console.error(error.stderr?.toString() ?? error.message);
    process.exitCode = 1;
} finally {
    if (keep) console.log(`workspace kept at ${work}`);
    else rmSync(work, { recursive: true, force: true });
}
