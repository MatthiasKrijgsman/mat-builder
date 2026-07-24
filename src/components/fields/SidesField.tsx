import { ButtonIconSquare, Tooltip } from "@matthiaskrijgsman/mat-ui";
import {
    IconBorderBottom,
    IconBorderLeft,
    IconBorderOuter,
    IconBorderRight,
    IconBorderTop,
    IconBorderRadius,
    IconRadiusBottomLeft,
    IconRadiusBottomRight,
    IconRadiusTopLeft,
    IconRadiusTopRight,
    type TablerIcon,
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import {
    IconSideBottom,
    IconSideLeft,
    IconSideRight,
    IconSideTop,
    IconSidesIndividual,
    IconSidesX,
    IconSidesY,
} from "./spacing-icons.tsx";
import { uniformCorners, type CornerValues } from "../../style-props/border.ts";
import { uniformSides, type SideValues } from "../../style-props/spacing.ts";
import { NumberField } from "./NumberField.tsx";

/*
 * Figma-style linked side inputs (docs/04 §Inspector):
 *
 * - SidesField        padding/margin — two linked inputs (left+right, top+bottom)
 *                     that expand to four per-side inputs
 * - UniformSidesField border width — one input for all sides that expands to
 *                     four per-side inputs
 * - CornersField      border radius — one input for all corners that expands
 *                     to four per-corner inputs
 *
 * A linked input shows the shared value, or a "Mix" placeholder when the
 * sides it controls differ; typing writes all of them. The expand toggle
 * starts open when the stored value is already asymmetric.
 */

interface LinkedFieldsProps {
    /** Group label above the inputs (e.g. "Padding") — omit to render bare. */
    label?: string;
    expanded: boolean;
    onToggle: () => void;
    toggleTitle: string;
    children: ReactNode;
}

function LinkedFields({ label, expanded, onToggle, toggleTitle, children }: LinkedFieldsProps) {
    return (
        <div className="flex flex-col gap-1.5">
            {label && <span className="input-label">{label}</span>}
            <div className="flex items-start gap-1.5">
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">{children}</div>
                <Tooltip
                    content={toggleTitle}
                    className="inline-flex shrink-0"
                    contentClassName="mat-builder-tooltip"
                    minWidth={0}
                    delay={300}
                >
                    <ButtonIconSquare
                        Icon={IconSidesIndividual}
                        size="sm"
                        variant={expanded ? "primary" : "transparent"}
                        aria-label={toggleTitle}
                        aria-pressed={expanded}
                        onClick={onToggle}
                    />
                </Tooltip>
            </div>
        </div>
    );
}

interface SideInputProps {
    Icon: TablerIcon;
    title: string;
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

/** One linked input: icon, no visible label, "Mix" when values differ. */
const SideInput = ({ Icon, title, value, onChange, min, max }: SideInputProps) => (
    <NumberField Icon={Icon} title={title} placeholder="Mix" value={value} onChange={onChange} min={min} max={max} />
);

const pair = (a: number, b: number): number | undefined => (a === b ? a : undefined);
const all = (s: SideValues): number | undefined =>
    s.top === s.right && s.right === s.bottom && s.bottom === s.left ? s.top : undefined;
const allCorners = (c: CornerValues): number | undefined =>
    c.topLeft === c.topRight && c.topRight === c.bottomRight && c.bottomRight === c.bottomLeft
        ? c.topLeft
        : undefined;

export interface SidesFieldProps {
    label?: string;
    value: SideValues;
    onChange: (value: SideValues) => void;
    min?: number;
    max?: number;
}

/** Padding/margin: linked left+right and top+bottom inputs ⇄ four sides. */
export function SidesField({ label, value, onChange, min, max }: SidesFieldProps) {
    const [expanded, setExpanded] = useState(
        () => value.left !== value.right || value.top !== value.bottom,
    );
    const set = (patch: Partial<SideValues>) => onChange({ ...value, ...patch });
    const name = label ?? "Sides";
    return (
        <LinkedFields
            label={label}
            expanded={expanded}
            onToggle={() => setExpanded((current) => !current)}
            toggleTitle={`${name}: set each side`}
        >
            {expanded ? (
                <>
                    <SideInput Icon={IconSideLeft} title={`${name} left`} value={value.left} onChange={(left) => set({ left })} min={min} max={max} />
                    <SideInput Icon={IconSideTop} title={`${name} top`} value={value.top} onChange={(top) => set({ top })} min={min} max={max} />
                    <SideInput Icon={IconSideRight} title={`${name} right`} value={value.right} onChange={(right) => set({ right })} min={min} max={max} />
                    <SideInput Icon={IconSideBottom} title={`${name} bottom`} value={value.bottom} onChange={(bottom) => set({ bottom })} min={min} max={max} />
                </>
            ) : (
                <>
                    <SideInput Icon={IconSidesX} title={`${name} left & right`} value={pair(value.left, value.right)} onChange={(n) => set({ left: n, right: n })} min={min} max={max} />
                    <SideInput Icon={IconSidesY} title={`${name} top & bottom`} value={pair(value.top, value.bottom)} onChange={(n) => set({ top: n, bottom: n })} min={min} max={max} />
                </>
            )}
        </LinkedFields>
    );
}

export interface UniformSidesFieldProps {
    label?: string;
    value: SideValues;
    onChange: (value: SideValues) => void;
    min?: number;
    max?: number;
}

/** Border width: one input for all sides ⇄ four per-side inputs. */
export function UniformSidesField({ label, value, onChange, min, max }: UniformSidesFieldProps) {
    const [expanded, setExpanded] = useState(() => all(value) === undefined);
    const set = (patch: Partial<SideValues>) => onChange({ ...value, ...patch });
    const name = label ?? "Sides";
    return (
        <LinkedFields
            label={label}
            expanded={expanded}
            onToggle={() => setExpanded((current) => !current)}
            toggleTitle={`${name}: set each side`}
        >
            {expanded ? (
                <>
                    <SideInput Icon={IconBorderLeft} title={`${name} left`} value={value.left} onChange={(left) => set({ left })} min={min} max={max} />
                    <SideInput Icon={IconBorderTop} title={`${name} top`} value={value.top} onChange={(top) => set({ top })} min={min} max={max} />
                    <SideInput Icon={IconBorderRight} title={`${name} right`} value={value.right} onChange={(right) => set({ right })} min={min} max={max} />
                    <SideInput Icon={IconBorderBottom} title={`${name} bottom`} value={value.bottom} onChange={(bottom) => set({ bottom })} min={min} max={max} />
                </>
            ) : (
                <SideInput Icon={IconBorderOuter} title={`${name} all sides`} value={all(value)} onChange={(n) => onChange(uniformSides(n))} min={min} max={max} />
            )}
        </LinkedFields>
    );
}

export interface CornersFieldProps {
    label?: string;
    value: number | CornerValues;
    onChange: (value: number | CornerValues) => void;
    min?: number;
    max?: number;
}

/** Border radius: one input for all corners ⇄ four per-corner inputs.
 * Emits a plain number while uniform (keeps documents small and legacy-shaped). */
export function CornersField({ label, value, onChange, min, max }: CornersFieldProps) {
    const corners = typeof value === "number" ? uniformCorners(value) : value;
    const [expanded, setExpanded] = useState(() => allCorners(corners) === undefined);
    const set = (patch: Partial<CornerValues>) => onChange({ ...corners, ...patch });
    const name = label ?? "Radius";
    return (
        <LinkedFields
            label={label}
            expanded={expanded}
            onToggle={() => setExpanded((current) => !current)}
            toggleTitle={`${name}: set each corner`}
        >
            {expanded ? (
                <>
                    <SideInput Icon={IconRadiusTopLeft} title={`${name} top left`} value={corners.topLeft} onChange={(topLeft) => set({ topLeft })} min={min} max={max} />
                    <SideInput Icon={IconRadiusTopRight} title={`${name} top right`} value={corners.topRight} onChange={(topRight) => set({ topRight })} min={min} max={max} />
                    <SideInput Icon={IconRadiusBottomLeft} title={`${name} bottom left`} value={corners.bottomLeft} onChange={(bottomLeft) => set({ bottomLeft })} min={min} max={max} />
                    <SideInput Icon={IconRadiusBottomRight} title={`${name} bottom right`} value={corners.bottomRight} onChange={(bottomRight) => set({ bottomRight })} min={min} max={max} />
                </>
            ) : (
                <SideInput Icon={IconBorderRadius} title={`${name} all corners`} value={allCorners(corners)} onChange={(n) => onChange(n)} min={min} max={max} />
            )}
        </LinkedFields>
    );
}
