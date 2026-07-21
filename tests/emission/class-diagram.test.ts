import { describe, expect, it } from "vitest";
import { renderClassDiagram } from "../../src/emission/class-diagram.js";
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

describe("renderClassDiagram", () => {
	it("renders empty diagram with title comment and no plantuml markers", () => {
		const result = renderClassDiagram(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			DEFAULT_DIAGRAM_OPTIONS,
		);
		expect(result).toContain("# Diagram");
		expect(result).not.toContain("@startuml");
	});

	it("renders a class with members as a shape class block", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "AudioPlayer",
					filePath: "/src/lib/audio.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "volume",
							visibility: "private",
							type: "number",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
						{
							kind: "method",
							name: "play",
							visibility: "public",
							type: "void",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
							parameters: [{ name: "url", type: "string", isOptional: false }],
							returnType: "void",
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("shape: class");
		expect(result).toContain("AudioPlayer");
		expect(result).toContain(`"- volume": "number"`);
		expect(result).toContain(`"+ play(url: string)": "void"`);
	});

	it("renders an interface with stereotype", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "interface",
					name: "IRepository",
					filePath: "/src/lib/types.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("interface");
	});

	it("renders an abstract class", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "abstract-class",
					name: "BaseService",
					filePath: "/src/lib/base.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("abstract");
	});

	it("renders extends edge (orientation flipped)", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Base",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "Child",
					filePath: "/b.ts",
					extends: "Base",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edges = createEdgeSet([{ source: "/b.ts", target: "/a.ts", type: "extends" }]);
		const result = renderClassDiagram(symbols, edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Base -> Child");
		expect(result).toContain("style.stroke-dash: 0");
	});

	it("renders implements edge as dashed", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "interface",
					name: "IRepo",
					filePath: "/a.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "Repo",
					filePath: "/b.ts",
					extends: undefined,
					implements: ["IRepo"],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edges = createEdgeSet([{ source: "/b.ts", target: "/a.ts", type: "implements" }]);
		const result = renderClassDiagram(symbols, edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Repo -> IRepo");
		expect(result).toContain("style.stroke-dash: 3");
	});

	it("renders dependency edge as dashed", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "dependency" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("style.stroke-dash: 3");
	});

	it("renders store with stereotype", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "userStore",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "User",
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: store");
		expect(result).toContain("userStore");
	});

	it("renders component with props when showProps is true", () => {
		const symbols = makeEmptySymbolTable({
			components: [{ kind: "component", name: "Button", filePath: "/src/lib/Button.svelte" }],
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
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: [component]");
		expect(result).toContain("Button");
		expect(result).toContain(`"+ label": "string"`);
	});

	it("renders component without props when showProps is true", () => {
		const symbols = makeEmptySymbolTable({
			components: [{ kind: "component", name: "Layout", filePath: "/src/routes/+layout.svelte" }],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("class: [component]");
		expect(result).toContain("Layout");
	});

	it("hides members when showMembers is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "x",
							visibility: "private",
							type: "number",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showMembers: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain(`: "number"`);
	});

	it("hides methods when showMethods is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "method",
							name: "doWork",
							visibility: "public",
							type: "void",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
							parameters: [],
							returnType: "void",
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showMethods: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("doWork");
	});

	it("includes title comment when provided", () => {
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, title: "My App" };
		const result = renderClassDiagram(makeEmptySymbolTable(), createEdgeSet([]), opts);
		expect(result).toContain("# My App");
	});

	it("renders prop_flow edge with label", () => {
		const edges = createEdgeSet([
			{ source: "/a.ts", target: "/b.ts", type: "prop_flow", label: "foo: string !" },
		]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("foo: string !");
		expect(result).toContain("style.stroke-dash: 0");
	});

	it("renders event edge with label as dashed", () => {
		const edges = createEdgeSet([
			{ source: "/a.ts", target: "/b.ts", type: "event", label: "submit" },
		]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("submit");
		expect(result).toContain("style.stroke-dash: 3");
	});

	it("renders aggregation edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "aggregation" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("aggregation");
	});

	it("renders association edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "association" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("style.stroke-dash: 0");
	});

	it("renders composition edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "composition" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("composition");
	});

	it("renders class with protected member", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "data",
							visibility: "protected",
							type: "string",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`"# data": "string"`);
	});

	it("hides visibility when showVisibility is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "x",
							visibility: "private",
							type: "number",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showVisibility: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain(`"x": "number"`);
	});

	it("renders component with optional prop", () => {
		const symbols = makeEmptySymbolTable({
			components: [{ kind: "component", name: "Card", filePath: "/src/lib/Card.svelte" }],
			props: [
				{
					kind: "prop",
					name: "size",
					filePath: "/src/lib/Card.svelte",
					componentName: "Card",
					type: "number",
					isRequired: false,
					defaultValue: "16",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain(`"+ size?": "number"`);
	});

	it("renders function stereotype", () => {
		const symbols = makeEmptySymbolTable({
			functions: [
				{
					kind: "function",
					name: "helper",
					filePath: "/src/lib/utils.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("function");
		expect(result).toContain("helper");
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
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("class: store");
	});

	it("hides props when showProps is false", () => {
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
			components: [{ kind: "component", name: "Button", filePath: "/src/lib/Button.svelte" }],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("class: [component]");
	});

	it("renders state_dependency edge as dashed", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "state_dependency" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("style.stroke-dash: 3");
	});

	it("renders slot edge with label", () => {
		const edges = createEdgeSet([
			{
				source: "/src/routes/+page.svelte",
				target: "/src/lib/Card.svelte",
				type: "slot",
				label: "slot:default",
			},
		]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("slot:default");
	});

	it("renders component_usage edge", () => {
		const edges = createEdgeSet([
			{ source: "/Parent.svelte", target: "/Child.svelte", type: "component_usage" },
		]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("->");
		expect(result).toContain("style.stroke-dash: 0");
	});

	it("renders exported class stereotype", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
					isExported: true,
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Exported");
	});

	it("renders exported store stereotype", () => {
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
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Exported");
	});

	it("renders store with state runeKind", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/store.ts",
					storeType: "writable",
					valueType: "number",
					runeKind: "state",
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: state");
	});

	it("renders store with derived runeKind", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "doubled",
					filePath: "/src/lib/store.ts",
					storeType: "derived",
					valueType: "number",
					runeKind: "derived",
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: derived");
	});

	it("renders edge with label", () => {
		const edges = createEdgeSet([
			{ source: "/a.ts", target: "/b.ts", type: "dependency", label: "import" },
		]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`: "import"`);
	});

	it("renders component props when showMembers is true", () => {
		const symbols = makeEmptySymbolTable({
			components: [{ kind: "component", name: "Header", filePath: "/src/lib/Header.svelte" }],
			props: [
				{
					kind: "prop",
					name: "title",
					filePath: "/src/lib/Header.svelte",
					componentName: "Header",
					type: "string",
					isRequired: true,
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true, showMembers: true };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("title");
	});

	it("hides component props when showMembers is false", () => {
		const symbols = makeEmptySymbolTable({
			components: [{ kind: "component", name: "Header", filePath: "/src/lib/Header.svelte" }],
			props: [
				{
					kind: "prop",
					name: "title",
					filePath: "/src/lib/Header.svelte",
					componentName: "Header",
					type: "string",
					isRequired: true,
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true, showMembers: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain(`"+ title"`);
	});

	it("renders non-exported function without stereotype", () => {
		const symbols = makeEmptySymbolTable({
			functions: [
				{
					kind: "function",
					name: "internal",
					filePath: "/src/lib/utils.ts",
					isExported: false,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("internal");
		expect(result).not.toContain("Exported");
	});

	it("renders grouped symbols inside container blocks", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "ServiceA",
					filePath: "/src/lib/services/a.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
					group: "core",
				},
				{
					kind: "class",
					name: "ServiceB",
					filePath: "/src/lib/services/b.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
					group: "core",
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`label: "core"`);
		expect(result).toContain("ServiceA");
		expect(result).toContain("ServiceB");
	});

	it("renders grouped and ungrouped symbols separately", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "GroupedClass",
					filePath: "/src/lib/g.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
					group: "utils",
				},
				{
					kind: "class",
					name: "UngroupedClass",
					filePath: "/src/lib/u.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain(`label: "utils"`);
		expect(result).toContain("UngroupedClass");
	});
});
