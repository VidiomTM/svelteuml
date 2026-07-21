import { describe, expect, it } from "vitest";
import { renderD2 } from "../../src/emission/renderer.js";

const validD2 = "# Diagram\nx -> y";

describe("renderD2", () => {
	it("returns SVG data on successful render", async () => {
		const result = await renderD2(validD2, "svg");
		expect(result.success).toBe(true);
		expect(result.data).toContain("<svg");
	});

	// ponytail: PNG needs d2's headless-browser rasterizer, absent in CI.
	// Assert the RenderResult contract holds either way.
	it("returns a well-formed result for PNG output", async () => {
		const result = await renderD2(validD2, "png");
		if (result.success) {
			expect(result.data?.length).toBeGreaterThan(0);
		} else {
			expect(result.error).toBeTruthy();
		}
	});

	it("returns error on invalid d2 source", async () => {
		const result = await renderD2("x: {", "svg");
		expect(result.success).toBe(false);
		expect(result.error).toContain("d2 render failed");
	});

	it("returns error when the render times out", async () => {
		const result = await renderD2(validD2, "svg", 1);
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
	});
});
