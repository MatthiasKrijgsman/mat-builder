/*
 * Shared color math for style-props (pure, server-safe).
 */

/**
 * Inverse of hexToRgba: parses "#rgb"/"#rrggbb" or "rgb(a)(…)" into a hex
 * color + opacity percentage (for controls that edit them separately).
 * Returns null for anything else (keywords, empty).
 */
export const parseColorToHexOpacity = (color: string): { hex: string; opacity: number } | null => {
    const value = color.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
        const raw = value.slice(1);
        const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
        return { hex: `#${full.toLowerCase()}`, opacity: 100 };
    }
    const match = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (!match) return null;
    const [r, g, b] = [match[1], match[2], match[3]].map((c) => Math.min(255, Number.parseInt(c, 10)));
    const alpha = match[4] === undefined ? 1 : Math.min(1, Number.parseFloat(match[4]));
    const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    return { hex, opacity: Math.round(alpha * 100) };
};

/** "#rgb" or "#rrggbb" + alpha percentage (0–100) → "rgba(r, g, b, a)". Returns the hex untouched at 100%. */
export const hexToRgba = (hex: string, alphaPct: number): string => {
    if (alphaPct >= 100) return hex;
    const raw = hex.replace("#", "");
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const int = Number.parseInt(full, 16);
    if (full.length !== 6 || Number.isNaN(int)) return hex;
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    const a = Math.round((alphaPct / 100) * 100) / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};
