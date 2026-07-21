import { describe, expect, it } from "vitest";
import { renderLayoutDirective } from "../../src/emission/layout-hints.js";

describe("renderLayoutDirective", () => {
	it("renders top-to-bottom as direction down", () => {
		expect(renderLayoutDirective("top-to-bottom")).toBe("direction: down");
	});

	it("renders left-to-right as direction right", () => {
		expect(renderLayoutDirective("left-to-right")).toBe("direction: right");
	});

	it("renders bottom-to-top as direction up", () => {
		expect(renderLayoutDirective("bottom-to-top")).toBe("direction: up");
	});

	it("renders right-to-left as direction left", () => {
		expect(renderLayoutDirective("right-to-left")).toBe("direction: left");
	});

	it("returns empty string for unknown direction", () => {
		expect(renderLayoutDirective("diagonal" as never)).toBe("");
	});
});
