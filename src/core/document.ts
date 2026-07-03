import { nanoid } from "nanoid";
import { materializeBlock } from "./materialize.ts";
import { containerAccepts, type BlockRegistry } from "./registry.ts";
import type { BlockId, BuilderDocument, ValidationIssue } from "./types.ts";

/*
 * Document creation, validation and migration — see docs/03-architecture.md §1.
 */

export const DOCUMENT_VERSION = 1;

/** fromVersion → migrated document; extended alongside future DOCUMENT_VERSION bumps. */
const MIGRATIONS: Record<number, (document: BuilderDocument) => BuilderDocument> = {};

/**
 * New document with a single root block of `rootType`, built from the
 * definition's `defaultProps` (+ `onCreate`, which may self-populate children).
 */
export function createDocument(
    registry: BlockRegistry,
    rootType: string,
    rootProps?: Record<string, unknown>,
): BuilderDocument {
    const rootId = nanoid();
    const document: BuilderDocument = { version: DOCUMENT_VERSION, rootId, blocks: {} };
    const { nodes } = materializeBlock(document, registry, { type: rootType, props: rootProps }, null, rootId);
    for (const node of nodes) {
        document.blocks[node.id] = node;
    }
    return document;
}

/** Runs the migration chain up to DOCUMENT_VERSION; throws on newer or unbridgeable versions. */
export function migrateDocument(document: BuilderDocument): BuilderDocument {
    if (document.version > DOCUMENT_VERSION) {
        throw new Error(
            `migrateDocument: document version ${document.version} is newer than the supported version ${DOCUMENT_VERSION}`,
        );
    }
    let migrated = document;
    while (migrated.version < DOCUMENT_VERSION) {
        const migrate = MIGRATIONS[migrated.version];
        if (!migrate) {
            throw new Error(`migrateDocument: no migration from document version ${migrated.version}`);
        }
        migrated = migrate(migrated);
    }
    return migrated;
}

/**
 * Checks the integrity invariants (docs/03 §1): every referenced id exists,
 * every non-root block appears in exactly one parent's child list, container
 * names exist on the parent's definition, `accepts`/`maxChildren` rules hold.
 * Unknown block types are a warning, not an error — old documents with
 * removed block types must keep loading.
 */
export function validateDocument(document: BuilderDocument, registry: BlockRegistry): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!document.blocks[document.rootId]) {
        issues.push({
            code: "missing-root",
            severity: "error",
            message: `Root block "${document.rootId}" does not exist`,
        });
    }

    /** How many parent child-lists reference each id */
    const parentCounts = new Map<BlockId, number>();

    for (const [key, node] of Object.entries(document.blocks)) {
        if (node.id !== key) {
            issues.push({
                code: "id-mismatch",
                severity: "error",
                blockId: node.id,
                message: `Block keyed "${key}" has id "${node.id}"`,
            });
        }

        const definition = registry.getDefinition(node.type);
        if (!definition) {
            issues.push({
                code: "unknown-type",
                severity: "warning",
                blockId: node.id,
                message: `Block "${node.id}" has unknown type "${node.type}" (tolerated — renders as a missing block)`,
            });
        }

        for (const [containerName, childIds] of Object.entries(node.children)) {
            const containerDef = definition?.containers?.find((c) => c.name === containerName);
            if (definition && !containerDef) {
                issues.push({
                    code: "unknown-container",
                    severity: "error",
                    blockId: node.id,
                    message: `Container "${containerName}" does not exist on type "${node.type}"`,
                });
            }
            if (containerDef?.maxChildren !== undefined && childIds.length > containerDef.maxChildren) {
                issues.push({
                    code: "max-children-exceeded",
                    severity: "error",
                    blockId: node.id,
                    message: `Container "${containerName}" of "${node.id}" has ${childIds.length} children (maxChildren: ${containerDef.maxChildren})`,
                });
            }

            for (const childId of childIds) {
                parentCounts.set(childId, (parentCounts.get(childId) ?? 0) + 1);
                const child = document.blocks[childId];
                if (!child) {
                    issues.push({
                        code: "dangling-child-id",
                        severity: "error",
                        blockId: node.id,
                        message: `Container "${containerName}" of "${node.id}" references missing block "${childId}"`,
                    });
                    continue;
                }
                const ctx = { document, parentId: node.id, container: containerName };
                if (containerDef && !containerAccepts(containerDef, child.type, ctx)) {
                    issues.push({
                        code: "accepts-violation",
                        severity: "error",
                        blockId: childId,
                        message: `Container "${containerName}" of "${node.id}" does not accept type "${child.type}"`,
                    });
                }
            }
        }
    }

    if (parentCounts.has(document.rootId)) {
        issues.push({
            code: "root-is-child",
            severity: "error",
            blockId: document.rootId,
            message: `Root block "${document.rootId}" appears in a child list`,
        });
    }
    for (const id of Object.keys(document.blocks)) {
        if (id === document.rootId) continue;
        const count = parentCounts.get(id) ?? 0;
        if (count === 0) {
            issues.push({
                code: "orphan-block",
                severity: "error",
                blockId: id,
                message: `Block "${id}" is not referenced by any parent`,
            });
        } else if (count > 1) {
            issues.push({
                code: "multiple-parents",
                severity: "error",
                blockId: id,
                message: `Block "${id}" appears in ${count} child lists`,
            });
        }
    }

    return issues;
}
