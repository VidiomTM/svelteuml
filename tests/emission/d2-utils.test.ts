import { describe, expect, it } from "vitest";
import { d2str, renderClassRef, sanitizeId } from "../../src/emission/d2-utils.js";

describe("d2str", () => {
	it("escapes double quotes so union-literal types do not break D2", () => {
		expect(d2str('"server" | "client"')).toBe('\\"server\\" | \\"client\\"');
	});
	it("escapes backslashes", () => {
		expect(d2str("a\\b")).toBe("a\\\\b");
	});
});

describe("renderClassRef", () => {
	it("returns empty string for no stereotypes (never emits undefined)", () => {
		expect(renderClassRef([])).toBe("");
	});

	it("returns the single sanitized stereotype", () => {
		expect(renderClassRef(["function"])).toBe("function");
	});

	it("sanitizes hyphenated names to match the classes block keys", () => {
		expect(renderClassRef(["error-page"])).toBe("error_page");
	});

	it("renders multiple stereotypes as a D2 list", () => {
		expect(renderClassRef(["function", "Exported"])).toBe("[function; Exported]");
	});
});

describe("sanitizeId", () => {
	it("emits valid bare identifiers unchanged", () => {
		expect(sanitizeId("CartItem")).toBe("CartItem");
		expect(sanitizeId("findVideo")).toBe("findVideo");
		expect(sanitizeId("foo_bar")).toBe("foo_bar");
	});

	it("quotes D2 reserved keywords so they are not parsed as fields", () => {
		expect(sanitizeId("style")).toBe('"style"');
		expect(sanitizeId("label")).toBe('"label"');
		expect(sanitizeId("classes")).toBe('"classes"');
		expect(sanitizeId("near")).toBe('"near"');
		expect(sanitizeId("link")).toBe('"link"');
		expect(sanitizeId("shape")).toBe('"shape"');
	});

	it("matches reserved keywords case-insensitively, like D2", () => {
		expect(sanitizeId("Style")).toBe('"Style"');
		expect(sanitizeId("LABEL")).toBe('"LABEL"');
	});

	it("quotes names containing non-alphanumerics, preserving the original", () => {
		expect(sanitizeId("+page.server")).toBe('"+page.server"');
		expect(sanitizeId("Foo-Bar")).toBe('"Foo-Bar"');
	});

	it("does not collide distinct names that differ only in special characters", () => {
		// Both used to sanitize to the same bare `Foo_Bar`, silently merging
		// two nodes. Quoting the original keeps them distinct.
		expect(sanitizeId("Foo-Bar")).not.toBe(sanitizeId("Foo_Bar"));
		expect(sanitizeId("Foo.Bar")).not.toBe(sanitizeId("Foo-Bar"));
	});

	it("escapes quotes and backslashes inside quoted identifiers", () => {
		expect(sanitizeId('a"b')).toBe('"a\\"b"');
		expect(sanitizeId("a\\b")).toBe('"a\\\\b"');
	});
});
