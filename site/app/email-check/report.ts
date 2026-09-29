import { doIUseEmail } from "doiuse-email";

/*
 * Client-support report for rendered email HTML, via doiuse-email (the
 * caniemail.com database). Pure: shared by the /email-check page and
 * `scripts/email-check.ts`, so the browser and the CLI can never disagree.
 *
 * doiuse-email reports one flat string per (feature, client) pair; this
 * regroups them per feature, which is the question worth asking of a
 * template ("what here breaks, and where?").
 *
 * Caveat: the database is the snapshot doiuse-email ships (see
 * DATA_SNAPSHOT) — caniemail itself moves on, so a missing finding is not
 * proof of support. Real-client screenshots are still the final word.
 */

export const DATA_SNAPSHOT = "2023-10-10";

export interface EmailClientInfo {
    id: string;
    family: string;
    platform: string;
}

/** Every client doiuse-email knows, grouped by family (its own spelling). */
export const EMAIL_CLIENTS: EmailClientInfo[] = [
    ["apple-mail", "Apple Mail", ["macos", "ios"]],
    ["gmail", "Gmail", ["desktop-webmail", "ios", "android", "mobile-webmail"]],
    ["outlook", "Outlook", ["windows", "windows-mail", "macos", "ios", "android"]],
    ["yahoo", "Yahoo", ["desktop-webmail", "ios", "android"]],
    ["aol", "AOL", ["desktop-webmail", "ios", "android"]],
    ["samsung-email", "Samsung Email", ["android"]],
    ["thunderbird", "Thunderbird", ["macos"]],
    ["protonmail", "Proton Mail", ["desktop-webmail", "ios", "android"]],
    ["hey", "HEY", ["desktop-webmail"]],
    ["fastmail", "Fastmail", ["desktop-webmail"]],
    ["orange", "Orange", ["desktop-webmail", "ios", "android"]],
    ["sfr", "SFR", ["desktop-webmail", "ios", "android"]],
    ["mail-ru", "Mail.ru", ["desktop-webmail"]],
    ["laposte", "La Poste", ["desktop-webmail"]],
].flatMap(([key, family, platforms]) =>
    (platforms as string[]).map((platform) => ({ id: `${key}.${platform}`, family: family as string, platform })),
);

const PLATFORM_LABELS: Record<string, string> = {
    macos: "macOS",
    ios: "iOS",
    android: "Android",
    windows: "Windows",
    "windows-mail": "Windows Mail",
    "desktop-webmail": "Web",
    "mobile-webmail": "Mobile web",
};

export function clientLabel(id: string): string {
    const client = EMAIL_CLIENTS.find((entry) => entry.id === id);
    if (!client) return id;
    // Classic Outlook for Windows is the Word engine — the one to worry about.
    if (id === "outlook.windows") return "Outlook Windows (Word)";
    return `${client.family} ${PLATFORM_LABELS[client.platform] ?? client.platform}`;
}

export const CLIENT_PRESETS: Record<string, { label: string; clients: string[] }> = {
    major: {
        label: "Major clients",
        clients: [
            "apple-mail.macos",
            "apple-mail.ios",
            "gmail.desktop-webmail",
            "gmail.ios",
            "gmail.android",
            "outlook.windows",
            "outlook.windows-mail",
            "outlook.macos",
            "outlook.ios",
            "yahoo.desktop-webmail",
            "samsung-email.android",
        ],
    },
    outlook: { label: "Outlook", clients: EMAIL_CLIENTS.filter((c) => c.id.startsWith("outlook.")).map((c) => c.id) },
    gmail: { label: "Gmail", clients: EMAIL_CLIENTS.filter((c) => c.id.startsWith("gmail.")).map((c) => c.id) },
    all: { label: "All", clients: EMAIL_CLIENTS.map((c) => c.id) },
};

export type Support = "unsupported" | "partial";

export interface FeatureFinding {
    /** caniemail's feature title — `border-radius`, `<body> element`, `@media` */
    feature: string;
    /** Worst support across the checked clients */
    severity: Support;
    /** client id → support; clients that fully support it are absent */
    support: Record<string, Support>;
    /** caniemail's notes, each with the clients it applies to (can include
     * clients that support the feature fully) */
    notes: { text: string; clients: string[] }[];
    /** How many times the HTML uses it (doiuse reports once per use) */
    occurrences: number;
}

