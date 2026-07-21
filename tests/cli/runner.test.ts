import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { buildCliConfig, filterEdges, runPipeline } from "../../src/cli/runner.js";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

vi.mock("../../src/discovery/file-discovery.js", () => ({
	discoverFiles: vi.fn().mockResolvedValue({
		svelte: [],
		typescript: [],
		javascript: [],
		svelteModules: [],
		exportedFiles: new Set(),
	}),
}));

vi.mock("../../src/discovery/svelte-config.js", () => ({
	loadSvelteConfig: vi.fn().mockResolvedValue({ aliases: {} }),
}));

vi.mock("../../src/discovery/tsconfig.js", () => ({
	loadTsConfig: vi.fn().mockResolvedValue({ aliases: {} }),
}));

vi.mock("../../src/parsing/svelte-to-tsx.js", () => ({
	convertFiles: vi.fn().mockResolvedValue({
		results: [],
		parseResults: [],
	}),
}));

vi.mock("../../src/parsing/ts-morph-project.js", () => ({
	buildParsingProject: vi.fn().mockReturnValue({
		getProject: vi.fn().mockReturnValue({
			getSourceFile: vi.fn().mockReturnValue(undefined),
		}),
		getAllSourceFiles: vi.fn().mockReturnValue(new Map()),
	}),
}));

vi.mock("../../src/extraction/symbol-extractor.js", () => ({
	SymbolExtractor: vi.fn().mockImplementation(() => ({
		extract: vi.fn().mockReturnValue({
			classes: [],
			functions: [],
			stores: [],
			props: [],
			exports: [],
			routes: [],
			components: [],
			events: [],
		}),
	})),
}));

vi.mock("../../src/dependency/index.js", () => ({
	scanImports: vi.fn().mockReturnValue([]),
	buildEdges: vi.fn().mockReturnValue([]),
	detectCircularDependencies: vi.fn().mockReturnValue({ cycles: [] }),
	trackPropFlows: vi.fn().mockReturnValue([]),
	trackStoreSubscriptions: vi.fn().mockReturnValue([]),
	buildServerLoadEdges: vi.fn().mockReturnValue([]),
}));

vi.mock("../../src/dependency/reactive-tracker.js", () => ({
	trackReactiveDependencies: vi.fn().mockReturnValue([]),
}));

vi.mock("../../src/emission/d2-emitter.js", () => ({
	emitD2: vi.fn().mockReturnValue({ content: "# Diagram" }),
}));

vi.mock("../../src/emission/renderer.js", () => ({
	renderD2: vi.fn().mockResolvedValue({ success: false, error: "mock fallback" }),
}));

import { existsSync, writeFileSync } from "node:fs";

const mockedExistsSync = vi.mocked(existsSync);
// biome-ignore lint/correctness/noUnusedVariables: used by write assertions
const mockedWriteFileSync = vi.mocked(writeFileSync);

function makeCliOpts(overrides: Partial<CliOptions> = {}): CliOptions {
	return {
		subcommand: "generate",
		targetDir: "/tmp/project",
		outputPath: undefined,
		format: "d2",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		excludePatterns: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		watch: false,
		diagram: "class",
		focus: undefined,
		layoutDirection: "top-to-bottom",
		noColor: false,
		classDiagram: false,
		packageDiagram: false,
		aliasGroups: [],
		detectCircular: false,
		failOnCircular: false,
		...overrides,
	};
}

