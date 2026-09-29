import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * Every Tailwind utility is authored `mat:`-prefixed (CLAUDE.md). An
 * unprefixed one compiles to NOTHING, so scripts/check-css.mjs — which reads
 * the built CSS — cannot see it: the class just silently does nothing, or
 * works only in a host whose own Tailwind happens to generate it (the
 * playground did, which hid a canvas slot rendering its horizontal cells at
 * content width). This scans the source's class strings instead.
 */

const SRC = fileURLToPath(new URL("..", import.meta.url));
const UTILITY =
    /^(?:[a-z-]+:|\*:)*-?(?:flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|items-|justify-|gap-|p[xytrbl]?-|m[xytrbl]?-|w-|h-|min-|max-|text-|bg-|border|rounded|shadow|opacity-|z-|top-|left-|right-|bottom-|inset|overflow|cursor-|select-|pointer-events|truncate|font-|leading-|tracking-|size-|shrink|grow|basis-|self-|place-|order-|col-|row-|space-|divide-|ring|outline|transition|duration-|ease-|animate-|translate|scale-|rotate-|whitespace-|break-|sr-only|aspect-)/;
const CLASS_STRING = /(?:className|class)\s*[=:]\s*\{?\s*[`"']([^`"']*)/g;

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
    });
}

describe("utility prefix", () => {
    it("authors every Tailwind utility in a class string with the mat: prefix", () => {
        const offenders: string[] = [];
        for (const file of sourceFiles(SRC)) {
            readFileSync(file, "utf8")
                .split("\n")
                .forEach((line, index) => {
                    for (const match of line.matchAll(CLASS_STRING)) {
                        const bad = match[1].split(/\s+/).filter((token) => token && !token.startsWith("mat:") && UTILITY.test(token));
                        if (bad.length) offenders.push(`${file.slice(SRC.length)}:${index + 1} ${bad.join(" ")}`);
                    }
                });
        }
        expect(offenders).toEqual([]);
    });
});
