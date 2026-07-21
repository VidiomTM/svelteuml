import { describe, expect, it } from "vitest";
import { createEdgeSet } from "../../src/types/edge.js";
import type {
	EmissionResult,
	ExtractionResult,
	ParseError,
	ParseResult,
	PipelineResult,
} from "../../src/types/pipeline.js";

describe("src/types/pipeline.ts", () => {
	describe("ParseResult", () => {
		it("represents a successful parse", () => {
			const result: ParseResult = { sourceFile: "/src/App.svelte", success: true };
			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("represents a failed parse with error", () => {
			const error: ParseError = { message: "Unexpected token", line: 10, column: 5 };
			const result: ParseResult = { sourceFile: "/src/Broken.svelte", success: false, error };
			expect(result.success).toBe(false);
			expect(result.error?.message).toBe("Unexpected token");
			expect(result.error?.line).toBe(10);
		});

		it("allows error without line/column", () => {
			const error: ParseError = { message: "File not found" };
			expect(error.line).toBeUndefined();
			expect(error.column).toBeUndefined();
		});
	});

	describe("ExtractionResult", () => {
		it("holds symbols, edges, and parse results", () => {
			const result: ExtractionResult = {
				symbols: {
					classes: [],
					functions: [],
					stores: [],
					props: [],
					exports: [],
				},
				edges: createEdgeSet([]),
				parseResults: [],
			};
			expect(result.symbols.classes).toHaveLength(0);
			expect(result.edges.edges).toHaveLength(0);
			expect(result.parseResults).toHaveLength(0);
		});
	});

	describe("EmissionResult", () => {
		it("holds class diagram content", () => {
			const result: EmissionResult = {
				content: "# Diagram\nA: { shape: class }",
				diagramKind: "class",
			};
			expect(result.diagramKind).toBe("class");
			expect(result.content).toContain("#");
		});

		it("holds package diagram content", () => {
			const result: EmissionResult = {
				content: '# Package Diagram\nfoo: { label: "foo" }',
				diagramKind: "package",
			};
			expect(result.diagramKind).toBe("package");
		});
	});

	describe("PipelineResult", () => {
		it("combines extraction and emission results", () => {
			const extraction: ExtractionResult = {
				symbols: {
					classes: [],
					functions: [],
					stores: [],
					props: [],
					exports: [],
				},
				edges: createEdgeSet([]),
				parseResults: [{ sourceFile: "/src/A.svelte", success: true }],
			};
			const emission: EmissionResult = {
				content: "# Diagram",
				diagramKind: "class",
			};
			const result: PipelineResult = { extraction, emission };

			expect(result.extraction.parseResults).toHaveLength(1);
			expect(result.emission.diagramKind).toBe("class");
		});
	});
});
