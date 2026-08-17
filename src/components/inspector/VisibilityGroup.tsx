import { ButtonIconSquare, Input, InputSelect, TabButtons, type SelectItem } from "@matthiaskrijgsman/mat-ui";
import { IconPlus, IconTag, IconX } from "@tabler/icons-react";
import { type ReactNode, useMemo } from "react";
import {
    defaultVisibility,
    OPERATOR_LABELS,
    VALUE_OPERATORS,
    type BlockVisibility,
    type VisibilityOperator,
    type VisibilityRule,
} from "../../core/visibility.ts";
import { useBuilderState, useMergeTags } from "../../react/hooks.ts";
import type { MergeTag } from "../../react/merge-tags.ts";
import type { BlockId } from "../../core/types.ts";
import { InspectorGroup } from "./InspectorGroup.tsx";

/*
 * VisibilityGroup — conditional block visibility (docs/06 §Conditional
 * visibility). Mounted by the Inspector for EVERY block but the root, from
 * the node's `visibility` field rather than its props, so it needs nothing
 * from the block's definition and a consumer's blocks get it for free.
 *
 * Rules read as a sentence — "show this block when <tag> <operator> <value>"
 * — one card per rule, joined by a chip that toggles the whole group between
 * AND and OR. Hidden entirely when the provider has no merge tags and the
 * block has no rules to show: with no tags there is nothing to test.
 */

/* Phrasing is shared with the canvas badge's summary (core/visibility.ts), so
 * a rule reads identically in the inspector and in its tooltip. */
const OPERATOR_OPTIONS: SelectItem<VisibilityOperator>[] = (
    ["eq", "neq", "contains", "notContains", "exists", "notExists"] as const
).map((operator) => ({ label: OPERATOR_LABELS[operator], value: operator }));

export interface VisibilityGroupProps {
    id: BlockId;
}

