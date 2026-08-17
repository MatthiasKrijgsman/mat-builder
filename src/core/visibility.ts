import type { BlockNode } from "./types.ts";

/*
 * Conditional block visibility — see docs/06 §Conditional visibility.
 *
 * A block may carry rules that test merge-tag values; when the values are
 * known the renderer omits blocks whose rules don't hold. Pure and
 * server-safe like the rest of core: rules reference tags by their LITERAL
 * token string (the same string the tag emits), so nothing here knows about
 * delimiter syntax, the provider's tag list, or the editor.
 */

/** Merge-tag values keyed by the tag's literal token, e.g. `{ "{{plan}}": "Pro" }`. */
export type MergeTagValues = Record<string, string>;

export type VisibilityOperator =
    /** The tag has a non-empty value */
    | "exists"
    /** The tag is missing or empty */
    | "notExists"
    | "eq"
    | "neq"
    | "contains"
    | "notContains";

/**
 * Operator phrasing, shared by the inspector's dropdown and the canvas
 * badge's summary so a rule reads the same wherever it is shown. Each label
 * completes the sentence "<tag> …", with the compared value appended for the
 * value operators.
 */
export const OPERATOR_LABELS: Record<VisibilityOperator, string> = {
    exists: "is provided",
    notExists: "is empty",
    eq: "is",
    neq: "is not",
    contains: "contains",
    notContains: "does not contain",
};

/** Operators that compare against `rule.value`; the rest test presence only. */
export const VALUE_OPERATORS: ReadonlySet<VisibilityOperator> = new Set<VisibilityOperator>([
    "eq",
    "neq",
    "contains",
    "notContains",
]);

export interface VisibilityRule {
    /** The literal merge-tag token this rule tests — `{{plan}}`, `*|PLAN|*`, … */
    token: string;
    operator: VisibilityOperator;
    /** Compared value; ignored by the presence-only operators */
    value?: string;
}

export interface BlockVisibility {
    /**
     * `"always"` keeps the block unconditional while PRESERVING `rules`, so
     * flipping the inspector's toggle back and forth doesn't discard work.
     * A block with no `visibility` at all is `"always"` — the default never
     * has to be written into a document.
     */
    mode: "always" | "rules";
    /** How the rules combine: every rule (AND) or any rule (OR) */
    match: "all" | "any";
    rules: VisibilityRule[];
}

export const defaultVisibility = (): BlockVisibility => ({ mode: "rules", match: "all", rules: [] });

/** Whether this block carries rules that can actually hide it. */
export function hasVisibilityRules(visibility: BlockVisibility | undefined): boolean {
    return visibility?.mode === "rules" && visibility.rules.length > 0;
}

/*
 * Comparisons are trimmed and case-insensitive. Merge-tag values come from
 * whatever system owns the contact record, so "Pro" / "pro" is a difference
 * the person writing the rule did not intend to make.
 */
const norm = (value: string | undefined): string => (value ?? "").trim().toLowerCase();

export function evaluateRule(rule: VisibilityRule, values: MergeTagValues): boolean {
    const actual = norm(values[rule.token]);
    const expected = norm(rule.value);
    switch (rule.operator) {
        case "exists":
            return actual !== "";
        case "notExists":
            return actual === "";
        case "eq":
            return actual === expected;
        case "neq":
            return actual !== expected;
        case "contains":
            return actual.includes(expected);
        case "notContains":
            return !actual.includes(expected);
        default:
            // Unknown operator from a newer document: never hide on it.
            return true;
    }
}

/**
 * Whether a block's rules hold for `values`.
 *
 * `values === undefined` means "no data to decide with" and everything is
 * visible — so `renderEmail(document)` with no values exports the whole
 * template, tokens and all, and only a caller that supplies values opts into
 * having blocks removed. An empty object is different: it is a full set of
 * values that happens to be empty, and rules evaluate against it.
 */
export function isVisible(visibility: BlockVisibility | undefined, values: MergeTagValues | undefined): boolean {
    if (!values || !hasVisibilityRules(visibility)) return true;
    const rules = visibility!.rules;
    return visibility!.match === "any"
        ? rules.some((rule) => evaluateRule(rule, values))
        : rules.every((rule) => evaluateRule(rule, values));
}

/** `isVisible` for a document node (missing node = not visible). */
export function isBlockVisible(node: BlockNode | undefined, values: MergeTagValues | undefined): boolean {
    return node ? isVisible(node.visibility, values) : false;
}

/**
 * One-line, human-readable summary of a block's rules — the canvas badge's
 * tooltip. `labelOf` resolves a token to its display name, so core stays
 * unaware of the provider's tag list (pass `(token) => token` for the raw
 * form). Returns "" when nothing can hide the block.
 */
export function describeVisibility(
    visibility: BlockVisibility | undefined,
    labelOf: (token: string) => string,
): string {
    if (!hasVisibilityRules(visibility)) return "";
    const parts = visibility!.rules.map((rule) => {
        const phrase = `${labelOf(rule.token)} ${OPERATOR_LABELS[rule.operator] ?? rule.operator}`;
        return VALUE_OPERATORS.has(rule.operator) ? `${phrase} “${rule.value ?? ""}”` : phrase;
    });
    return `Shown when ${parts.join(visibility!.match === "any" ? " or " : " and ")}`;
}
