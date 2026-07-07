import { useRef } from "react";
import { IconBraces } from "@tabler/icons-react";
import { DropdownButton, DropdownMenu, Input, InputIconButton, InputIconButtonTray } from "@matthiaskrijgsman/mat-ui";
import { useMergeTags } from "../../react/hooks.ts";
import { TextField, type TextFieldProps } from "./TextField.tsx";

/*
 * TextField with a merge-tag menu in the input's button tray (docs/06 §merge
 * tags) — for URL-ish props like a button's href, where tokens are spliced in
 * as plain text (e.g. `https://…?ref={{user_id}}`). Falls back to a plain
 * TextField when the provider has no tags, so blocks can use it
 * unconditionally. Requires builder context (unlike TextField).
 */

export type MergeTagTextFieldProps = TextFieldProps;

export function MergeTagTextField({ value, onChange, ...rest }: MergeTagTextFieldProps) {
    const tags = useMergeTags();
    // mat-ui's Input doesn't forward a ref, so the raw <input> is reached
    // through a wrapper — needed to splice at the caret instead of appending.
    const wrapRef = useRef<HTMLDivElement>(null);

    if (tags.length === 0) return <TextField value={value} onChange={onChange} {...rest} />;

    const insert = (token: string) => {
        const input = wrapRef.current?.querySelector("input");
        const text = value ?? "";
        // Blurred inputs retain selectionStart/End; a never-focused field appends.
        const start = input?.selectionStart ?? text.length;
        const end = input?.selectionEnd ?? text.length;
        onChange(text.slice(0, start) + token + text.slice(end));
        if (input) {
            // After the controlled value lands: caret right after the token.
            requestAnimationFrame(() => {
                input.focus();
                const caret = start + token.length;
                input.setSelectionRange(caret, caret);
            });
        }
    };

    return (
        <div ref={wrapRef}>
            <Input
                size="sm"
                variant="flat"
                {...rest}
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value)}
                buttonTray={
                    <InputIconButtonTray>
                        {/* The no-op onClick opts the icon into pointer-events + hover
                            styling (mat-ui keys interactivity off its presence); the
                            actual toggle lives on DropdownMenu's trigger wrapper. */}
                        <DropdownMenu placement="bottom-end" trigger={<InputIconButton Icon={IconBraces} onClick={() => {}} />}>
                            {tags.map((tag) => (
                                <DropdownButton key={tag.token} onClick={() => insert(tag.token)}>
                                    {tag.label}
                                </DropdownButton>
                            ))}
                        </DropdownMenu>
                    </InputIconButtonTray>
                }
            />
        </div>
    );
}
