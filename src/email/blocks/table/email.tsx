import type { EmailRenderer } from "../../types.ts";
import { emailTableCellStyles, emailTableStyles, type EmailTableProps } from "./styles.ts";

/** Raw <table> markup — the one layout primitive every client renders natively. */
export const tableEmail: EmailRenderer<EmailTableProps> = (props) => (
    <table style={emailTableStyles(props)}>
        <tbody>
            {props.cells.map((row, r) => (
                <tr key={r}>
                    {row.map((cell, c) => (
                        <td key={c} style={emailTableCellStyles(props, props.headerRow && r === 0)}>
                            {cell}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);
