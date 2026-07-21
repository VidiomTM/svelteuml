import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { runPipeline } from "../../src/cli/runner.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures/generated-large-5k");
const testOutputDir = join(tmpdir(), "svelteuml-benchmark-tests");
const OUTPUT_PATH = join(testOutputDir, "benchmark-output.d2");

function makeCliOptions(overrides: Partial<CliOptions> = {}): CliOptions {
	mkdirSync(testOutputDir, { recursive: true });
	return {
		subcommand: "generate",
		targetDir: FIXTURE_DIR,
		outputPath: OUTPUT_PATH,
		format: "d2",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		excludePatterns: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		detectCircular: false,
		failOnCircular: false,
		watch: false,
		classDiagram: false,
		packageDiagram: false,
		diagram: "class",
		focus: undefined,
		layoutDirection: "top-to-bottom",
		noColor: false,
		aliasGroups: [],
		...overrides,
	};
}

afterEach(() => {
	rmSync(testOutputDir, { recursive: true, force: true });
});

describe("E8.5 — Performance benchmark on a 5K-LOC project", () => {
	it("fixture has at least 5000 lines of source code", { timeout: 10_000 }, async () => {
		const { readdirSync, readFileSync: read } = await import("node:fs");
		const { resolve: res } = await import("node:path");

		function countLines(dir: string): number {
			let total = 0;
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const fullPath = res(dir, entry.name);
				if (entry.isDirectory()) {
					total += countLines(fullPath);
				} else if (
					entry.name.endsWith(".svelte") ||
					entry.name.endsWith(".ts") ||
					entry.name.endsWith(".js")
				) {
					const content = read(fullPath, "utf-8");
					total += content.split("\n").length;
				}
			}
			return total;
		}

		const totalLines = countLines(FIXTURE_DIR);
		expect(totalLines).toBeGreaterThanOrEqual(5000);
	});

	it("completes discovery phase in reasonable time", { timeout: 20_000 }, async () => {
		const { discoverFiles } = await import("../../src/discovery/file-discovery.js");

		const start = performance.now();
		const discovered = await discoverFiles(FIXTURE_DIR);
		const elapsed = performance.now() - start;

		const allFiles = [
			...discovered.svelte,
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];

		expect(allFiles.length).toBeGreaterThan(50);
		expect(elapsed).toBeLessThan(10_000);
	});

	it("completes parsing phase in reasonable time", { timeout: 60_000 }, async () => {
		const { discoverFiles } = await import("../../src/discovery/file-discovery.js");
		const { convertFiles } = await import("../../src/parsing/svelte-to-tsx.js");

		const discovered = await discoverFiles(FIXTURE_DIR);
		const plainFiles = [
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];

		const start = performance.now();
		const { results } = await convertFiles(discovered.svelte, plainFiles);
		const elapsed = performance.now() - start;

		const successful = results.filter((r) => r.success);
		expect(successful.length).toBeGreaterThan(50);
		expect(elapsed).toBeLessThan(30_000);
	});

	it("completes extraction phase in reasonable time", { timeout: 60_000 }, async () => {
		const { discoverFiles } = await import("../../src/discovery/file-discovery.js");
		const { loadSvelteConfig } = await import("../../src/discovery/svelte-config.js");
		const { loadTsConfig } = await import("../../src/discovery/tsconfig.js");
		const { convertFiles } = await import("../../src/parsing/svelte-to-tsx.js");
		const { buildParsingProject } = await import("../../src/parsing/ts-morph-project.js");
		const { SymbolExtractor } = await import("../../src/extraction/symbol-extractor.js");
		const { PipelineErrorHandler } = await import("../../src/pipeline/error-handler.js");

		const discovered = await discoverFiles(FIXTURE_DIR);
		const svelteConfig = await loadSvelteConfig(FIXTURE_DIR);
		const tsConfig = await loadTsConfig(FIXTURE_DIR);
		const aliases = { ...tsConfig.aliases, ...svelteConfig.aliases };
		const plainFiles = [
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];
		const { results: svelteResults } = await convertFiles(discovered.svelte, plainFiles);
		const successful = svelteResults.filter((r) => r.success);
		const plainFileEntries = successful
			.filter((r) => !r.sourcePath.endsWith(".svelte"))
			.map((r) => ({ path: r.virtualPath, content: r.tsxCode }));
		const project = buildParsingProject(successful, plainFileEntries, undefined, aliases);

		const errorHandler = new PipelineErrorHandler();
		const extractor = new SymbolExtractor(project, errorHandler, discovered.exportedFiles);

		const start = performance.now();
		const symbols = extractor.extract();
		const elapsed = performance.now() - start;

		expect(symbols.components.length).toBeGreaterThan(10);
		expect(symbols.classes.length).toBeGreaterThan(0);
		expect(symbols.functions.length).toBeGreaterThan(50);
		expect(elapsed).toBeLessThan(30_000);
	});

	it("completes full pipeline under 30 seconds", { timeout: 60_000 }, async () => {
		const start = performance.now();
		const result = await runPipeline(makeCliOptions(), {});
		const elapsed = performance.now() - start;

		expect(result.success).toBe(true);
		expect(result.fileCount).toBeGreaterThan(50);
		expect(elapsed).toBeLessThan(30_000);
	});

	it("generates valid D2 output for 5K-LOC project", { timeout: 60_000 }, async () => {
		const result = await runPipeline(makeCliOptions(), {});
		expect(result.success).toBe(true);

		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("# ");
		expect(content).toContain("direction:");
		const classCount = (content.match(/shape: class/g) ?? []).length;
		expect(classCount).toBeGreaterThan(20);
	});
});
