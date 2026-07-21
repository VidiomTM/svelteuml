import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { emitD2 } from "../../src/emission/d2-emitter.js";
import type { ComponentSymbol, SymbolTable } from "../../src/types/ast.js";
import type { Edge, EdgeType } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

const ALL_EDGE_TYPES: EdgeType[] = [
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

const SAFE_NAMES: string[] = [
	"Button",
	"Card",
	"Header",
	"Footer",
	"Sidebar",
	"Modal",
	"Form",
	"Input",
	"Avatar",
	"Badge",
	"Tabs",
	"Table",
	"List",
	"Navbar",
	"Dropdown",
	"Tooltip",
	"Popover",
	"Alert",
	"Spinner",
	"Progress",
];

function arbComponentGraph(): fc.Arbitrary<{
	symbols: SymbolTable;
	edges: Edge[];
}> {
	return fc.shuffledSubarray(SAFE_NAMES, { minLength: 1, maxLength: 15 }).chain((names) => {
		const components = names.map(
			(name): ComponentSymbol => ({
				kind: "component",
				name,
				filePath: `src/lib/${name}.svelte`,
			}),
		);
		const edgeArb = fc.array(
			fc.record({
				source: fc.constantFrom(...names),
				target: fc.constantFrom(...names),
				type: fc.constantFrom(...ALL_EDGE_TYPES),
				label: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
					nil: undefined,
				}),
			}),
			{ maxLength: 25 },
		);
		return edgeArb.map((edges) => ({
			symbols: {
				classes: [],
				functions: [],
				stores: [],
				props: [],
				events: [],
				exports: [],
				routes: [],
				components,
			},
			edges,
		}));
	});
}

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 1000;

describe("D2 emission property tests", () => {
	it("output always starts with a title comment", () => {
		fc.assert(
			fc.property(arbComponentGraph(), ({ symbols, edges }) => {
				const result = emitD2(symbols, createEdgeSet(edges));
				expect(result.content.startsWith("#")).toBe(true);
			}),
			{ numRuns },
		);
	});

	it("no component is declared more than once", () => {
		fc.assert(
			fc.property(arbComponentGraph(), ({ symbols, edges }) => {
				const content = emitD2(symbols, createEdgeSet(edges)).content;
				for (const comp of symbols.components) {
					const occurrences = content.split(`label: "${comp.name}"`).length - 1;
					expect(occurrences).toBe(1);
				}
			}),
			{ numRuns },
		);
	});

	it("all components appear in output", () => {
		fc.assert(
			fc.property(arbComponentGraph(), ({ symbols, edges }) => {
				const content = emitD2(symbols, createEdgeSet(edges)).content;
				for (const comp of symbols.components) {
					expect(content).toContain(`label: "${comp.name}"`);
				}
			}),
			{ numRuns },
		);
	});
});
