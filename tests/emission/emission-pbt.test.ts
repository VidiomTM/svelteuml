import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { emitD2 } from "../../src/emission/d2-emitter.js";
import { d2str } from "../../src/emission/d2-utils.js";
import type { SymbolTable } from "../../src/types/ast.js";
import type { DiagramOptions, LayoutDirection } from "../../src/types/diagram.js";
import { DEFAULT_STEREOTYPE_COLORS } from "../../src/types/diagram.js";
import { createEdgeSet, type Edge, type EdgeSet, type EdgeType } from "../../src/types/edge.js";
import { arbSymbolTable } from "../arbitraries/svelte-ast.js";

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 1000;

/* ----- generators ----- */

const allEdgeTypes: EdgeType[] = [
	"extends",
	"implements",
	"composition",
	"aggregation",
	"dependency",
	"association",
	"state_dependency",
	"prop_flow",
	"event",
	"slot",
	"server_load",
	"component_usage",
];

function arbEdgeType(): fc.Arbitrary<EdgeType> {
	return fc.constantFrom(...allEdgeTypes);
}

function arbEdge(): fc.Arbitrary<Edge> {
	return fc.record({
		source: fc.string({ minLength: 1, maxLength: 30 }),
		target: fc.string({ minLength: 1, maxLength: 30 }),
		type: arbEdgeType(),
		label: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
	});
}

function arbEdgeSet(): fc.Arbitrary<EdgeSet> {
	return fc.array(arbEdge(), { maxLength: 20 }).map(createEdgeSet);
}

interface ComponentGraph {
	symbols: SymbolTable;
	edges: EdgeSet;
}

function arbComponentGraph(): fc.Arbitrary<ComponentGraph> {
	return fc.record({
		symbols: arbSymbolTable(),
		edges: arbEdgeSet(),
	});
}

function arbLayoutDirection(): fc.Arbitrary<LayoutDirection> {
	return fc.constantFrom(
		"top-to-bottom" as const,
		"left-to-right" as const,
		"bottom-to-top" as const,
		"right-to-left" as const,
	);
}

function arbUMLConfig(): fc.Arbitrary<DiagramOptions> {
	return fc.record({
		kind: fc.constantFrom("class" as const, "package" as const),
		showMembers: fc.boolean(),
		showMethods: fc.boolean(),
		showVisibility: fc.boolean(),
		showStores: fc.boolean(),
		showProps: fc.boolean(),
		hideEmptyPackages: fc.boolean(),
		title: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
		layoutDirection: fc.option(arbLayoutDirection(), { nil: undefined }),
		stereotypeColors: fc.option(fc.constant(DEFAULT_STEREOTYPE_COLORS), { nil: undefined }),
		targetDir: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
	});
}

/* ----- property tests ----- */

describe("Emission PBT", () => {
	it("output always starts with a title comment", () => {
		fc.assert(
			fc.property(arbComponentGraph(), arbUMLConfig(), (graph, opts) => {
				const result = emitD2(graph.symbols, graph.edges, opts);
				expect(result.content.startsWith("#")).toBe(true);
			}),
			{ numRuns },
		);
	});

	it("emission is deterministic for identical input", () => {
		fc.assert(
			fc.property(arbComponentGraph(), arbUMLConfig(), (graph, opts) => {
				const first = emitD2(graph.symbols, graph.edges, opts).content;
				const second = emitD2(graph.symbols, graph.edges, opts).content;
				expect(first).toBe(second);
			}),
			{ numRuns },
		);
	});

	it("all class, function, and route names appear in class diagram output", () => {
		fc.assert(
			fc.property(arbComponentGraph(), arbUMLConfig(), (graph, opts) => {
				fc.pre(opts.kind === "class");
				const result = emitD2(graph.symbols, graph.edges, opts);
				const content = result.content;
				// Names appear in their D2-escaped form (quotes/backslashes escaped).
				for (const cls of graph.symbols.classes) {
					expect(content).toContain(d2str(cls.name));
				}
				for (const fn of graph.symbols.functions) {
					expect(content).toContain(d2str(fn.name));
				}
				for (const route of graph.symbols.routes) {
					expect(content).toContain(d2str(route.name));
				}
			}),
			{ numRuns },
		);
	});

	it("package diagram starts with a title comment", () => {
		fc.assert(
			fc.property(arbComponentGraph(), arbUMLConfig(), (graph, opts) => {
				fc.pre(opts.kind === "package");
				const result = emitD2(graph.symbols, graph.edges, opts);
				expect(result.content.startsWith("# ")).toBe(true);
			}),
			{ numRuns },
		);
	});
});