export interface EmailReport {
    clients: string[];
    features: FeatureFinding[];
    unsupportedCount: number;
    partialCount: number;
}

const ERROR = /^`(.+)` is not supported by `(.+)`$/s;
const WARNING = /^`(.+)` is only partially supported by `(.+)`$/s;
const NOTE = /^Note about `(.+)` support for `([^`]+)`: (.*)$/s;

export function checkEmail(html: string, clients: string[]): EmailReport {
    const result = clients.length > 0 ? doIUseEmail(html, { emailClients: clients }) : null;
    const byFeature = new Map<string, FeatureFinding>();
    const entry = (feature: string) => {
        let found = byFeature.get(feature);
        if (!found) {
            found = { feature, severity: "partial", support: {}, notes: [], occurrences: 0 };
            byFeature.set(feature, found);
        }
        return found;
    };

    // Uses per (feature, client) — every client sees the same HTML, so the
    // largest count is the number of uses.
    const uses = new Map<string, number>();
    const count = (feature: string, client: string) => {
        const key = `${feature}\u0000${client}`;
        const next = (uses.get(key) ?? 0) + 1;
        uses.set(key, next);
        const found = entry(feature);
        found.occurrences = Math.max(found.occurrences, next);
        return found;
    };
    for (const message of result && !result.success ? result.errors : []) {
        const match = ERROR.exec(message);
        if (match) count(match[1], match[2]).support[match[2]] = "unsupported";
    }
    for (const message of result?.warnings ?? []) {
        const match = WARNING.exec(message);
        if (match) count(match[1], match[2]).support[match[2]] ??= "partial";
    }
    for (const message of result?.notes ?? []) {
        const match = NOTE.exec(message);
        if (!match) continue;
        const [, feature, client, text] = match;
        // A note alone (no error/warning) is informational — keep it only
        // on features already reported, so the list stays about problems.
        const found = byFeature.get(feature);
        if (!found) continue;
        const note = found.notes.find((existing) => existing.text === text);
        if (!note) found.notes.push({ text, clients: [client] });
        else if (!note.clients.includes(client)) note.clients.push(client);
    }

    const features = [...byFeature.values()];
    for (const finding of features) {
        finding.severity = Object.values(finding.support).includes("unsupported") ? "unsupported" : "partial";
    }
    const reach = (finding: FeatureFinding) => Object.keys(finding.support).length;
    features.sort(
        (a, b) =>
            Number(b.severity === "unsupported") - Number(a.severity === "unsupported") ||
            reach(b) - reach(a) ||
            a.feature.localeCompare(b.feature),
    );

    return {
        clients,
        features,
        unsupportedCount: features.filter((f) => f.severity === "unsupported").length,
        partialCount: features.filter((f) => f.severity === "partial").length,
    };
}

/** Plain-text rendering of a report, for the CLI and for pasting into a chat. */
export function formatReport(report: EmailReport): string {
    const lines = [
        `Checked ${report.clients.length} clients (caniemail snapshot ${DATA_SNAPSHOT}): ` +
            `${report.unsupportedCount} unsupported, ${report.partialCount} partial.`,
    ];
    for (const finding of report.features) {
        const uses = finding.occurrences === 1 ? "1 use" : `${finding.occurrences} uses`;
        lines.push("", `${finding.severity === "unsupported" ? "✗" : "~"} ${finding.feature} (${uses})`);
        const unsupported = report.clients.filter((c) => finding.support[c] === "unsupported");
        const partial = report.clients.filter((c) => finding.support[c] === "partial");
        if (unsupported.length) lines.push(`    unsupported: ${unsupported.map(clientLabel).join(", ")}`);
        if (partial.length) lines.push(`    partial:     ${partial.map(clientLabel).join(", ")}`);
        for (const note of finding.notes) lines.push(`    · ${note.clients.map(clientLabel).join(", ")}: ${note.text}`);
    }
    return lines.join("\n");
}
