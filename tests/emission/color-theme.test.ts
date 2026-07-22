import { describe, expect, it } from "vitest";
import { renderColorLegend, renderColorTheme } from "../../src/emission/color-theme.js";

describe("renderColorTheme", () => {
	it("returns empty string for empty colors", () => {
		expect(renderColorTheme({})).toBe("");
	});

	it("renders a D2 classes block for each stereotype", () => {
		const colors = { component: "#4A90D9", store: "#E67E22" };
		const result = renderColorTheme(colors);
		expect(result).toContain("classes: {");
		expect(result).toContain(`component: { style: { fill: "#4A90D9"; font-color: "#f5f5fa" } }`);
		expect(result).toContain(`store: { style: { fill: "#E67E22"; font-color: "#f5f5fa" } }`);
	});

	it("renders all provided stereotype colors", () => {
		const result = renderColorTheme({ component: "#4A90D9", page: "#27AE60" });
		expect(result).toContain("component");
		expect(result).toContain("page");
	});

	it("sanitizes hyphenated stereotype names to underscore", () => {
		const result = renderColorTheme({ "error-page": "#FF0000" });
		expect(result).toContain("error_page: {");
		expect(result).not.toContain("error-page");
	});

	it("sanitizes stereotype with special characters", () => {
		const result = renderColorTheme({ "my<<stereotype>>": "#FF0000" });
		expect(result).toContain("my__stereotype__: {");
	});

	it("sanitizes invalid color to fallback", () => {
		const result = renderColorTheme({ component: "not-a-valid-color" });
		expect(result).toContain(`fill: "#666666"`);
	});

	it("allows named colors", () => {
		const result = renderColorTheme({ component: "red" });
		expect(result).toContain(`fill: "red"`);
	});
});

describe("renderColorLegend", () => {
	it("returns empty string for empty colors", () => {
		expect(renderColorLegend({})).toBe("");
	});

	it("renders a legend comment with stereotype=color pairs", () => {
		const colors = { component: "#4A90D9" };
		const result = renderColorLegend(colors);
		expect(result).toContain("# legend:");
		expect(result).toContain("component=#4A90D9");
	});

	it("sanitizes legend entries", () => {
		const result = renderColorLegend({ "bad<<name>>": "invalid" });
		expect(result).toContain("bad__name__=#666666");
	});

	it("uses dark font on light fills and light font on dark fills", () => {
		const light = renderColorTheme({ component: "#8be9fd" });
		expect(light).toContain(`font-color: "#1a1a2e"`);
		const dark = renderColorTheme({ function: "#6272a4" });
		expect(dark).toContain(`font-color: "#f5f5fa"`);
	});
});
