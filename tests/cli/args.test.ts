import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs", () => {
	it("parses generate subcommand with target directory", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.subcommand).toBe("generate");
		expect(result.targetDir).toBe("./src");
	});

	it("parses watch subcommand with target directory", () => {
		const result = parseArgs(["watch", "./src"]);
		expect(result.subcommand).toBe("watch");
		expect(result.targetDir).toBe("./src");
	});

	it("defaults format to d2 for generate", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.format).toBe("d2");
	});

	it("defaults format to d2 for watch", () => {
		const result = parseArgs(["watch", "./src"]);
		expect(result.format).toBe("d2");
	});

	it("parses --format svg on generate", () => {
		const result = parseArgs(["generate", "./src", "--format", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses --format svg on watch", () => {
		const result = parseArgs(["watch", "./src", "--format", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses --format png", () => {
		const result = parseArgs(["generate", "./src", "--format", "png"]);
		expect(result.format).toBe("png");
	});

	it("parses --output flag", () => {
		const result = parseArgs(["generate", "./src", "--output", "diagram.puml"]);
		expect(result.outputPath).toBe("diagram.puml");
	});

	it("defaults outputPath to undefined", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.outputPath).toBeUndefined();
	});

	it("defaults excludeExternals to false", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.excludeExternals).toBe(false);
	});

	it("parses --exclude-externals", () => {
		const result = parseArgs(["generate", "./src", "--exclude-externals"]);
		expect(result.excludeExternals).toBe(true);
	});

	it("defaults maxDepth to 0", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.maxDepth).toBe(0);
	});

	it("parses --max-depth", () => {
		const result = parseArgs(["generate", "./src", "--max-depth", "5"]);
		expect(result.maxDepth).toBe(5);
	});

	it("parses --exclude with multiple patterns", () => {
		const result = parseArgs([
			"generate",
			"./src",
			"--exclude",
			"node_modules",
			"dist",
			".svelte-kit",
		]);
		expect(result.exclude).toEqual(["node_modules", "dist", ".svelte-kit"]);
	});

	it("defaults exclude to empty array", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.exclude).toEqual([]);
	});

	it("parses --include with multiple patterns", () => {
		const result = parseArgs(["generate", "./src", "--include", "src/**/*.svelte", "src/**/*.ts"]);
		expect(result.include).toEqual(["src/**/*.svelte", "src/**/*.ts"]);
	});

	it("defaults include to empty array", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.include).toEqual([]);
	});

	it("parses --exclude-patterns", () => {
		const result = parseArgs([
			"generate",
			"./src",
			"--exclude-patterns",
			"**/*.test.ts",
			"**/*.spec.ts",
		]);
		expect(result.excludePatterns).toEqual(["**/*.test.ts", "**/*.spec.ts"]);
	});

	it("defaults excludePatterns to empty array", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.excludePatterns).toEqual([]);
	});

	it("parses --hide-type-deps", () => {
		const result = parseArgs(["generate", "./src", "--hide-type-deps"]);
		expect(result.hideTypeDeps).toBe(true);
	});

	it("parses --hide-state-deps", () => {
		const result = parseArgs(["generate", "./src", "--hide-state-deps"]);
		expect(result.hideStateDeps).toBe(true);
	});

	it("defaults hideTypeDeps and hideStateDeps to false", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.hideTypeDeps).toBe(false);
		expect(result.hideStateDeps).toBe(false);
	});

	it("parses --quiet", () => {
		const result = parseArgs(["generate", "./src", "--quiet"]);
		expect(result.quiet).toBe(true);
	});

	it("parses --verbose", () => {
		const result = parseArgs(["generate", "./src", "--verbose"]);
		expect(result.verbose).toBe(true);
	});

	it("defaults quiet and verbose to false", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.quiet).toBe(false);
		expect(result.verbose).toBe(false);
	});

	it("parses short flag -o for output", () => {
		const result = parseArgs(["generate", "./src", "-o", "out.puml"]);
		expect(result.outputPath).toBe("out.puml");
	});

	it("parses short flag -f for format", () => {
		const result = parseArgs(["generate", "./src", "-f", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses short flag -q for quiet", () => {
		const result = parseArgs(["generate", "./src", "-q"]);
		expect(result.quiet).toBe(true);
	});

	it("parses short flag -e for exclude", () => {
		const result = parseArgs(["generate", "./src", "-e", "node_modules", "dist"]);
		expect(result.exclude).toEqual(["node_modules", "dist"]);
	});

	it("throws on missing subcommand", () => {
		expect(() => parseArgs([])).toThrow();
	});

	it("throws on missing target directory for generate", () => {
		expect(() => parseArgs(["generate"])).toThrow();
	});

	it("throws on invalid format", () => {
		expect(() => parseArgs(["generate", "./src", "--format", "json"])).toThrow();
	});

	it("throws on negative max-depth", () => {
		expect(() => parseArgs(["generate", "./src", "--max-depth", "-1"])).toThrow();
	});

	it("combined flags test for generate", () => {
		const result = parseArgs([
			"generate",
			"./project",
			"--output",
			"out.svg",
			"--format",
			"svg",
			"--exclude-externals",
			"--max-depth",
			"3",
			"--exclude",
			"node_modules",
			"--hide-type-deps",
			"--hide-state-deps",
			"--quiet",
			"--verbose",
		]);
		expect(result.subcommand).toBe("generate");
		expect(result.targetDir).toBe("./project");
		expect(result.outputPath).toBe("out.svg");
		expect(result.format).toBe("svg");
		expect(result.excludeExternals).toBe(true);
		expect(result.maxDepth).toBe(3);
		expect(result.exclude).toEqual(["node_modules"]);
		expect(result.hideTypeDeps).toBe(true);
		expect(result.hideStateDeps).toBe(true);
		expect(result.quiet).toBe(true);
		expect(result.verbose).toBe(true);
	});

	it("combined flags test for watch", () => {
		const result = parseArgs([
			"watch",
			"./project",
			"--output",
			"out.svg",
			"--format",
			"svg",
			"--exclude-externals",
			"--max-depth",
			"3",
			"--exclude",
			"node_modules",
			"--hide-type-deps",
			"--hide-state-deps",
			"--quiet",
		]);
		expect(result.subcommand).toBe("watch");
		expect(result.targetDir).toBe("./project");
		expect(result.outputPath).toBe("out.svg");
		expect(result.format).toBe("svg");
		expect(result.excludeExternals).toBe(true);
		expect(result.maxDepth).toBe(3);
		expect(result.hideTypeDeps).toBe(true);
		expect(result.hideStateDeps).toBe(true);
		expect(result.quiet).toBe(true);
	});

	it("defaults diagram to class", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.diagram).toBe("class");
	});

	it("parses --diagram package", () => {
		const result = parseArgs(["generate", "./src", "--diagram", "package"]);
		expect(result.diagram).toBe("package");
	});

	it("parses --diagram class", () => {
		const result = parseArgs(["generate", "./src", "-d", "class"]);
		expect(result.diagram).toBe("class");
	});

	it("throws on invalid diagram kind", () => {
		expect(() => parseArgs(["generate", "./src", "--diagram", "flowchart"])).toThrow();
	});

	it("parses --class-diagram boolean flag", () => {
		const result = parseArgs(["generate", "./src", "--class-diagram"]);
		expect(result.classDiagram).toBe(true);
		expect(result.diagram).toBe("class");
	});

	it("parses --package-diagram boolean flag", () => {
		const result = parseArgs(["generate", "./src", "--package-diagram"]);
		expect(result.packageDiagram).toBe(true);
		expect(result.diagram).toBe("package");
	});

	it("defaults classDiagram and packageDiagram to false", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.classDiagram).toBe(false);
		expect(result.packageDiagram).toBe(false);
		expect(result.diagram).toBe("class");
	});

	it("--class-diagram overrides --diagram package", () => {
		const result = parseArgs(["generate", "./src", "--diagram", "package", "--class-diagram"]);
		expect(result.classDiagram).toBe(true);
		expect(result.packageDiagram).toBe(false);
		expect(result.diagram).toBe("class");
	});

	it("--package-diagram overrides --diagram class", () => {
		const result = parseArgs(["generate", "./src", "--diagram", "class", "--package-diagram"]);
		expect(result.classDiagram).toBe(false);
		expect(result.packageDiagram).toBe(true);
		expect(result.diagram).toBe("package");
	});

	it("parses --focus flag", () => {
		const result = parseArgs(["generate", "./src", "--focus", "MyComponent"]);
		expect(result.focus).toBe("MyComponent");
	});

	it("defaults focus to undefined", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.focus).toBeUndefined();
	});

	it("parses --layout-direction", () => {
		const result = parseArgs(["generate", "./src", "--layout-direction", "left-to-right"]);
		expect(result.layoutDirection).toBe("left-to-right");
	});

	it("defaults layoutDirection to top-to-bottom", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.layoutDirection).toBe("top-to-bottom");
	});

	it("throws on invalid layout direction", () => {
		expect(() => parseArgs(["generate", "./src", "--layout-direction", "circular"])).toThrow();
	});

	it("parses --disable-colors flag", () => {
		const result = parseArgs(["generate", "./src", "--disable-colors"]);
		expect(result.noColor).toBe(true);
	});

	it("defaults noColor to false", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.noColor).toBe(false);
	});

	it("parses single --alias-group", () => {
		const result = parseArgs(["generate", "./src", "--alias-group", "src/**/*.ts:Library"]);
		expect(result.aliasGroups).toEqual(["src/**/*.ts:Library"]);
	});

	it("parses multiple --alias-group options", () => {
		const result = parseArgs([
			"generate",
			"./src",
			"--alias-group",
			"src/**/*.ts:Library",
			"--alias-group",
			"src/**/*.svelte:Components",
		]);
		expect(result.aliasGroups).toEqual(["src/**/*.ts:Library", "src/**/*.svelte:Components"]);
	});

	it("defaults aliasGroups to empty array", () => {
		const result = parseArgs(["generate", "./src"]);
		expect(result.aliasGroups).toEqual([]);
	});

	it("parses from real process.argv format (node + script prefix)", () => {
		const argv = ["node", "/usr/bin/svelteuml", "generate", "./src", "--verbose"];
		const result = parseArgs(argv);
		expect(result.subcommand).toBe("generate");
		expect(result.targetDir).toBe("./src");
		expect(result.verbose).toBe(true);
	});

	it("parses from real process.argv with multiple flags", () => {
		const argv = [
			"node",
			"dist/cli.js",
			"generate",
			"./my-project",
			"--output",
			"diagram.puml",
			"--format",
			"svg",
			"--exclude-externals",
			"--verbose",
		];
		const result = parseArgs(argv);
		expect(result.subcommand).toBe("generate");
		expect(result.targetDir).toBe("./my-project");
		expect(result.outputPath).toBe("diagram.puml");
		expect(result.format).toBe("svg");
		expect(result.excludeExternals).toBe(true);
		expect(result.verbose).toBe(true);
	});

	it("parses from Windows process.argv format", () => {
		const argv = [
			"C:\\Program Files\\nodejs\\node.exe",
			"C:\\project\\dist\\cli.js",
			"generate",
			".\\src",
			"--verbose",
		];
		const result = parseArgs(argv);
		expect(result.subcommand).toBe("generate");
		expect(result.targetDir).toBe(".\\src");
		expect(result.verbose).toBe(true);
	});
});
