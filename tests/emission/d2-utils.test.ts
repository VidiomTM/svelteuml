import { describe, expect, it } from "vitest";
import { renderClassRef } from "../../src/emission/d2-utils.js";

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
