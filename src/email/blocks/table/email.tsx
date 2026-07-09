import type { EmailRenderer } from "../../types.ts";
import { emailTableCellStyles, emailTableStyles, type EmailTableProps } from "./styles.ts";

/** Raw <table> markup — the one layout primitive every client renders natively. */
export const tableEmail: EmailRenderer<EmailTableProps> = (props) => {
    const rowCount = props.cells.length;
    return (
        <table style={emailTableStyles(props)}>
            <tbody>
                {props.cells.map((row, r) => (
                    <tr key={r}>
                        {row.map((cell, c) => (
                            <td key={c} style={emailTableCellStyles(props, r, c, rowCount, row.length)}>
                                {/* An empty cell keeps one line of height (matches the editor). */}
                                {cell || " "}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
