import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

function fn(name: string, filePath: string) {
	return {
		kind: "function" as const,
		name,
		filePath,
		isExported: true,
		isAsync: false,
		parameters: [],
		returnType: "void",
		typeParams: [],
	};
}

describe("package diagram README annotations", () => {
	let root: string;

	beforeEach(() => {
		root = join(os.tmpdir(), `readme-emit-test-${Date.now()}`);
		mkdirSync(join(root, "src", "foo"), { recursive: true });
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("uses @uml.title as the package label", () => {
		writeFileSync(join(root, "src", "foo", "README.md"), "<!-- @uml.title: Foo Pkg -->");
		const symbols = makeEmptySymbolTable({
			functions: [fn("doThing", join(root, "src", "foo", "thing.ts"))],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
			targetDir: root,
			readmeAnnotations: true,
		});
		expect(result).toContain('label: "Foo Pkg"');
	});

	it("drops a package flagged @uml.hide", () => {
		writeFileSync(join(root, "src", "foo", "README.md"), "<!-- @uml.hide -->");
		const symbols = makeEmptySymbolTable({
			functions: [fn("doThing", join(root, "src", "foo", "thing.ts"))],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
			targetDir: root,
			readmeAnnotations: true,
		});
		expect(result).not.toContain("foo");
	});

	it("does not read READMEs when the flag is off", () => {
		writeFileSync(join(root, "src", "foo", "README.md"), "<!-- @uml.title: Foo Pkg -->");
		const symbols = makeEmptySymbolTable({
			functions: [fn("doThing", join(root, "src", "foo", "thing.ts"))],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
			targetDir: root,
		});
		expect(result).not.toContain("Foo Pkg");
		expect(result).toContain('label: "foo"');
	});
});

describe("package diagram naming stereotypes", () => {
	it("prepends repository stereotype for *.repo.ts members", () => {
		const symbols = makeEmptySymbolTable({
			functions: [fn("findVideo", "/src/lib/video.repo.ts")],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
		});
		expect(result).toContain("repository");
	});
});
