import { nanoid } from "nanoid";
import { materializeBlock } from "./materialize.ts";
import { containerAccepts, type BlockRegistry } from "./registry.ts";
import type { BlockId, BlockNode, BuilderDocument, LoadedDocument, ValidationIssue } from "./types.ts";
import type { BlockVisibility } from "./visibility.ts";

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
 *
 * Without a `registry` — a server, which has no block definitions — only the
 * structural invariants are checked: the definition-dependent ones (unknown
 * types, container names, `accepts`, `maxChildren`) need definitions and are
 * skipped rather than reported as unknown for every block.
 */
export function validateDocument(document: BuilderDocument, registry?: BlockRegistry): ValidationIssue[] {
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

        const definition = registry?.getDefinition(node.type);
        if (registry && !definition) {
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

/* ─────────────────────────────────────────────────────────────
 * Loading — what a document from a database goes through before the editor
 * touches it. A host's stored JSON is not a trusted shape: a row written by
 * an older release, hand-edited, or half-migrated must open, not white-screen
 * the app. `repairDocument` keeps everything reachable and well-formed and
 * reports what it dropped; only a document with no usable root is refused.
 * ───────────────────────────────────────────────────────────── */

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/** Throws unless `input` has the outer shape of a document (blocks map + root id). */
function assertDocumentShape(input: unknown): asserts input is BuilderDocument {
    if (!isRecord(input) || !isRecord(input.blocks) || typeof input.rootId !== "string") {
        throw new Error("Not a builder document: expected { version, rootId, blocks }");
    }
}

/**
 * Rebuilds the document from what is reachable from the root, dropping what
 * cannot be kept and normalizing what can:
 *
 * - dangling child ids, orphans, second parents, a root inside a child list,
 *   children a container does not accept or has no room for → dropped
 * - containers a known block type does not have → dropped with their children
 * - containers it does have but the node lacks → added empty
 * - a node whose key and `id` disagree → keyed id kept
 * - missing/malformed `props`/`children` → normalized; known types get
 *   `defaultProps` backfilled, so a prop added in a later release is present
 *   on every stored document (same merge as a newly created block)
 * - unknown block types → kept as they are (they render as missing blocks)
 *
 * Every change is reported as a `ValidationIssue`. The result validates
 * clean unless the root itself is missing or malformed, which is the one
 * thing nothing can be rebuilt from — `validateDocument` reports that as
 * `missing-root` and `loadDocument` throws.
 *
 * Without a `registry` (a server), the structural repairs still run; the
 * definition-dependent ones — unknown-type warnings, container and `accepts`
 * checks, `defaultProps` backfill — are skipped, and every container a node
 * carries is kept as is.
 */
export function repairDocument(input: BuilderDocument, registry?: BlockRegistry): LoadedDocument {
    assertDocumentShape(input);
    const issues: ValidationIssue[] = [];
    const source = input.blocks as Record<string, unknown>;
    const rootId = input.rootId;

    const rawNode = (id: string): Record<string, unknown> | null => {
        const node = source[id];
        return isRecord(node) && typeof node.type === "string" ? node : null;
    };

    const blocks: Record<BlockId, BlockNode> = {};
    if (!rawNode(rootId)) {
        return { document: { version: input.version, rootId, blocks }, issues };
    }

    const seen = new Set<BlockId>([rootId]);
    const queue: BlockId[] = [rootId];
    while (queue.length > 0) {
        const id = queue.shift() as BlockId;
        const raw = rawNode(id) as Record<string, unknown>;
        const type = raw.type as string;
        const definition = registry?.getDefinition(type);
        if (registry && !definition) {
            issues.push({
                code: "unknown-type",
                severity: "warning",
                blockId: id,
                message: `Block "${id}" has unknown type "${type}" (tolerated — renders as a missing block)`,
            });
        }
        if (raw.id !== id) {
            issues.push({
                code: "id-mismatch",
                severity: "error",
                blockId: id,
                message: `Block keyed "${id}" had id "${String(raw.id)}" — keyed id kept`,
            });
        }
        if (raw.props !== undefined && !isRecord(raw.props)) {
            issues.push({ code: "invalid-node", severity: "error", blockId: id, message: `Block "${id}" has non-object props — reset` });
        }
        if (raw.children !== undefined && !isRecord(raw.children)) {
            issues.push({ code: "invalid-node", severity: "error", blockId: id, message: `Block "${id}" has non-object children — reset` });
        }
        const rawProps = isRecord(raw.props) ? raw.props : {};
        const rawChildren = isRecord(raw.children) ? raw.children : {};
        const containerNames = definition
            ? (definition.containers ?? []).map((container) => container.name)
            : Object.keys(rawChildren);
        if (definition) {
            for (const name of Object.keys(rawChildren)) {
                if (containerNames.includes(name)) continue;
                const count = Array.isArray(rawChildren[name]) ? rawChildren[name].length : 0;
                issues.push({
                    code: "unknown-container",
                    severity: "error",
                    blockId: id,
                    message: `Container "${name}" does not exist on type "${type}" — dropped with its ${count} children`,
                });
            }
        }

        const children: Record<string, BlockId[]> = {};
        for (const name of containerNames) {
            const list = Array.isArray(rawChildren[name]) ? rawChildren[name] : [];
            const containerDef = definition?.containers?.find((container) => container.name === name);
            const kept: BlockId[] = [];
            let overflowReported = false;
            for (const childId of list) {
                if (typeof childId !== "string") continue;
                if (childId === rootId) {
                    issues.push({
                        code: "root-is-child",
                        severity: "error",
                        blockId: rootId,
                        message: `Root block "${rootId}" appeared in container "${name}" of "${id}" — reference dropped`,
                    });
                    continue;
                }
                const child = rawNode(childId);
                if (!child) {
                    issues.push({
                        code: "dangling-child-id",
                        severity: "error",
                        blockId: id,
                        message: `Container "${name}" of "${id}" referenced missing block "${childId}" — reference dropped`,
                    });
                    continue;
                }
                if (seen.has(childId)) {
                    issues.push({
                        code: "multiple-parents",
                        severity: "error",
                        blockId: childId,
                        message: `Block "${childId}" appeared in more than one child list — kept in the first, dropped from "${name}" of "${id}"`,
                    });
                    continue;
                }
                const ctx = { document: input, parentId: id, container: name };
                if (containerDef && !containerAccepts(containerDef, child.type as string, ctx)) {
                    issues.push({
                        code: "accepts-violation",
                        severity: "error",
                        blockId: childId,
                        message: `Container "${name}" of "${id}" does not accept type "${String(child.type)}" — block "${childId}" dropped`,
                    });
                    continue;
                }
                if (containerDef?.maxChildren !== undefined && kept.length >= containerDef.maxChildren) {
                    if (!overflowReported) {
                        overflowReported = true;
                        issues.push({
                            code: "max-children-exceeded",
                            severity: "error",
                            blockId: id,
                            message: `Container "${name}" of "${id}" held more than ${containerDef.maxChildren} children — the extra ones were dropped`,
                        });
                    }
                    continue;
                }
                seen.add(childId);
                kept.push(childId);
                queue.push(childId);
            }
            children[name] = kept;
        }

        // Reuse the stored objects wherever nothing changed: a clean document
        // comes back as the very same reference (the store's controlled-value
        // sync compares by identity), and unchanged nodes keep theirs (immer's
        // structural sharing in the commands relies on it).
        const backfill = definition ? Object.keys(definition.defaultProps).filter((key) => !(key in rawProps)) : [];
        const props = backfill.length > 0 ? { ...definition!.defaultProps, ...rawProps } : rawProps;
        const childrenUnchanged =
            Object.keys(rawChildren).length === containerNames.length &&
            containerNames.every((name) => {
                const before = rawChildren[name];
                return Array.isArray(before) && before.length === children[name].length && before.every((childId, index) => childId === children[name][index]);
            });
        const nodeUnchanged =
            raw.id === id &&
            isRecord(raw.props) && raw.props === props &&
            isRecord(raw.children) && childrenUnchanged &&
            (raw.visibility === undefined || isRecord(raw.visibility));
        if (nodeUnchanged) {
            blocks[id] = raw as unknown as BlockNode;
            continue;
        }
        const node: BlockNode = { id, type, props, children };
        if (isRecord(raw.visibility)) node.visibility = raw.visibility as unknown as BlockVisibility;
        blocks[id] = node;
    }

    for (const id of Object.keys(source)) {
        if (seen.has(id)) continue;
        issues.push({
            code: "orphan-block",
            severity: "error",
            blockId: id,
            message: `Block "${id}" is not reachable from the root — dropped`,
        });
    }

    const documentUnchanged =
        Object.keys(source).length === Object.keys(blocks).length &&
        Object.keys(blocks).every((id) => blocks[id] === source[id]);
    return { document: documentUnchanged ? input : { version: input.version, rootId, blocks }, issues };
}

/**
 * The full load path: outer shape check, `version` normalized, migrations,
 * repair, then validation. Throws only for what cannot be loaded at all —
 * not a document, a version newer than this release, or a root that is
 * missing/malformed. Everything else loads, and `issues` says what had to
 * be changed on the way in (worth logging on the host: it means a stored
 * document was not what this release expected).
 *
 * `registry` is optional for the same reason as in `validateDocument`: a
 * server has no block definitions, and still wants the version check, the
 * migrations and the structural repairs before it renders.
 */
export function loadDocument(input: BuilderDocument, registry?: BlockRegistry): LoadedDocument {
    assertDocumentShape(input);
    const issues: ValidationIssue[] = [];
    let document = input;
    if (typeof document.version !== "number" || !Number.isFinite(document.version)) {
        issues.push({
            code: "invalid-version",
            severity: "warning",
            message: `Document has no numeric version — read as version ${DOCUMENT_VERSION}, no migrations run`,
        });
        document = { ...document, version: DOCUMENT_VERSION };
    }
    const repaired = repairDocument(migrateDocument(document), registry);
    issues.push(...repaired.issues);
    const remaining = validateDocument(repaired.document, registry).filter((issue) => issue.severity === "error");
    if (remaining.length > 0) {
        throw new Error(
            `loadDocument: document cannot be loaded:\n${remaining.map((issue) => `- ${issue.message}`).join("\n")}`,
        );
    }
    return { document: repaired.document, issues };
}
