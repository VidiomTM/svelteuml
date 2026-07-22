import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readReadmeAnnotation } from "../../src/extraction/readme-annotations.js";

describe("readReadmeAnnotation", () => {
	let dir: string;

	beforeEach(() => {
		dir = join(os.tmpdir(), `readme-annotations-test-${Date.now()}`);
		mkdirSync(dir, { recursive: true });
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	const write = (content: string) => writeFileSync(join(dir, "README.md"), content);

	it("returns undefined when README.md is absent", () => {
		expect(readReadmeAnnotation(dir)).toBeUndefined();
	});

	it("parses the title tag", () => {
		write("# Docs\n<!-- @uml.title: Video Domain -->\n");
		expect(readReadmeAnnotation(dir)?.title).toBe("Video Domain");
	});

	it("parses the description tag", () => {
		write("<!-- @uml.description: Owns video rows and sync -->");
		expect(readReadmeAnnotation(dir)?.description).toBe("Owns video rows and sync");
	});

	it("parses the hide tag", () => {
		write("<!-- @uml.hide -->");
		expect(readReadmeAnnotation(dir)?.hide).toBe(true);
	});

	it("returns an empty object when no tags present", () => {
		write("# Just a heading, no tags");
		expect(readReadmeAnnotation(dir)).toEqual({});
	});
});
