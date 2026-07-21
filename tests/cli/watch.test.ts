import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { startWatcher } from "../../src/cli/watch.js";

let tempDir: string;

function makeCliOpts(overrides?: Partial<CliOptions>): CliOptions {
	return {
		subcommand: "watch",
		targetDir: tempDir,
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
		watch: true,
		diagram: "class",
		focus: undefined,
		layoutDirection: "top-to-bottom",
		noColor: false,
		...overrides,
	};
}

describe("startWatcher", () => {
	beforeEach(async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("returns a watcher with correct interface", () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		expect(typeof watcher.close).toBe("function");
		expect(typeof watcher.on).toBe("function");
		expect(watcher.ready).toBeInstanceOf(Promise);
		return watcher.close();
	});

	it("stops the watcher after close()", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		await expect(watcher.close()).resolves.toBeUndefined();
	});

	it("has an on method for change events", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		expect(typeof watcher.on).toBe("function");

		const handler = vi.fn();
		watcher.on("change", handler);

		await watcher.ready;

		const testFile = join(tempDir, "test.svelte");
		await writeFile(testFile, "<script>let x = 1;</script>");

		// Poll until handler is called or timeout (chokidar event timing is unpredictable)
		const deadline = Date.now() + 5000;
		while (!handler.mock.calls.length && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		expect(handler).toHaveBeenCalled();
		await watcher.close();
	});

	it("debounces multiple rapid file changes", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		const handler = vi.fn();
		watcher.on("change", handler);

		await watcher.ready;

		await writeFile(join(tempDir, "a.svelte"), "<script>let a = 1;</script>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await writeFile(join(tempDir, "b.svelte"), "<script>let b = 2;</script>");

		// Poll until handler is called or timeout
		const deadline = Date.now() + 5000;
		while (!handler.mock.calls.length && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		expect(handler).toHaveBeenCalledTimes(1);
		await watcher.close();
	});

	it("clears pending debounce timer on close", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});

		await writeFile(join(tempDir, "c.svelte"), "<script>let c = 3;</script>");

		await new Promise((resolve) => setTimeout(resolve, 50));
		await expect(watcher.close()).resolves.toBeUndefined();
	});
});