export function VisibilityGroup({ id }: VisibilityGroupProps) {
    const tags = useMergeTags();
    const actions = useBuilderState((s) => s.actions);
    const visibility = useBuilderState((s) => s.document.blocks[id]?.visibility);

    const rules = visibility?.rules ?? [];
    const mode = visibility?.mode ?? "always";
    const match = visibility?.match ?? "all";

    const tagOptions = useMemo(() => tagSelectItems(tags), [tags]);

    // Nothing to build a rule from, and nothing already built: stay out of the
    // way (same rule the insert menus follow when `mergeTags` is unconfigured).
    if (tags.length === 0 && rules.length === 0) return null;

    /** Commits a change, dropping the field entirely once it says nothing. */
    const commit = (next: BlockVisibility) => {
        actions.setVisibility(id, next.mode === "always" && next.rules.length === 0 ? undefined : next);
    };
    const patch = (change: Partial<BlockVisibility>) =>
        commit({ ...(visibility ?? defaultVisibility()), ...change });
    const patchRule = (index: number, change: Partial<VisibilityRule>) =>
        patch({ rules: rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)) });

    const addRule = () => {
        const token = tags[0]?.token ?? rules[0]?.token ?? "";
        patch({ mode: "rules", rules: [...rules, { token, operator: "exists" }] });
    };

    return (
        <InspectorGroup label="Visibility" meta={mode === "rules" ? ruleCount(rules.length) : null}>
            <TabButtons
                size="sm"
                fullWidth
                tabs={[
                    { label: "Always", active: mode === "always", onClick: () => patch({ mode: "always" }) },
                    {
                        // "If" rather than "When": at a 300px panel the longer
                        // wording wraps inside the half-width tab.
                        label: "If rules match",
                        active: mode === "rules",
                        // Entering rules mode with nothing to show would look
                        // broken — seed the first row.
                        onClick: () =>
                            rules.length === 0 ? addRule() : patch({ mode: "rules" }),
                    },
                ]}
            />

            {mode === "rules" && (
                <>
                    <p className="text-xs" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                        Show this block when&hellip;
                    </p>

                    {rules.map((rule, index) => (
                        <div key={index} className="flex flex-col">
                            {index > 0 && (
                                <MatchJoiner
                                    match={match}
                                    onToggle={() => patch({ match: match === "all" ? "any" : "all" })}
                                />
                            )}
                            <RuleCard
                                rule={rule}
                                tags={tags}
                                tagOptions={tagOptions}
                                onChange={(change) => patchRule(index, change)}
                                onRemove={() => patch({ rules: rules.filter((_, i) => i !== index) })}
                            />
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addRule}
                        disabled={tags.length === 0}
                        className={
                            "flex h-10 cursor-pointer flex-row items-center justify-center gap-1.5 rounded-lg " +
                            "border border-dashed bg-transparent text-sm font-medium " +
                            "font-(family-name:--font-family-base) transition-colors " +
                            "duration-(--control-transition-duration) disabled:cursor-not-allowed disabled:opacity-50"
                        }
                        style={{
                            borderColor: "var(--mat-builder-color-rule-border)",
                            color: "var(--mat-builder-color-rule-accent)",
                        }}
                    >
                        <IconPlus className="size-4 shrink-0" />
                        Add rule
                    </button>
                </>
            )}
        </InspectorGroup>
    );
}

const ruleCount = (count: number): string => `${count} ${count === 1 ? "rule" : "rules"}`;

/** The AND/OR chip between two rule cards — clicking it flips the whole group. */
function MatchJoiner({ match, onToggle }: { match: "all" | "any"; onToggle: () => void }) {
    return (
        <div className="flex flex-row items-center gap-2 py-2">
            <Hairline />
            <button
                type="button"
                onClick={onToggle}
                title={match === "all" ? "Every rule must match — switch to any" : "Any rule may match — switch to every"}
                className={
                    "cursor-pointer rounded-md border-none px-2 py-0.5 text-[11px] font-semibold uppercase " +
                    "tracking-wider font-(family-name:--font-family-base) transition-opacity " +
                    "duration-(--control-transition-duration) hover:opacity-80"
                }
                style={{
                    backgroundColor: "var(--mat-builder-color-rule-joiner-bg)",
                    color: "var(--mat-builder-color-rule-joiner-fg)",
                }}
            >
                {match === "all" ? "And" : "Or"}
            </button>
            <Hairline />
        </div>
    );
}

const Hairline = () => (
    <span className="h-px flex-1" style={{ backgroundColor: "var(--mat-builder-color-rule-border)" }} />
);

interface RuleCardProps {
    rule: VisibilityRule;
    tags: MergeTag[];
    tagOptions: SelectItem<string>[];
    onChange: (change: Partial<VisibilityRule>) => void;
    onRemove: () => void;
}

function RuleCard({ rule, tags, tagOptions, onChange, onRemove }: RuleCardProps) {
    const tag = tags.find((entry) => entry.token === rule.token);
    const takesValue = VALUE_OPERATORS.has(rule.operator);
    // A tag whose values the host declared gets a picker; anything open-ended
    // (a name, an id) stays free text.
    const declaredValues = tag?.values ?? [];

    // The rule's token may name a tag the provider no longer offers — keep it
    // selectable so the rule stays readable instead of silently re-pointing.
    const options: SelectItem<string>[] =
        rule.token && !tag
            ? [...tagOptions, { label: tagLabel(rule.token, rule.token), value: rule.token }]
            : tagOptions;

    return (
        <div
            className="flex flex-col gap-2 rounded-lg border p-2"
            style={{
                backgroundColor: "var(--mat-builder-color-rule-bg)",
                borderColor: "var(--mat-builder-color-rule-border)",
            }}
        >
            <div className="flex flex-row items-center gap-1">
                <div className="min-w-0 flex-1">
                    <InputSelect
                        size="sm"
                        options={options}
                        value={rule.token || null}
                        onChange={(token) => onChange({ token: token ?? "" })}
                        placeholder="Select a merge tag"
                    />
                </div>
                <ButtonIconSquare
                    Icon={IconX}
                    variant="transparent"
                    size="sm"
                    aria-label="Remove rule"
                    onClick={onRemove}
                />
            </div>

            {/* The operator takes the full row when it needs no value, so a
                presence check reads as one finished phrase. */}
            <div className={takesValue ? "grid grid-cols-2 gap-2" : undefined}>
                <InputSelect
                    size="sm"
                    options={OPERATOR_OPTIONS}
                    value={rule.operator}
                    onChange={(operator) => onChange({ operator: operator ?? "exists" })}
                />
                {takesValue &&
                    (declaredValues.length > 0 ? (
                        <InputSelect
                            size="sm"
                            options={declaredValues.map((value) => ({ label: value, value }))}
                            value={rule.value ?? null}
                            onChange={(value) => onChange({ value: value ?? "" })}
                            placeholder="Value"
                        />
                    ) : (
                        <Input
                            size="sm"
                            placeholder="Value"
                            value={rule.value ?? ""}
                            onChange={(event) => onChange({ value: event.target.value })}
                        />
                    ))}
            </div>
        </div>
    );
}

/** Tag glyph + name, so a rule's subject reads as a token and not free text. */
function tagLabel(label: string, token: string): ReactNode {
    return (
        <span className="flex min-w-0 flex-row items-center gap-2" title={token}>
            <IconTag className="size-4 shrink-0" style={{ color: "var(--mat-builder-color-rule-accent)" }} />
            <span className="truncate">{label}</span>
        </span>
    );
}

/**
 * The tag picker's items — same bucketing as the insert menus (MergeTagList):
 * grouped tags gather under one header, and sections and ungrouped tags keep
 * the order of their first appearance in the provider's list.
 */
function tagSelectItems(tags: MergeTag[]): SelectItem<string>[] {
    const buckets: { name: string; tags: MergeTag[] }[] = [];
    const byName = new Map<string, MergeTag[]>();
    for (const tag of tags) {
        const name = tag.group ?? "";
        let bucket = byName.get(name);
        if (!bucket) {
            bucket = [];
            byName.set(name, bucket);
            buckets.push({ name, tags: bucket });
        }
        bucket.push(tag);
    }

    const items: SelectItem<string>[] = [];
    for (const bucket of buckets) {
        if (bucket.name) items.push({ kind: "header", label: bucket.name });
        for (const tag of bucket.tags) {
            items.push({ label: tagLabel(tag.label, tag.token), value: tag.token });
        }
    }
    return items;
}
