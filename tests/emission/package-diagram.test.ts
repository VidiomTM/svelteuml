import { describe, expect, it } from "vitest";
import { renderPackageDiagram } from "../../src/emission/package-diagram.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		routes: [],
		components: [],
		events: [],
		...overrides,
	};
}

function fn(name: string, filePath: string, isExported = true) {
	return {
		kind: "function" as const,
		name,
		filePath,
		isExported,
		isAsync: false,
		parameters: [],
		returnType: "void",
		typeParams: [],
	};
}

describe("renderPackageDiagram", () => {
	it("renders empty diagram with title comment and no plantuml markers", () => {
		const result = renderPackageDiagram(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			DEFAULT_DIAGRAM_OPTIONS,
		);
		expect(result).toContain("# Package Diagram");
		expect(result).not.toContain("@startuml");
	});

	it("groups classes into packages by directory", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "AudioPlayer",
					filePath: "/src/lib/audio.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "VideoPlayer",
					filePath: "/src/lib/media/video.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("AudioPlayer");
		expect(result).toContain("VideoPlayer");
	});

	it("renders dependency between packages with weighted dashed edge", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
		expect(result).toContain("style.stroke-dash: 3");
	});

	it("includes title comment when provided", () => {
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, title: "Packages" };
		const result = renderPackageDiagram(makeEmptySymbolTable(), createEdgeSet([]), opts);
		expect(result).toContain("# Packages");
	});

	it("renders stores in packages when showStores is true", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "number",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: store");
		expect(result).toContain("count");
	});

	it("hides stores when showStores is false", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "number",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: false };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("class: store");
	});

	it("renders components in packages when showProps is true", () => {
		const symbols = makeEmptySymbolTable({
			props: [
				{
					kind: "prop",
					name: "label",
					filePath: "/src/lib/Button.svelte",
					componentName: "Button",
					type: "string",
					isRequired: true,
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: component");
		expect(result).toContain("Button");
	});

	it("renders component without props via symbols.components", () => {
		const symbols = makeEmptySymbolTable({
			components: [{ kind: "component", name: "Button", filePath: "/src/lib/Button.svelte" }],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: component");
		expect(result).toContain("Button");
	});

	it("renders functions in packages", () => {
		const symbols = makeEmptySymbolTable({
			functions: [fn("helper", "/src/lib/utils.ts")],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: [function");
		expect(result).toContain("helper");
	});

	it("skips edges within same package", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/a.ts", target: "/src/lib/b.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).not.toContain("->");
	});

	it("renders extends arrow between packages with weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/a.ts", target: "/src/core/b.ts", type: "extends" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
	});

	it("renders composition arrow between packages with weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/store.ts", type: "composition" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
	});

	it("deduplicates edges between same package pair with weight count", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/lib/b.ts", type: "dependency" },
			{ source: "/src/routes/c.ts", target: "/src/lib/d.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		const matchCount = (result.match(/->/g) ?? []).length;
		expect(matchCount).toBe(1);
		expect(result).toContain(`: "2"`);
	});

	it("aggregates mixed edge types between same packages with total weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/lib/b.ts", type: "dependency" },
			{ source: "/src/routes/c.ts", target: "/src/lib/d.ts", type: "dependency" },
			{ source: "/src/routes/e.ts", target: "/src/lib/f.ts", type: "association" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		const arrowCount = (result.match(/->/g) ?? []).length;
		expect(arrowCount).toBe(1);
		expect(result).toContain(`: "3"`);
	});

	it("renders separate arrows for different package pairs with correct weights", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/lib/b.ts", type: "dependency" },
			{ source: "/src/routes/c.ts", target: "/src/lib/d.ts", type: "dependency" },
			{ source: "/src/routes/e.ts", target: "/src/core/f.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		const arrowCount = (result.match(/->/g) ?? []).length;
		expect(arrowCount).toBe(2);
		expect(result).toContain(`: "2"`);
		expect(result).toContain(`: "1"`);
	});

	it("skips edges where source or target has no package", () => {
		const edges = createEdgeSet([{ source: "a.ts", target: "/src/lib/b.ts", type: "dependency" }]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).not.toContain("->");
	});

	it("renders state_dependency arrow between packages with weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/store.ts", type: "state_dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
	});

	it("renders component_usage arrow between packages", () => {
		const edges = createEdgeSet([
			{
				source: "/src/features/Parent.svelte",
				target: "/src/lib/Child.svelte",
				type: "component_usage",
			},
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
	});

	it("renders aggregation arrow between packages with weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "aggregation" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
	});

	it("renders association arrow between packages with weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "association" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
	});

	it("omits package containers but keeps edges when no members exist", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/core/b.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).not.toContain("label:");
		expect(result).toContain("->");
	});

	it("renders exported class stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/src/lib/svc.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
					isExported: true,
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Exported");
	});

	it("renders exported store stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "myStore",
					filePath: "/src/lib/store.ts",
					storeType: "writable",
					valueType: "number",
					isExported: true,
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("Exported");
	});

	it("renders exported function stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			functions: [fn("helper", "/src/lib/utils.ts")],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Exported");
	});

	it("renders state runeKind store stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/state.ts",
					storeType: "writable",
					valueType: "number",
					runeKind: "state",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: state");
	});

	it("renders derived runeKind store stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "doubled",
					filePath: "/src/lib/derived.ts",
					storeType: "derived",
					valueType: "number",
					runeKind: "derived",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: derived");
	});

	it("renders interface in packages", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "interface",
					name: "IRepo",
					filePath: "/src/lib/types.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("IRepo");
		expect(result).toContain("class: interface");
	});

	it("renders implements arrow between packages with weight", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/repo.ts", target: "/src/core/types.ts", type: "implements" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain(`: "1"`);
	});

	it("groups nested files under top-level src/ dir", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "AudioPlayer",
					filePath: "/src/lib/audio.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "VideoPlayer",
					filePath: "/src/lib/media/video.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`label: "lib"`);
		expect(result).toContain("AudioPlayer");
		expect(result).toContain("VideoPlayer");
	});

	it("groups each top-level src/ dir as separate package", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Helper",
					filePath: "/src/lib/utils.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "PageHandler",
					filePath: "/src/routes/+page.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`label: "lib"`);
		expect(result).toContain(`label: "routes"`);
	});

	it("skips files directly in src/ with no subdirectory", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "TopLevel",
					filePath: "/src/top.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).not.toContain("TopLevel");
		expect(result).toContain("# Package Diagram");
	});

	it("falls back to immediate parent dir for files outside src/", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "ExternalUtil",
					filePath: "/external/utils.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`label: "external"`);
		expect(result).toContain("ExternalUtil");
	});

	it("uses top-level package name in edges", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/sub/a.ts", target: "/src/routes/deep/api.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
	});

	it("keeps dotted member names quoted without namespace collision", () => {
		const symbols = makeEmptySymbolTable({
			functions: [fn("+layout", "/src/routes/x.ts"), fn("+layout.server", "/src/routes/x.ts")],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`"+layout":`);
		expect(result).toContain(`"+layout.server":`);
	});

	it("namespaces same-named members in different packages", () => {
		const symbols = makeEmptySymbolTable({
			functions: [fn("index", "/src/lib/a.ts"), fn("index", "/src/routes/b.ts")],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		const occurrences = (result.match(/"index":/g) ?? []).length;
		expect(occurrences).toBe(2);
		expect(result).toContain(`label: "lib"`);
		expect(result).toContain(`label: "routes"`);
	});
});
