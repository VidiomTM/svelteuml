import { describe, expect, it } from "vitest";
import { emitD2 } from "../../src/emission/d2-emitter.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS, DEFAULT_STEREOTYPE_COLORS } from "../../src/types/diagram.js";
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

describe("emitD2", () => {
	it("defaults to class diagram kind", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.diagramKind).toBe("class");
		expect(result.content).toContain("# Diagram");
	});

	it("produces class diagram when kind is class", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
		});
		expect(result.diagramKind).toBe("class");
	});

	it("produces package diagram when kind is package", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
		});
		expect(result.diagramKind).toBe("package");
		expect(result.content).toContain("# Package Diagram");
	});

	it("uses DEFAULT_DIAGRAM_OPTIONS when no options provided", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.content).toContain("# Diagram");
		expect(result.content).not.toContain("@enduml");
	});

	it("injects layout direction when specified", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			layoutDirection: "left-to-right",
			stereotypeColors: {},
		});
		expect(result.content).toContain("direction: right");
	});

	it("injects color theme when stereotypeColors provided", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			stereotypeColors: { component: "#FF0000" },
		});
		expect(result.content).toContain("classes: {");
		expect(result.content).toContain(`component: { style: { fill: "#FF0000"`);
	});

	it("omits theme block when stereotypeColors is empty", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			stereotypeColors: {},
		});
		expect(result.content).not.toContain("classes: {");
		expect(result.content).not.toContain("# legend:");
	});

	it("injects layout and color together", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			layoutDirection: "bottom-to-top",
			stereotypeColors: DEFAULT_STEREOTYPE_COLORS,
		});
		expect(result.content).toContain("direction: up");
		expect(result.content).toContain("classes: {");
		expect(result.content).toContain("# legend:");
	});

	it("defaults to top-to-bottom layout", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			stereotypeColors: {},
		});
		expect(result.content).toContain("direction: down");
	});

	it("handles missing stereotypeColors by using empty defaults", () => {
		const result = emitD2(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			layoutDirection: "left-to-right",
			stereotypeColors: {} as Record<string, string>,
		});
		expect(result.content).toContain("direction: right");
	});
});
