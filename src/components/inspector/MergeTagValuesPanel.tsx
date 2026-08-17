import { Button, Divider, Input, InputSelect, TableEmpty } from "@matthiaskrijgsman/mat-ui";
import { IconBraces, IconEyeOff, IconTag } from "@tabler/icons-react";
import { useBuilderState, useMergeTagUsage, useMergeTagValues } from "../../react/hooks.ts";
import type { MergeTagUsage } from "../../react/merge-tags.ts";

/*
 * MergeTagValuesPanel — the preview's data sheet (docs/06 §Preview data).
 *
 * Preview mode shows the real exported email, where merge tags are still
 * literal tokens and conditional blocks have nothing to resolve against.
 * This panel lists every tag the open template actually uses and lets the
 * viewer fill in stand-in values, which the preview then renders with: copy
 * reads as it will for a recipient, and visibility rules actually fire.
 *
 * The values are per-session editor state — they never enter the document,
 * history, or a save payload.
 */

export interface MergeTagValuesPanelProps {
    className?: string;
}

export function MergeTagValuesPanel({ className }: MergeTagValuesPanelProps) {
    const usage = useMergeTagUsage();
    const values = useMergeTagValues();
    const actions = useBuilderState((s) => s.actions);
    const filled = usage.filter((entry) => (values[entry.tag.token] ?? "") !== "").length;

    return (
        <div className={`mat-builder-merge-tag-values flex flex-col gap-1 px-1 ${className ?? ""}`}>
            <header className="flex shrink-0 flex-col">
                <div className="flex flex-row items-center gap-2.5 py-1.5 pr-1 pl-3">
                    <IconBraces
                        className="size-5 shrink-0 stroke-2"
                        style={{ color: "var(--mat-builder-color-rule-accent)" }}
                    />
                    <div className="line-clamp-1 flex-1 py-2 font-semibold">Preview data</div>
                    {filled > 0 && (
                        <Button size="sm" variant="transparent" onClick={() => actions.setPreviewValues({})}>
                            Clear
                        </Button>
                    )}
                </div>
                <Divider />
            </header>

            {usage.length === 0 ? (
                <div className="grid flex-1 place-items-center p-2">
                    <TableEmpty
                        Icon={IconTag}
                        title="No merge tags in use"
                        description="Insert a merge tag, or add a visibility rule, and it shows up here to preview with."
                    />
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
                    <p className="text-xs" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                        Stand-in values for this preview only. Tags left empty stay visible as their token.
                    </p>
                    {usage.map((entry) => (
                        <ValueField
                            key={entry.tag.token}
                            usage={entry}
                            value={values[entry.tag.token] ?? ""}
                            onChange={(next) => actions.setPreviewValue(entry.tag.token, next)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface ValueFieldProps {
    usage: MergeTagUsage;
    value: string;
    onChange: (value: string) => void;
}

function ValueField({ usage, value, onChange }: ValueFieldProps) {
    const { tag } = usage;
    const declaredValues = tag.values ?? [];
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex flex-row items-center gap-1.5">
                <span className="min-w-0 truncate text-xs font-medium" style={{ color: "var(--mat-builder-color-input-label)" }}>
                    {tag.label}
                </span>
                {/* A tag only a rule mentions never appears in the copy, so say
                    so — otherwise an empty preview looks like a broken tag. */}
                {usage.inRules && !usage.inContent && (
                    <IconEyeOff
                        className="size-3.5 shrink-0"
                        style={{ color: "var(--mat-builder-color-conditional-fg)" }}
                        aria-label="Used by visibility rules only"
                    />
                )}
                <code className="ml-auto shrink-0 truncate text-[11px]" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                    {tag.token}
                </code>
            </div>
            {declaredValues.length > 0 ? (
                <InputSelect
                    size="sm"
                    clearable
                    options={declaredValues.map((option) => ({ label: option, value: option }))}
                    value={value || null}
                    onChange={(next) => onChange(next ?? "")}
                    placeholder="No value"
                />
            ) : (
                <Input
                    size="sm"
                    variant="flat"
                    placeholder="No value"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </div>
    );
}