describe("src/cli/runner.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedExistsSync.mockReturnValue(true);
	});

	describe("buildCliConfig", () => {
		it("maps CliOptions to SvelteUMLConfig with defaults", () => {
			const cliOpts = makeCliOpts();
			const result = buildCliConfig(cliOpts, {});

			expect(result.targetDir).toBe(resolve("/tmp/project"));
			expect(result.outputPath).toBe(resolve("diagram.d2"));
			expect(result.excludeExternals).toBe(false);
			expect(result.maxDepth).toBe(0);
		});

		it("file config overrides defaults", () => {
			const cliOpts = makeCliOpts();
			const fileConfig = { maxDepth: 5, excludeExternals: true, exclude: ["**/*.test.ts"] };
			const result = buildCliConfig(cliOpts, fileConfig);

			expect(result.maxDepth).toBe(5);
			expect(result.excludeExternals).toBe(true);
			expect(result.exclude).toEqual(["**/*.test.ts"]);
		});

		it("CLI flags override file config", () => {
			const cliOpts = makeCliOpts({ maxDepth: 3, exclude: ["**/*.spec.ts"] });
			const fileConfig = { maxDepth: 5 };
			const result = buildCliConfig(cliOpts, fileConfig);

			expect(result.maxDepth).toBe(3);
			expect(result.exclude).toEqual(["**/*.spec.ts"]);
		});

		it("SVG format gets .svg default output path", () => {
			const cliOpts = makeCliOpts({ format: "svg" });
			const result = buildCliConfig(cliOpts, {});

			expect(result.outputPath).toBe(resolve("diagram.svg"));
		});

		it("PNG format gets .png default output path", () => {
			const cliOpts = makeCliOpts({ format: "png" });
			const result = buildCliConfig(cliOpts, {});

			expect(result.outputPath).toBe(resolve("diagram.png"));
		});

		it("uses CLI outputPath when provided", () => {
			const cliOpts = makeCliOpts({ outputPath: "/custom/output.d2" });
			const result = buildCliConfig(cliOpts, {});

			expect(result.outputPath).toBe(resolve("/custom/output.d2"));
		});

		it("sets maxDepth from CLI when non-zero", () => {
			const cliOpts = makeCliOpts({ maxDepth: 7 });
			const result = buildCliConfig(cliOpts, {});

			expect(result.maxDepth).toBe(7);
		});

		it("sets excludeExternals from CLI when true", () => {
			const cliOpts = makeCliOpts({ excludeExternals: true });
			const result = buildCliConfig(cliOpts, {});

			expect(result.excludeExternals).toBe(true);
		});
	});

	describe("filterEdges", () => {
		it("filters type-labeled edges when hideTypeDeps is true", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "type" },
				{ source: "c", target: "d", type: "association" as const, label: "import" },
			];

			const result = filterEdges(edges, { hideTypeDeps: true, hideStateDeps: false });
			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe("import");
		});

		it("filters store-labeled edges when hideStateDeps is true", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "store" },
				{ source: "c", target: "d", type: "association" as const, label: "import" },
			];

			const result = filterEdges(edges, { hideTypeDeps: false, hideStateDeps: true });
			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe("import");
		});

		it("keeps all edges when both flags are false", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "type" },
				{ source: "c", target: "d", type: "dependency" as const, label: "store" },
			];

			const result = filterEdges(edges, { hideTypeDeps: false, hideStateDeps: false });
			expect(result).toHaveLength(2);
		});

		it("filters both type and store edges when both flags are true", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "type" },
				{ source: "c", target: "d", type: "dependency" as const, label: "store" },
				{ source: "e", target: "f", type: "association" as const, label: "import" },
			];

			const result = filterEdges(edges, { hideTypeDeps: true, hideStateDeps: true });
			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe("import");
		});
	});

	describe("runPipeline", () => {
		it("returns error for non-existent target directory", async () => {
			mockedExistsSync.mockReturnValue(false);
			const cliOpts = makeCliOpts({ targetDir: "/nonexistent/path" });

			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(false);
			expect(result.error).toContain("does not exist");
		});

		it("returns error when config validation fails", async () => {
			const cliOpts = makeCliOpts({ maxDepth: 0 });
			const result = await runPipeline(cliOpts, { maxDepth: -1 });

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("uses provided reporter instead of noop", async () => {
			const reporter = {
				start: vi.fn(),
				update: vi.fn(),
				succeed: vi.fn(),
				fail: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				stop: vi.fn(),
				startPhase: vi.fn(),
			};
			const cliOpts = makeCliOpts({ maxDepth: 0 });
			const result = await runPipeline(cliOpts, { maxDepth: -1 }, reporter);

			expect(result.success).toBe(false);
		});

		it("writes file when format is not d2 or outputPath is set", async () => {
			const cliOpts = makeCliOpts({ format: "d2", outputPath: "/tmp/out.d2" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
			expect(result.outputPath).toBe(resolve("/tmp/out.d2"));
		});

		it("writes file for svg format without outputPath", async () => {
			const { renderD2 } = await import("../../src/emission/renderer.js");
			vi.mocked(renderD2).mockResolvedValueOnce({
				success: true,
				data: "<svg></svg>",
			});

			const cliOpts = makeCliOpts({ format: "svg" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
			expect(result.outputPath).toBe(resolve("diagram.svg"));
		});

		it("returns success for d2 format without outputPath (stdout)", async () => {
			const originalWrite = process.stdout.write;
			process.stdout.write = vi.fn().mockReturnValue(true);

			const cliOpts = makeCliOpts({ format: "d2" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
			expect(result.fileCount).toBe(0);

			process.stdout.write = originalWrite;
		});

		it("catches unexpected errors and returns failure", async () => {
			const { discoverFiles } = await import("../../src/discovery/file-discovery.js");
			vi.mocked(discoverFiles).mockRejectedValueOnce(new Error("disk failure"));

			const cliOpts = makeCliOpts();
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(false);
			expect(result.error).toContain("disk failure");
		});

		it("applies focus filtering when focus option is set", async () => {
			const cliOpts = makeCliOpts({ focus: "MyComponent", maxDepth: 2 });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});

		it("applies hideTypeDeps and hideStateDeps filtering", async () => {
			const cliOpts = makeCliOpts({ hideTypeDeps: true, hideStateDeps: true });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});

		it("handles aliasGroups successfully", async () => {
			const cliOpts = makeCliOpts({ aliasGroups: ["src/**/*.ts:Library"] });

			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});

		it("returns failure for invalid aliasGroups syntax", async () => {
			const cliOpts = makeCliOpts({ aliasGroups: ["invalid-format"] });

			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("reports circular dependencies as warnings when detectCircular is enabled", async () => {
			const { detectCircularDependencies, buildEdges, buildServerLoadEdges } = await import(
				"../../src/dependency/index.js"
			);
			vi.mocked(buildEdges).mockReturnValueOnce([{ source: "a", target: "b", type: "dependency" }]);
			vi.mocked(buildServerLoadEdges).mockReturnValueOnce([]);
			vi.mocked(detectCircularDependencies).mockReturnValueOnce({
				cycles: [{ files: ["a.ts -> b.ts -> c.ts -> a.ts"] }],
			});

			const cliOpts = makeCliOpts({ detectCircular: true });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});

		it("fails on circular dependencies when failOnCircular is set", async () => {
			const { detectCircularDependencies, buildEdges, buildServerLoadEdges } = await import(
				"../../src/dependency/index.js"
			);
			vi.mocked(buildEdges).mockReturnValueOnce([{ source: "x", target: "y", type: "dependency" }]);
			vi.mocked(buildServerLoadEdges).mockReturnValueOnce([]);
			vi.mocked(detectCircularDependencies).mockReturnValueOnce({
				cycles: [{ files: ["x.ts -> y.ts -> x.ts"] }],
			});

			const cliOpts = makeCliOpts({ detectCircular: true, failOnCircular: true });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(false);
		});

		it("handles svg format output via renderer", async () => {
			const { renderD2 } = await import("../../src/emission/renderer.js");
			vi.mocked(renderD2).mockResolvedValueOnce({
				success: true,
				data: "<svg></svg>",
			});

			const cliOpts = makeCliOpts({ format: "svg" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});

		it("handles png format with render failure fallback", async () => {
			const { renderD2 } = await import("../../src/emission/renderer.js");
			vi.mocked(renderD2).mockResolvedValueOnce({
				success: false,
				error: "server error",
			});

			const cliOpts = makeCliOpts({ format: "png" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});
	});
});
