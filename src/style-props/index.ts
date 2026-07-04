/*
 * style-props — the shared visual vocabulary for style groups (docs/03).
 *
 * Pure and server-safe: value types, defaults, and toCss converters only.
 * Imported by the client group components, per-block styles.ts, AND the
 * server-safe email render — so nothing here may import mat-ui, react-dom,
 * or anything client-only (React imports must stay type-only).
 *
 * Every converter accepts `undefined` and returns {} — documents saved
 * before a block gained a group degrade softly instead of crashing.
 */

export * from "./background.ts";
export * from "./border.ts";
export * from "./color.ts";
export * from "./effects.ts";
export * from "./layout.ts";
export * from "./size.ts";
export * from "./spacing.ts";
export * from "./typography.ts";
