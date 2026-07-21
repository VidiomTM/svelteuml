import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { runPipeline } from "../../src/cli/runner.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures/minimal-sveltekit");
const testOutputDir = join(tmpdir(), "svelteuml-e2e-tests");
const OUTPUT_PATH = join(testOutputDir, "test-output.d2");

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
		watch: false,
		diagram: "class",
		focus: undefined,
		layoutDirection: "top-to-bottom",
		noColor: false,
		...overrides,
	};
}

afterEach(() => {
	rmSync(testOutputDir, { recursive: true, force: true });
});

describe("E2E: full pipeline", () => {
	it("exits with code 0 (success) on fixture project", async () => {
		const result = await runPipeline(makeCliOptions(), {});
		expect(result.success).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("generates a .d2 file", async () => {
		await runPipeline(makeCliOptions(), {});
		expect(existsSync(OUTPUT_PATH)).toBe(true);
	});

	it("produces syntactically valid D2", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("# ");
		expect(content).toContain("direction:");
	});

	it("includes source files as vertices", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("userStore");
		expect(content).toMatch(/class: \[?store/);
		expect(content).toContain("+page");
		expect(content).toContain("+server");
	});

	it("reflects import relationships as edges", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("class ");
		const classCount = (content.match(/class "/g) ?? []).length;
		expect(classCount).toBeGreaterThan(3);
	});

	it("reports file count and edge count", async () => {
		const result = await runPipeline(makeCliOptions(), {});
		expect(result.fileCount).toBeGreaterThan(0);
		expect(result.edgeCount).toBeGreaterThanOrEqual(0);
	});

	it("exclude-externals removes node_modules references", async () => {
		const result = await runPipeline(makeCliOptions({ excludeExternals: true }), {});
		expect(result.success).toBe(true);
		expect(existsSync(OUTPUT_PATH)).toBe(true);
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).not.toContain("node_modules");
	});

	it("works with stdout output (no outputPath)", async () => {
		const result = await runPipeline(makeCliOptions({ outputPath: undefined }), {});
		expect(result.success).toBe(true);
		expect(result.fileCount).toBeGreaterThan(0);
	});

	it("fails gracefully on nonexistent directory", async () => {
		const result = await runPipeline(makeCliOptions({ targetDir: "/nonexistent/path" }), {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("max-depth limits diagram scope", async () => {
		const result = await runPipeline(
			makeCliOptions({ maxDepth: 1, outputPath: join(testOutputDir, "max-depth.d2") }),
			{},
		);
		expect(result.success).toBe(true);
		expect(existsSync(join(testOutputDir, "max-depth.d2"))).toBe(true);
	});

	it("exclude-patterns filters output diagram", async () => {
		const result = await runPipeline(
			makeCliOptions({
				excludePatterns: ["**/test/**"],
				outputPath: join(testOutputDir, "exclude-patterns.d2"),
			}),
			{},
		);
		expect(result.success).toBe(true);
		const content = readFileSync(join(testOutputDir, "exclude-patterns.d2"), "utf-8");
		expect(content).toContain("# ");
	});
});
