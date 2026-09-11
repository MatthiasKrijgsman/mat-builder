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
        <div className={`mat-builder-merge-tag-values mat:flex mat:flex-col mat:gap-1 mat:px-1 ${className ?? ""}`}>
            <header className="mat:flex mat:shrink-0 mat:flex-col">
                <div className="mat:flex mat:flex-row mat:items-center mat:gap-2.5 mat:py-1.5 mat:pr-1 mat:pl-3">
                    <IconBraces
                        className="mat:size-5 mat:shrink-0 mat:stroke-2"
                        style={{ color: "var(--mat-builder-color-rule-accent)" }}
                    />
                    <div className="mat:line-clamp-1 mat:flex-1 mat:py-2 mat:font-semibold">Preview data</div>
                    {filled > 0 && (
                        <Button size="sm" variant="transparent" onClick={() => actions.setPreviewValues({})}>
                            Clear
                        </Button>
                    )}
                </div>
                <Divider />
            </header>

            {usage.length === 0 ? (
                <div className="mat:grid mat:flex-1 mat:place-items-center mat:p-2">
                    <TableEmpty
                        Icon={IconTag}
                        title="No merge tags in use"
                        description="Insert a merge tag, or add a visibility rule, and it shows up here to preview with."
                    />
                </div>
            ) : (
                <div className="mat:flex mat:min-h-0 mat:flex-1 mat:flex-col mat:gap-3 mat:overflow-y-auto mat:p-3">
                    <p className="mat:text-xs" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
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
        <div className="mat:flex mat:flex-col mat:gap-1.5">
            <div className="mat:flex mat:flex-row mat:items-center mat:gap-1.5">
                <span className="mat:min-w-0 mat:truncate mat:text-xs mat:font-medium" style={{ color: "var(--mat-builder-color-input-label)" }}>
                    {tag.label}
                </span>
                {/* A tag only a rule mentions never appears in the copy, so say
                    so — otherwise an empty preview looks like a broken tag. */}
                {usage.inRules && !usage.inContent && (
                    <IconEyeOff
                        className="mat:size-3.5 mat:shrink-0"
                        style={{ color: "var(--mat-builder-color-conditional-fg)" }}
                        aria-label="Used by visibility rules only"
                    />
                )}
                <code className="mat:ml-auto mat:shrink-0 mat:truncate mat:text-[11px]" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
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
