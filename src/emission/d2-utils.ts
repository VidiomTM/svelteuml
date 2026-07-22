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

export function renderClassRef(stereotypes: string[]): string {
	const safe = stereotypes.map(sanitizeStereotype);
	if (safe.length === 0) return "";
	if (safe.length === 1) return safe[0] as string;
	return `[${safe.join("; ")}]`;
}
