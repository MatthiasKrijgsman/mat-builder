import type { EmailRenderer } from "../../types.ts";
import {
    tableStyles,
    resolveCellContext,
    rowFill,
    tableCellStyles,
    tableRowStyles,
    type EmailTableProps,
    type EmailTableCellProps,
    type EmailTableRowProps,
} from "./styles.ts";

/*
 * Table output (docs/06 §Table).
 *
 * Raw table markup, the one layout primitive every client renders natively.
 * Fills also emit the `bgcolor` ATTRIBUTE next to the inline style: Outlook
 * (Word engine) drops background-color on <tr>/<td> often enough that bgcolor
 * remains the reliable form.
 *
 * The cell renderer resolves borders/stripes/radii by walking UP to its row and
 * table through the BlockContext `buildEmailTree` threads down — state the
 * table block held in one props object before it was decomposed. Same walk as
 * the canvas.
 */

/** `bgcolor` is a presentational HTML attribute React does not type — it still
 * renders, and Outlook needs it (see the note above). */
const bgcolor = (fill: string): Record<string, string> => (fill ? { bgcolor: fill } : {});

export const tableEmail: EmailRenderer<EmailTableProps> = (props, children) => (
    <table style={tableStyles(props)} cellPadding={0} cellSpacing={0}>
        <tbody>{children.rows}</tbody>
    </table>
);

export const tableRowEmail: EmailRenderer<EmailTableRowProps> = (props, children) => (
    <tr style={tableRowStyles(props)} {...bgcolor(rowFill(props))}>
        {children.cells}
    </tr>
);

export const tableCellEmail: EmailRenderer<EmailTableCellProps> = (props, children, ctx) => (
    <td
        style={tableCellStyles(props, resolveCellContext(ctx))}
        {...bgcolor(props.background)}
        colSpan={props.colSpan > 1 ? props.colSpan : undefined}
        rowSpan={props.rowSpan > 1 ? props.rowSpan : undefined}
    >
        {children.content}
    </td>
);
