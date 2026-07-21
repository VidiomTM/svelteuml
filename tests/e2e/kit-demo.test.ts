import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { runPipeline } from "../../src/cli/runner.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures/kit-template-default");
const testOutputDir = join(tmpdir(), "svelteuml-kit-demo-e2e");
const OUTPUT_PATH = join(testOutputDir, "kit-demo-output.d2");

function makeCliOptions(overrides: Partial<CliOptions> = {}): CliOptions {
	mkdirSync(testOutputDir, { recursive: true });
	return {
		targetDir: FIXTURE_DIR,
		outputPath: OUTPUT_PATH,
		format: "d2",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		watch: false,
		...overrides,
	};
}

afterEach(() => {
	rmSync(testOutputDir, { recursive: true, force: true });
});

describe("E2E: kit-template-default fixture", () => {
	it("exits with code 0 (success)", async () => {
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

	it("discovers page routes", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("+page");
		expect(content).toContain("+layout");
	});

	it("discovers about route", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("about");
	});

	it("discovers Counter component", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("Counter");
		expect(content).toMatch(/class: \[?component/);
	});

	it("discovers Header component", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("Header");
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

	it("works with stdout output", async () => {
		const result = await runPipeline(makeCliOptions({ outputPath: undefined }), {});
		expect(result.success).toBe(true);
		expect(result.fileCount).toBeGreaterThan(0);
	});
});
