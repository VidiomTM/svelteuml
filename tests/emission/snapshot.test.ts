import { describe, expect, it } from "vitest";
import { emitD2 } from "../../src/emission/d2-emitter.js";
import {
	filterEdgesByScope,
	filterSymbolsByScope,
	resolveFocusScope,
} from "../../src/emission/focus.js";
import type { ClassSymbol, SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS, DEFAULT_STEREOTYPE_COLORS } from "../../src/types/diagram.js";
import type { Edge } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeClass(name: string, filePath?: string): ClassSymbol {
	return {
		kind: "class",
		name,
		filePath: filePath ?? `/src/${name}.ts`,
		extends: undefined,
		implements: [],
		members: [],
		isGeneric: false,
		typeParams: [],
	};
}

function makeSymbols(overrides?: Partial<SymbolTable>): SymbolTable {
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

describe("D2 snapshot: class diagram", () => {
	it("emits valid D2 with classes and edges", () => {
		const symbols = makeSymbols({
			classes: [makeClass("App"), makeClass("Router"), makeClass("Store")],
		});
		const edges: Edge[] = [
			{ source: "App", target: "Router", type: "dependency" },
			{ source: "App", target: "Store", type: "composition" },
		];
		const edgeSet = createEdgeSet(edges);
		const result = emitD2(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
	});

	it("emits valid D2 with stores and functions", () => {
		const symbols = makeSymbols({
			classes: [makeClass("Counter")],
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/stores/count.ts",
					storeType: "writable",
					valueType: "number",
					runeKind: "state",
					isExported: true,
				},
			],
			functions: [
				{
					kind: "function",
					name: "formatCount",
					filePath: "/src/utils.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "string",
					typeParams: [],
				},
			],
		});
		const edgeSet = createEdgeSet([]);
		const result = emitD2(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
	});

	it("emits valid D2 with focus mode", () => {
		const symbols = makeSymbols({
			classes: [makeClass("App"), makeClass("Router"), makeClass("Store"), makeClass("Logger")],
		});
		const edges: Edge[] = [
			{ source: "App", target: "Router", type: "dependency" },
			{ source: "App", target: "Store", type: "composition" },
			{ source: "Store", target: "Logger", type: "dependency" },
		];
		const edgeSet = createEdgeSet(edges);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "App", depth: 1 });
		const filteredSymbols = filterSymbolsByScope(symbols, scope);
		const filteredEdges = filterEdgesByScope(edgeSet.edges, scope);
		const filteredEdgeSet = createEdgeSet(filteredEdges);
		const result = emitD2(filteredSymbols, filteredEdgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
		expect(result.content).not.toContain("Logger");
	});

	it("produces identical output on repeated calls (determinism)", () => {
		const symbols = makeSymbols({
			classes: [makeClass("Zebra"), makeClass("Apple"), makeClass("Banana")],
			stores: [
				{
					kind: "store",
					name: "delta",
					filePath: "/src/stores/delta.ts",
					storeType: "writable",
					valueType: "number",
				},
				{
					kind: "store",
					name: "alpha",
					filePath: "/src/stores/alpha.ts",
					storeType: "readable",
					valueType: "string",
				},
			],
			functions: [
				{
					kind: "function",
					name: "zeta",
					filePath: "/src/zeta.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
				{
					kind: "function",
					name: "beta",
					filePath: "/src/beta.ts",
					isExported: false,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const edges: Edge[] = [
			{ source: "Zebra", target: "Apple", type: "dependency" },
			{ source: "Apple", target: "Banana", type: "composition" },
			{ source: "Apple", target: "Banana", type: "dependency" },
			{ source: "Banana", target: "Zebra", type: "dependency" },
		];
		const edgeSet = createEdgeSet(edges);

		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, kind: "class" as const, stereotypeColors: {} };
		const first = emitD2(symbols, edgeSet, opts).content;
		const second = emitD2(symbols, edgeSet, opts).content;
		expect(first).toBe(second);

		const lines = first.split("\n");
		// D2 node declarations: "<id>: {" opening a shape block.
		const nodeLines = lines.filter((l) => /^\w+: \{$/.test(l));
		expect(nodeLines.length).toBeGreaterThan(0);
		expect(first).toContain("shape: class");

		// D2 edges: "<from> -> <to>: ...".
		const edgeLines = lines.filter((l) => / -> /.test(l));
		expect(edgeLines.length).toBeGreaterThan(0);
		for (const l of edgeLines) {
			expect(l).toMatch(/^\w+ -> \w+/);
		}
	});
});

describe("D2 snapshot: package diagram", () => {
	it("emits valid D2 with packages", () => {
		const symbols = makeSymbols({
			classes: [
				{ ...makeClass("App"), filePath: "/src/routes/App.ts" },
				{ ...makeClass("Layout"), filePath: "/src/lib/Layout.ts" },
			],
		});
		const edges: Edge[] = [
			{ source: "/src/routes/App.ts", target: "/src/lib/Layout.ts", type: "dependency" },
		];
		const edgeSet = createEdgeSet(edges);
		const result = emitD2(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
	});
});

describe("D2 snapshot: color theme and layout", () => {
	it("emits D2 with color theme", () => {
		const symbols = makeSymbols({
			classes: [makeClass("MyComponent")],
		});
		const edgeSet = createEdgeSet([]);
		const result = emitD2(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: DEFAULT_STEREOTYPE_COLORS,
		});
		expect(result.content).toContain("classes: {");
		expect(result.content).toContain("# legend:");
	});

	it("emits D2 with layout direction", () => {
		const symbols = makeSymbols({
			classes: [makeClass("Widget")],
		});
		const edgeSet = createEdgeSet([]);
		const result = emitD2(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			layoutDirection: "left-to-right",
			stereotypeColors: {},
		});
		expect(result.content).toContain("direction: right");
	});
});
