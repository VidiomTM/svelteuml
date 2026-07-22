import { describe, expect, it } from "vitest";
import { d2str, renderClassRef } from "../../src/emission/d2-utils.js";

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
