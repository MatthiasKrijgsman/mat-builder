import { describe, expect, it } from "vitest";
import { safeUrl } from "./safe-url.ts";

describe("safeUrl", () => {
    it("passes http(s), mailto, tel and sms through", () => {
        for (const url of [
            "https://example.com/a?b=c#d",
            "http://example.com",
            "HTTPS://EXAMPLE.COM",
            "mailto:hi@example.com?subject=Hello",
            "tel:+31612345678",
            "sms:+31612345678",
        ]) {
            expect(safeUrl(url)).toBe(url);
        }
    });

    it("passes relative URLs, fragments and ESP tokens through", () => {
        for (const url of [
            "/unsubscribe",
            "#top",
            "//cdn.example.com/x.png",
            "{{unsubscribe_url}}",
            "*|UNSUB|*",
            "%%link%%",
        ]) {
            expect(safeUrl(url)).toBe(url);
        }
    });

    it("refuses script and data schemes, whatever their spelling", () => {
        for (const url of [
            "javascript:alert(1)",
            "JaVaScRiPt:alert(1)",
            "java\tscript:alert(1)",
            "java\nscript:alert(1)",
            " javascript:alert(1)",
            "javascript:alert(1)",
            "data:text/html;base64,PHNjcmlwdD4=",
            "vbscript:MsgBox",
            "file:///etc/passwd",
            "blob:https://example.com/uuid",
        ]) {
            expect(safeUrl(url)).toBeUndefined();
        }
    });

    it("trims, and treats empty and non-string values as absent", () => {
        expect(safeUrl("  https://example.com  ")).toBe("https://example.com");
        expect(safeUrl("")).toBeUndefined();
        expect(safeUrl("   ")).toBeUndefined();
        expect(safeUrl(undefined)).toBeUndefined();
        expect(safeUrl(42)).toBeUndefined();
    });
});
