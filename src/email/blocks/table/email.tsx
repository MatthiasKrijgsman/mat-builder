import type { EmailRenderer } from "../../types.ts";
import { ensureRichText, RichText } from "../../rich-text/index.ts";
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
                                {/* Rich cell content through the shared serializer
                                    (plain legacy cells are wrapped on the fly); an
                                    empty cell keeps one line of height via the
                                    serializer's empty-paragraph nbsp. */}
                                <RichText content={ensureRichText(cell)} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
