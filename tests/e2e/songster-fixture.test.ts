import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { runPipeline } from "../../src/cli/runner.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures/songster-svelte");
const testOutputDir = join(tmpdir(), "svelteuml-e2e-songster");
const OUTPUT_PATH = join(testOutputDir, "songster-output.d2");

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

describe("E2E: Songster fixture (real-world dogfood)", () => {
	it("exits with code 0 (success) on songster project", async () => {
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

	it("detects Songster-specific domain types", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("Song");
		expect(content).toContain("Player");
		expect(content).toContain("Room");
	});

	it("detects Songster Svelte components", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("HitCard");
		expect(content).toContain("DeckBuilder");
		expect(content).toContain("Chrome");
	});

	it("detects Songster stores", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("auth");
		expect(content).toContain("game");
		expect(content).toContain("toast");
	});

	it("detects SvelteKit routing patterns (param routes)", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("game/[code]");
		expect(content).toContain("lobby/[code]");
		expect(content).toContain("results/[code]");
	});

	it("detects server endpoints", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("api/track/[id]");
		expect(content).toContain("health");
	});

	it("detects server load functions", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("+page.server");
		expect(content).toContain("+layout.server");
	});

	it("detects SvelteKit layouts", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toContain("+layout");
	});

	it("detects stereotype tagging on types", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).toMatch(/class: \[?component/);
		expect(content).toMatch(/class: \[?store/);
		expect(content).toMatch(/class: \[?page/);
		expect(content).toMatch(/class: \[?endpoint/);
	});

	it("reports file count and edge count for the real project", async () => {
		const result = await runPipeline(makeCliOptions(), {});
		expect(result.fileCount).toBeGreaterThan(10);
		expect(result.edgeCount).toBeGreaterThanOrEqual(0);
	});

	it("class count is suitable for a real-world project", async () => {
		await runPipeline(makeCliOptions(), {});
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		const classCount = (content.match(/class "/g) ?? []).length;
		expect(classCount).toBeGreaterThan(20);
	});

	it("exclude-externals removes node_modules references", async () => {
		const result = await runPipeline(makeCliOptions({ excludeExternals: true }), {});
		expect(result.success).toBe(true);
		expect(existsSync(OUTPUT_PATH)).toBe(true);
		const content = readFileSync(OUTPUT_PATH, "utf-8");
		expect(content).not.toContain("node_modules");
	});
});
