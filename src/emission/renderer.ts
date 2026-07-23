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
		// elk gives clean orthogonal routing + even spacing; pad adds breathing
		// room; sketch off keeps lines crisp (hand-drawn wobble reads as sloppy,
		// not polished). Colors/shapes are set in the D2 source, not a d2 theme.
		await execFileAsync(
			"d2",
			["--layout=elk", "--pad=48", "--sketch=false", inputPath, outputPath],
			{ timeout: timeoutMs },
		);
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
		const errno = (typeof err === "object" && err !== null ? err : {}) as NodeJS.ErrnoException;
		// Only a spawn ENOENT means the d2 binary is missing. A readFileSync
		// ENOENT (syscall "open") means d2 ran but produced no output file.
		if (errno.code === "ENOENT" && errno.syscall?.startsWith("spawn")) {
			return {
				success: false,
				error:
					"d2 executable not found. Install d2 from https://d2lang.com and ensure it is on your PATH.",
			};
		}
		if (errno.code === "ENOENT") {
			return { success: false, error: "d2 ran but produced no output file" };
		}
		return { success: false, error: `d2 render failed: ${message}` };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}
