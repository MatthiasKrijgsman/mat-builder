/*
 * Shared color math for style-props (pure, server-safe).
 */

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
