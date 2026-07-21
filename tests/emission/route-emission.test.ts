import { describe, expect, it } from "vitest";
import { renderClassDiagram } from "../../src/emission/class-diagram.js";
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

describe("route stereotype rendering in class diagram", () => {
	it("renders page route with class: page stereotype", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: page");
		expect(result).toContain("+page");
	});

	it("renders layout route with class: layout stereotype", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+layout",
					filePath: "/src/routes/+layout.svelte",
					routeKind: "layout",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: layout");
	});

	it("renders server route with class: endpoint stereotype", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+server",
					filePath: "/src/routes/api/songs/+server.ts",
					routeKind: "server",
					isServer: true,
					routeSegment: { raw: "/api/songs", params: [], groups: [] },
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: endpoint");
	});

	it("renders error route with class: error_page stereotype", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+error",
					filePath: "/src/routes/+error.svelte",
					routeKind: "error",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: error_page");
	});

	it("renders page route with server flag as class: PageLoad", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: PageLoad");
	});

	it("renders layout route with server flag as class: LayoutLoad", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+layout.server",
					filePath: "/src/routes/+layout.server.ts",
					routeKind: "layout",
					isServer: true,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: LayoutLoad");
	});

	it("includes route segment path in route box", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/users/[id]/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/users/[id]",
						params: [{ kind: "dynamic", name: "id" }],
						groups: [],
					},
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("/users/[id]");
	});

	it("annotates dynamic params in route box", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/users/[id]/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/users/[id]",
						params: [{ kind: "dynamic", name: "id" }],
						groups: [],
					},
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("dynamic id");
	});

	it("annotates rest params in route box", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/docs/[...slug]/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/docs/[...slug]",
						params: [{ kind: "rest", name: "slug" }],
						groups: [],
					},
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("rest slug");
	});

	it("annotates params with matchers", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/items/[id=integer]/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/items/[id=integer]",
						params: [{ kind: "dynamic", name: "id", matcher: "integer" }],
						groups: [],
					},
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("id=integer");
	});

	it("annotates group layouts", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/(auth)/login/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/(auth)/login",
						params: [],
						groups: ["auth"],
					},
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("group: auth");
	});
});

describe("route stereotype rendering in package diagram", () => {
	it("renders page route inside package with class: page stereotype", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: page");
		expect(result).toContain("+page");
	});

	it("renders route in correct package directory", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page",
					filePath: "/src/routes/users/[id]/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/users/[id]",
						params: [{ kind: "dynamic", name: "id" }],
						groups: [],
					},
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain('label: "routes"');
		expect(result).toContain("class: page");
	});

	it("renders server route with class: endpoint in package", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+server",
					filePath: "/src/routes/api/+server.ts",
					routeKind: "server",
					isServer: true,
					routeSegment: { raw: "/api", params: [], groups: [] },
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: endpoint");
	});

	it("renders layout route with class: layout in package", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+layout",
					filePath: "/src/routes/+layout.svelte",
					routeKind: "layout",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: layout");
	});

	it("renders error route with class: error_page in package", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+error",
					filePath: "/src/routes/+error.svelte",
					routeKind: "error",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: error_page");
	});

	it("renders PageLoad and LayoutLoad stereotypes", () => {
		const symbols = makeEmptySymbolTable({
			routes: [
				{
					kind: "route",
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
				{
					kind: "route",
					name: "+layout.server",
					filePath: "/src/routes/+layout.server.ts",
					routeKind: "layout",
					isServer: true,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("class: PageLoad");
		expect(result).toContain("class: LayoutLoad");
	});
});
