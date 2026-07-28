import { sanitizeStereotype } from "./color-theme.js";

/**
 * Render a D2 `class:` value for a member's stereotypes. Names are sanitized to
 * match the keys emitted in the `classes:` block (hyphens become underscores).
 * Returns "" for no stereotypes so callers can omit the attribute entirely and
 * never emit `class: undefined`.
 */
/**
 * Escape a string for use inside a D2 double-quoted literal. Backslashes and
 * double quotes are escaped so values from source (e.g. a union type like
 * `"a" | "b"`) do not terminate the D2 string and break the parse.
 */
export function d2str(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * D2 reserved keywords (terrastruct/d2 `d2ast.ReservedKeywords`). A bare map
 * key matching one of these — case-insensitively — is parsed as a built-in
 * field (e.g. `style`, `label`, `shape`) rather than a shape, so an identifier
 * that collides with one must be emitted quoted.
 */
const D2_RESERVED_KEYWORDS = new Set<string>([
	"3d",
	"animated",
	"bold",
	"border-radius",
	"class",
	"classes",
	"constraint",
	"direction",
	"double-border",
	"fill",
	"fill-pattern",
	"filled",
	"font",
	"font-color",
	"font-size",
	"grid-columns",
	"grid-gap",
	"grid-rows",
	"height",
	"horizontal-gap",
	"icon",
	"italic",
	"label",
	"layers",
	"left",
	"link",
	"multiple",
	"near",
	"opacity",
	"scenarios",
	"shadow",
	"shape",
	"source-arrowhead",
	"steps",
	"stroke",
	"stroke-dash",
	"stroke-width",
	"style",
	"target-arrowhead",
	"text-transform",
	"tooltip",
	"top",
	"underline",
	"vars",
	"vertical-gap",
	"width",
]);

/**
 * Produce a safe D2 identifier for an arbitrary symbol name.
 *
 * Names that are already valid bare D2 identifiers (`[A-Za-z0-9_]+`) and are
 * not a reserved keyword are emitted unchanged. Everything else is emitted as
 * a double-quoted D2 string holding the ORIGINAL name. Quoting the original —
 * rather than a lossily-sanitized form — is what keeps identifiers
 * collision-free: `Foo-Bar` becomes `"Foo-Bar"` while `Foo_Bar` stays
 * `Foo_Bar`, instead of both collapsing onto a single `Foo_Bar` node and
 * silently merging. Reserved keywords are quoted so D2 does not reinterpret a
 * shape named e.g. `style` as the built-in style field.
 */
export function sanitizeId(name: string): string {
	const isBare = /^[A-Za-z0-9_]+$/.test(name);
	if (isBare && !D2_RESERVED_KEYWORDS.has(name.toLowerCase())) {
		return name;
	}
	return `"${d2str(name)}"`;
}

export function renderClassRef(stereotypes: string[]): string {
	const safe = stereotypes.map(sanitizeStereotype);
	if (safe.length === 0) return "";
	if (safe.length === 1) return safe[0] as string;
	return `[${safe.join("; ")}]`;
}
