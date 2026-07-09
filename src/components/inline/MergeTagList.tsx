import { IconSearch } from "@tabler/icons-react";
import { DropdownButton, DropdownButtonGroup, Input } from "@matthiaskrijgsman/mat-ui";
import { useState } from "react";
import type { MergeTag } from "../../react/merge-tags.ts";

/*
 * Searchable, grouped merge-tag menu body (docs/06 §merge tags) — shared by
 * every insert menu (inline toolbars, MergeTagTextField). Renders inside a
 * mat-ui DropdownMenu panel, so the query state resets each time the menu
 * opens. Tags with a `group` render under a labeled section; sections and
 * ungrouped tags keep the order of their first appearance in the tag list.
 */

export interface MergeTagListProps {
    tags: MergeTag[];
    onInsert: (tag: MergeTag) => void;
}

export function MergeTagList({ tags, onInsert }: MergeTagListProps) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const filtered = q
        ? tags.filter((tag) => tag.label.toLowerCase().includes(q) || tag.token.toLowerCase().includes(q))
        : tags;

    const buckets: { name: string; tags: MergeTag[] }[] = [];
    const byName = new Map<string, MergeTag[]>();
    for (const tag of filtered) {
        const name = tag.group ?? "";
        let bucket = byName.get(name);
        if (!bucket) {
            bucket = [];
            byName.set(name, bucket);
            buckets.push({ name, tags: bucket });
        }
        bucket.push(tag);
    }

    const buttons = (bucketTags: MergeTag[]) =>
        bucketTags.map((tag) => (
            <DropdownButton key={tag.token} onClick={() => onInsert(tag)}>
                {tag.label}
            </DropdownButton>
        ));

    return (
        <>
            <div className="p-1">
                <Input
                    size="sm"
                    variant="flat"
                    Icon={IconSearch}
                    type="search"
                    placeholder="Search tags…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </div>
            {buckets.map((bucket) =>
                bucket.name ? (
                    <DropdownButtonGroup key={bucket.name} label={bucket.name}>
                        {buttons(bucket.tags)}
                    </DropdownButtonGroup>
                ) : (
                    buttons(bucket.tags)
                ),
            )}
            {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm" style={{ color: "var(--mat-builder-color-panel-muted-fg)" }}>
                    No tags match &ldquo;{query}&rdquo;.
                </p>
            )}
        </>
    );
}
