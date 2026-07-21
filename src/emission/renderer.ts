import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RenderResult {
	success: boolean;
	data?: string;
	error?: string;
}

export async function renderD2(
	source: string,
	format: "svg" | "png",
	timeoutMs = 15_000,
): Promise<RenderResult> {
	const dir = mkdtempSync(join(tmpdir(), "svelteuml-"));
	const inputPath = join(dir, `diagram.d2`);
	const outputPath = join(dir, `diagram.${format}`);

	try {
		writeFileSync(inputPath, source, "utf-8");
		await execFileAsync("d2", [inputPath, outputPath], { timeout: timeoutMs });
		const data = readFileSync(outputPath, format === "svg" ? "utf-8" : "base64");
		if (!data || data.length === 0) {
			return { success: false, error: "d2 produced empty output" };
		}
		return { success: true, data };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("ETIMEDOUT") || message.includes("timed out")) {
			return { success: false, error: "d2 render timed out" };
		}
		if ((err as NodeJS.ErrnoException).code === "ENOENT") {
			return {
				success: false,
				error:
					"d2 executable not found. Install d2 from https://d2lang.com and ensure it is on your PATH.",
			};
		}
		return { success: false, error: `d2 render failed: ${message}` };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}
