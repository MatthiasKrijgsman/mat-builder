import { DropdownButton, DropdownMenu, InputIconButton } from "@matthiaskrijgsman/mat-ui";
import {
    IconArrowAutofitContent,
    IconArrowBarBoth,
    IconArrowsHorizontal,
    IconArrowsVertical,
    IconCheck,
    IconChevronDown,
    IconLetterH,
    IconLetterW,
    IconPercentage,
    type TablerIcon,
} from "@tabler/icons-react";
import type { BlockId } from "../../core/types.ts";
import { useBuilderState, useRenderedBlockSize } from "../../react/hooks.ts";
import { DEFAULT_WIDTH_PCT, type SizeMode, type SizeValue } from "../../style-props/size.ts";
import { NumberField } from "./NumberField.tsx";

/*
 * DimensionField — Figma's width/height control: ONE always-filled number box
 * with the sizing mode behind a menu on its right edge (docs/04 §Inspector).
 *
 * The number is the block's actual extent whatever the mode is. In the authored
 * modes the document owns it (fixed → px, percent → %); in the auto modes
 * (fill/hug) nothing is stored, so the box reads the rendered size back off the
 * canvas and renders it muted — measured, not authored. Typing over it pins the
 * axis, and picking "Fixed" freezes the measurement, so the menu's
 * "Fixed width (552)" is literally what you get.
 */

export type DimensionAxis = "width" | "height";

const MODE_ICONS: Record<SizeMode, TablerIcon | { width: TablerIcon; height: TablerIcon }> = {
    fixed: IconArrowBarBoth,
    full: { width: IconArrowsHorizontal, height: IconArrowsVertical },
    percent: IconPercentage,
    hug: IconArrowAutofitContent,
};

const modeIcon = (mode: SizeMode, axis: DimensionAxis): TablerIcon => {
    const icon = MODE_ICONS[mode];
    return "width" in icon ? icon[axis] : icon;
};

/** Menu wording — the parenthesised number is what picking the mode commits. */
const modeLabel = (mode: SizeMode, axis: DimensionAxis, effective: number | null, pct: number): string => {
    const extent = effective == null ? "" : ` (${effective})`;
    switch (mode) {
        case "fixed":
            return `Fixed ${axis}${extent}`;
        case "full":
            return "Fill container";
        case "percent":
            return `Percent (${pct}%)`;
        case "hug":
            return "Hug contents";
    }
};

export interface DimensionFieldProps {
    axis: DimensionAxis;
    /** Visible label above the box. Omit inside a SizeGroup — the W/H glyph and
     * the group header name the field there; a standalone one needs words. */
    label?: string;
    /** The whole size value — the field owns the mode/number relationship */
    value: SizeValue;
    /** Receives the complete next value (shallow-merge safe, like style groups) */
    onChange: (value: SizeValue) => void;
    /** Modes the menu offers, in order — required, since it differs per axis */
    modes: SizeMode[];
    /** Block to measure — defaults to the selection, i.e. what the inspector edits */
    blockId?: BlockId;
}

export function DimensionField({ axis, label, value, onChange, modes, blockId }: DimensionFieldProps) {
    const selectedId = useBuilderState((s) => s.selectedId);
    const rendered = useRenderedBlockSize(blockId ?? selectedId);

    const mode = value[axis];
    const px = axis === "width" ? value.widthPx : value.heightPx;
    const pct = value.widthPct ?? DEFAULT_WIDTH_PCT;
    const measured = rendered ? rendered[axis] : null;
    const isPercent = mode === "percent";
    // Only fixed/percent carry a number in the document; the rest read back
    const authored = mode === "fixed" || isPercent;
    // What the axis currently measures, for the menu labels and for freezing
    const effective = authored && mode === "fixed" ? px : measured;

    const set = (patch: Partial<SizeValue>) => onChange({ ...value, ...patch });

    const setNumber = (next: number) => {
        if (isPercent) return set({ widthPct: next });
        // Typing a number pins the axis — the auto modes have nowhere to put it
        if (axis === "width") set({ width: "fixed", widthPx: next });
        else set({ height: "fixed", heightPx: next });
    };

    const pickMode = (next: SizeMode) => {
        // Freeze what the box shows, so "Fixed width (552)" commits exactly 552
        const frozen = next === "fixed" ? (effective ?? px) : px;
        if (axis === "width") set({ width: next, widthPx: frozen });
        else set({ height: next, heightPx: frozen });
    };

    const AxisIcon = axis === "width" ? IconLetterW : IconLetterH;
    const axisName = axis === "width" ? "Width" : "Height";

    return (
        <div className="mat-builder-dimension" data-authored={authored}>
            <NumberField
                Icon={AxisIcon}
                label={label}
                title={`${axisName} — ${modeLabel(mode, axis, effective, pct)}`}
                value={isPercent ? pct : authored ? px : (measured ?? undefined)}
                // No canvas to measure (or the block isn't rendered): say so
                // rather than showing a number the document doesn't have
                placeholder="Auto"
                min={isPercent ? 1 : 0}
                max={isPercent ? 100 : undefined}
                onChange={setNumber}
                buttonTray={
                    <>
                        {isPercent && (
                            <span className="mat-builder-dimension-unit" aria-hidden={true}>
                                %
                            </span>
                        )}
                        {/* The no-op onClick opts the icon into pointer-events + hover
                            styling (mat-ui keys interactivity off its presence); the
                            actual toggle lives on DropdownMenu's trigger wrapper. */}
                        <DropdownMenu
                            placement="bottom-end"
                            minWidth={220}
                            trigger={<InputIconButton Icon={IconChevronDown} onClick={() => {}} />}
                        >
                            {modes.map((option) => (
                                <DropdownButton
                                    key={option}
                                    // mat-ui's own select convention: a leading check on the
                                    // active row, the rest indented past it
                                    Icon={option === mode ? IconCheck : undefined}
                                    className={option === mode ? undefined : "mat:pl-11"}
                                    onClick={() => pickMode(option)}
                                >
                                    <ModeRow Icon={modeIcon(option, axis)}>
                                        {modeLabel(option, axis, effective, pct)}
                                    </ModeRow>
                                </DropdownButton>
                            ))}
                        </DropdownMenu>
                    </>
                }
            />
        </div>
    );
}

function ModeRow({ Icon, children }: { Icon: TablerIcon; children: string }) {
    return (
        <span className="mat:flex mat:flex-row mat:items-center mat:gap-2.5">
            <Icon className="mat:h-4 mat:w-4 mat:shrink-0 mat:opacity-60" />
            {children}
        </span>
    );
}
