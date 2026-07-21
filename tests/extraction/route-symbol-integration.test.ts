import { describe, expect, it } from "vitest";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";
import { buildParsingProject } from "../../src/parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";
import type { SvelteUMLConfig } from "../../src/types/index.js";

function makeConfig(): SvelteUMLConfig {
	return {
		targetDir: "/project",
		outputPath: "diagram.d2",
		format: "d2",
		include: ["**/*.ts", "**/*.svelte"],
		exclude: [],
		maxDepth: 10,
		excludeExternals: false,
		aliasOverrides: {},
	};
}

describe("SymbolExtractor route integration", () => {
	it("stores RouteSymbol in symbol table for route file", () => {
		const project = buildParsingProject(
			[],
			[
				{
					path: "/project/src/routes/+page.ts",
					content: `export function load() { return {}; }`,
				},
			],
			makeConfig(),
			{},
		);
		const errorHandler = new PipelineErrorHandler(false);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.routes).toHaveLength(1);
		expect(symbols.routes[0]?.routeKind).toBe("page");
		expect(symbols.routes[0]?.isServer).toBe(false);
		expect(symbols.routes[0]?.routeSegment.raw).toBe("/");
		expect(symbols.routes[0]?.name).toBe("+page");
	});

	it("stores RouteSymbol for server route", () => {
		const project = buildParsingProject(
			[],
			[
				{
					path: "/project/src/routes/api/songs/+server.ts",
					content: `export function GET() { return new Response(); }`,
				},
			],
			makeConfig(),
			{},
		);
		const errorHandler = new PipelineErrorHandler(false);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.routes).toHaveLength(1);
		expect(symbols.routes[0]?.routeKind).toBe("server");
		expect(symbols.routes[0]?.isServer).toBe(true);
		expect(symbols.routes[0]?.routeSegment.raw).toBe("/api/songs");
	});

	it("stores RouteSymbol with parsed params for dynamic route", () => {
		const project = buildParsingProject(
			[],
			[
				{
					path: "/project/src/routes/users/[id]/+page.ts",
					content: `export function load() { return {}; }`,
				},
			],
			makeConfig(),
			{},
		);
		const errorHandler = new PipelineErrorHandler(false);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.routes).toHaveLength(1);
		expect(symbols.routes[0]?.routeSegment.params).toEqual([{ kind: "dynamic", name: "id" }]);
	});

	it("stores RouteSymbol with group for grouped route", () => {
		const project = buildParsingProject(
			[],
			[
				{
					path: "/project/src/routes/(auth)/login/+page.ts",
					content: `export function load() { return {}; }`,
				},
			],
			makeConfig(),
			{},
		);
		const errorHandler = new PipelineErrorHandler(false);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.routes).toHaveLength(1);
		expect(symbols.routes[0]?.routeSegment.groups).toEqual(["auth"]);
	});

	it("stores RouteSymbol with matcher for matched route", () => {
		const project = buildParsingProject(
			[],
			[
				{
					path: "/project/src/routes/items/[id=integer]/+page.ts",
					content: `export function load() { return {}; }`,
				},
			],
			makeConfig(),
			{},
		);
		const errorHandler = new PipelineErrorHandler(false);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.routes).toHaveLength(1);
		expect(symbols.routes[0]?.routeSegment.params).toEqual([
			{ kind: "dynamic", name: "id", matcher: "integer" },
		]);
	});

	it("stores no RouteSymbols for non-route files", () => {
		const project = buildParsingProject(
			[],
			[
				{
					path: "/project/src/lib/utils.ts",
					content: `export function helper() {}`,
				},
			],
			makeConfig(),
			{},
		);
		const errorHandler = new PipelineErrorHandler(false);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.routes).toHaveLength(0);
	});
});
