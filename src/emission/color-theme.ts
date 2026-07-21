import type { StereotypeColors } from "../types/diagram.js";

const COLOR_HEX_RE = /^#[0-9a-fA-F]{6}$/;
const NAMED_COLORS = new Set([
	"black",
	"white",
	"red",
	"green",
	"blue",
	"yellow",
	"orange",
	"purple",
	"gray",
	"grey",
	"cyan",
	"magenta",
	"pink",
	"brown",
	"gold",
	"silver",
	"navy",
	"teal",
	"maroon",
	"olive",
	"lime",
	"aqua",
	"fuchsia",
	"transparent",
]);

const FONT_COLOR = "#f5f5fa";

// Hyphens are invalid in D2 class identifiers, so collapse to underscore.
export function sanitizeStereotype(s: string): string {
	return s.replace(/[^a-zA-Z0-9_]/g, "_");
}

function sanitizeColor(c: string): string {
	if (COLOR_HEX_RE.test(c) || NAMED_COLORS.has(c.toLowerCase())) return c;
	return "#666666";
}

export function renderColorTheme(colors: StereotypeColors): string {
	const entries = Object.entries(colors).sort(([a], [b]) => a.localeCompare(b));
	if (entries.length === 0) return "";

	const lines: string[] = ["classes: {"];
	for (const [stereotype, color] of entries) {
		const safe = sanitizeStereotype(stereotype);
		const safeColor = sanitizeColor(color);
		lines.push(`  ${safe}: { style: { fill: "${safeColor}"; font-color: "${FONT_COLOR}" } }`);
	}
	lines.push("}");
	return lines.join("\n");
}

// D2 has no legend construct, so emit the pairs as a comment for reference.
export function renderColorLegend(colors: StereotypeColors): string {
	const entries = Object.entries(colors).sort(([a], [b]) => a.localeCompare(b));
	if (entries.length === 0) return "";

	const pairs = entries.map(([s, c]) => `${sanitizeStereotype(s)}=${sanitizeColor(c)}`);
	return `# legend: ${pairs.join(", ")}`;
}
