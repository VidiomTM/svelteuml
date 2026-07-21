import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { runPipeline } from "../../src/cli/runner.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures/sveltekit-synthetic");
const testOutputDir = join(tmpdir(), "svelteuml-fixture-snapshot-tests");

function makeCliOptions(overrides: Partial<CliOptions> = {}): CliOptions {
	mkdirSync(testOutputDir, { recursive: true });
	return {
		subcommand: "generate",
		targetDir: FIXTURE_DIR,
		outputPath: join(testOutputDir, "snapshot-output.d2"),
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
		detectCircular: false,
		failOnCircular: false,
		classDiagram: false,
		packageDiagram: false,
		diagram: "class",
		focus: undefined,
		layoutDirection: "top-to-bottom",
		noColor: true,
		aliasGroups: [],
		...overrides,
	};
}

afterEach(() => {
	rmSync(testOutputDir, { recursive: true, force: true });
});

describe("E4.6 — Snapshot tests on fixture corpus (round-trip lock-in)", () => {
	describe("class diagram on sveltekit-synthetic fixture", () => {
		let classOutput: string;

		beforeAll(async () => {
			const opts = makeCliOptions({ diagram: "class" });
			const result = await runPipeline(opts, {});
			expect(result.success).toBe(true);
			classOutput = readFileSync(opts.outputPath ?? "", "utf-8");
		});

		it("produces valid D2 with # and direction:", () => {
			expect(classOutput).toContain("# ");
			expect(classOutput).toContain("direction:");
		});

		it("includes all expected component vertices", () => {
			expect(classOutput).toContain("Card");
			expect(classOutput).toContain("Header");
		});

		it("includes store vertices", () => {
			expect(classOutput).toContain("cart");
			expect(classOutput).toContain("products");
		});

		it("includes route vertices", () => {
			expect(classOutput).toContain("+page");
			expect(classOutput).toContain("+layout");
			expect(classOutput).toContain("+server");
		});

		it("snapshot locks class diagram output", () => {
			expect(classOutput).toMatchSnapshot();
		});
	});

	describe("package diagram on sveltekit-synthetic fixture", () => {
		let packageOutput: string;

		beforeAll(async () => {
			const result = await runPipeline(
				makeCliOptions({ diagram: "package", outputPath: join(testOutputDir, "pkg-snap.d2") }),
				{},
			);
			expect(result.success).toBe(true);
			packageOutput = readFileSync(join(testOutputDir, "pkg-snap.d2"), "utf-8");
		});

		it("produces valid D2 package diagram", () => {
			expect(packageOutput).toContain("# ");
			expect(packageOutput).toContain("direction:");
		});

		it("snapshot locks package diagram output", () => {
			expect(packageOutput).toMatchSnapshot();
		});
	});

	describe("round-trip determinism", () => {
		it("produces identical output on repeated runs", async () => {
			const opts = makeCliOptions({ diagram: "class" });
			const result1 = await runPipeline(opts, {});
			const output1 = readFileSync(opts.outputPath ?? "", "utf-8");

			const result2 = await runPipeline(
				{ ...opts, outputPath: join(testOutputDir, "run2.d2") },
				{},
			);
			const output2 = readFileSync(join(testOutputDir, "run2.d2"), "utf-8");

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(output1).toBe(output2);
		});
	});
});
