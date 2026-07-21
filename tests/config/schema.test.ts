import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SvelteUMLConfigInput } from "../../src/config/schema.js";
import {
	getDefaultConfig,
	mergeConfigs,
	safeValidateConfig,
	validateConfig,
} from "../../src/config/schema.js";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
}));

import { existsSync } from "node:fs";

const mockedExistsSync = vi.mocked(existsSync);

describe("src/config/schema.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedExistsSync.mockReturnValue(true);
	});

	describe("validateConfig", () => {
		it("resolves a valid config with defaults", () => {
			const input: SvelteUMLConfigInput = { targetDir: "/tmp/project" };
			const result = validateConfig(input);

			expect(result.targetDir).toBe(resolve("/tmp/project"));
			expect(result.outputPath).toBe(resolve("diagram.d2"));
			expect(result.aliasOverrides).toEqual({});
			expect(result.exclude).toEqual([]);
			expect(result.include).toEqual([]);
			expect(result.maxDepth).toBe(0);
			expect(result.excludeExternals).toBe(false);
		});

		it("resolves outputPath when provided", () => {
			const input: SvelteUMLConfigInput = {
				targetDir: "/tmp/project",
				outputPath: "out/diagram.d2",
			};
			const result = validateConfig(input);
			expect(result.outputPath).toBe(resolve("out/diagram.d2"));
		});

		it("applies aliasOverrides from input", () => {
			const input: SvelteUMLConfigInput = {
				targetDir: "/tmp/project",
				aliasOverrides: { $lib: "src/lib", $components: "src/components" },
			};
			const result = validateConfig(input);
			expect(result.aliasOverrides).toEqual({
				$lib: "src/lib",
				$components: "src/components",
			});
		});

		it("applies exclude, include, maxDepth, excludeExternals from input", () => {
			const input: SvelteUMLConfigInput = {
				targetDir: "/tmp/project",
				exclude: ["**/dist/**"],
				include: ["**/*.svelte"],
				maxDepth: 5,
				excludeExternals: true,
			};
			const result = validateConfig(input);
			expect(result.exclude).toEqual(["**/dist/**"]);
			expect(result.include).toEqual(["**/*.svelte"]);
			expect(result.maxDepth).toBe(5);
			expect(result.excludeExternals).toBe(true);
		});

		it("throws when targetDir does not exist", () => {
			mockedExistsSync.mockReturnValue(false);
			const input: SvelteUMLConfigInput = { targetDir: "/nonexistent/path" };
			expect(() => validateConfig(input)).toThrow();
		});

		it("throws for non-object input", () => {
			expect(() => validateConfig(null)).toThrow();
			expect(() => validateConfig("string")).toThrow();
			expect(() => validateConfig(42)).toThrow();
		});

		it("throws when maxDepth is negative", () => {
			const input: SvelteUMLConfigInput = {
				targetDir: "/tmp/project",
				maxDepth: -1,
			};
			expect(() => validateConfig(input)).toThrow();
		});

		it("throws when maxDepth is a float", () => {
			const input: SvelteUMLConfigInput = {
				targetDir: "/tmp/project",
				maxDepth: 3.5,
			};
			expect(() => validateConfig(input)).toThrow();
		});

		it("throws when excludeExternals is not a boolean", () => {
			const input = {
				targetDir: "/tmp/project",
				excludeExternals: "yes",
			} as unknown as SvelteUMLConfigInput;
			expect(() => validateConfig(input)).toThrow();
		});

		it("throws when aliasOverrides has non-string values", () => {
			const input = {
				targetDir: "/tmp/project",
				aliasOverrides: { $lib: 123 },
			} as unknown as SvelteUMLConfigInput;
			expect(() => validateConfig(input)).toThrow();
		});
	});

	describe("safeValidateConfig", () => {
		it("returns success with data for valid input", () => {
			const input: SvelteUMLConfigInput = { targetDir: "/tmp/project" };
			const result = safeValidateConfig(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.targetDir).toBe(resolve("/tmp/project"));
				expect(result.data.outputPath).toBe(resolve("diagram.d2"));
			}
		});

		it("returns failure with ZodError for invalid input", () => {
			mockedExistsSync.mockReturnValue(false);
			const input: SvelteUMLConfigInput = { targetDir: "/nonexistent" };
			const result = safeValidateConfig(input);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toBeDefined();
				expect(result.errors.issues).toBeInstanceOf(Array);
				expect(result.errors.issues.length).toBeGreaterThan(0);
			}
		});

		it("returns failure for null input", () => {
			const result = safeValidateConfig(null);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors.issues.length).toBeGreaterThan(0);
			}
		});

		it("returns failure for wrong types", () => {
			const result = safeValidateConfig({ targetDir: 42 });
			expect(result.success).toBe(false);
		});
	});

	describe("getDefaultConfig", () => {
		it("returns a complete default config input", () => {
			const defaults = getDefaultConfig("/tmp/project");

			expect(defaults.targetDir).toBe(resolve("/tmp/project"));
			expect(defaults.outputPath).toBe("diagram.d2");
			expect(defaults.aliasOverrides).toEqual({});
			expect(defaults.exclude).toEqual([]);
			expect(defaults.include).toEqual([]);
			expect(defaults.maxDepth).toBe(0);
			expect(defaults.excludeExternals).toBe(false);
		});

		it("resolves targetDir to absolute path", () => {
			const defaults = getDefaultConfig("relative/path");
			expect(defaults.targetDir).toBe(resolve("relative/path"));
		});
	});

	describe("mergeConfigs", () => {
		it("CLI args override file config for scalar fields", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				targetDir: "/file/project",
				outputPath: "file.puml",
				maxDepth: 3,
				excludeExternals: false,
			};
			const cliArgs: Partial<SvelteUMLConfigInput> = {
				targetDir: "/cli/project",
				outputPath: "cli.puml",
				maxDepth: 7,
				excludeExternals: true,
			};

			const merged = mergeConfigs(fileConfig, cliArgs);

			expect(merged.targetDir).toBe("/cli/project");
			expect(merged.outputPath).toBe("cli.puml");
			expect(merged.maxDepth).toBe(7);
			expect(merged.excludeExternals).toBe(true);
		});

		it("file config fills in when CLI args are absent", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				targetDir: "/file/project",
				outputPath: "file.puml",
				maxDepth: 3,
				excludeExternals: true,
			};
			const cliArgs: Partial<SvelteUMLConfigInput> = {};

			const merged = mergeConfigs(fileConfig, cliArgs);

			expect(merged.targetDir).toBe("/file/project");
			expect(merged.outputPath).toBe("file.puml");
			expect(merged.maxDepth).toBe(3);
			expect(merged.excludeExternals).toBe(true);
		});

		it("falls back to process.cwd() when both targetDir are absent", () => {
			const merged = mergeConfigs({}, {});
			expect(merged.targetDir).toBe(process.cwd());
		});

		it("falls back to default outputPath when both are absent", () => {
			const merged = mergeConfigs({}, {});
			expect(merged.outputPath).toBe("diagram.d2");
		});

		it("falls back to maxDepth 0 when both are absent", () => {
			const merged = mergeConfigs({}, {});
			expect(merged.maxDepth).toBe(0);
		});

		it("falls back to excludeExternals false when both are absent", () => {
			const merged = mergeConfigs({}, {});
			expect(merged.excludeExternals).toBe(false);
		});

		it("merges aliasOverrides with CLI taking precedence on conflicts", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				aliasOverrides: { $lib: "src/lib", $shared: "src/shared-file" },
			};
			const cliArgs: Partial<SvelteUMLConfigInput> = {
				aliasOverrides: { $lib: "src/lib-cli", $custom: "src/custom" },
			};

			const merged = mergeConfigs(fileConfig, cliArgs);

			expect(merged.aliasOverrides).toEqual({
				$lib: "src/lib-cli",
				$shared: "src/shared-file",
				$custom: "src/custom",
			});
		});

		it("uses file aliasOverrides when CLI provides none", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				aliasOverrides: { $lib: "src/lib" },
			};
			const merged = mergeConfigs(fileConfig, {});
			expect(merged.aliasOverrides).toEqual({ $lib: "src/lib" });
		});

		it("concatenates exclude arrays from both sources", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				exclude: ["**/dist/**", "**/build/**"],
			};
			const cliArgs: Partial<SvelteUMLConfigInput> = {
				exclude: ["**/coverage/**"],
			};

			const merged = mergeConfigs(fileConfig, cliArgs);
			expect(merged.exclude).toEqual(["**/dist/**", "**/build/**", "**/coverage/**"]);
		});

		it("concatenates include arrays from both sources", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				include: ["**/*.svelte"],
			};
			const cliArgs: Partial<SvelteUMLConfigInput> = {
				include: ["**/*.ts"],
			};

			const merged = mergeConfigs(fileConfig, cliArgs);
			expect(merged.include).toEqual(["**/*.svelte", "**/*.ts"]);
		});

		it("uses file exclude/include when CLI provides none", () => {
			const fileConfig: Partial<SvelteUMLConfigInput> = {
				exclude: ["**/dist/**"],
				include: ["**/*.svelte"],
			};
			const merged = mergeConfigs(fileConfig, {});
			expect(merged.exclude).toEqual(["**/dist/**"]);
			expect(merged.include).toEqual(["**/*.svelte"]);
		});

		it("uses CLI exclude/include when file provides none", () => {
			const cliArgs: Partial<SvelteUMLConfigInput> = {
				exclude: ["**/coverage/**"],
				include: ["**/*.js"],
			};
			const merged = mergeConfigs({}, cliArgs);
			expect(merged.exclude).toEqual(["**/coverage/**"]);
			expect(merged.include).toEqual(["**/*.js"]);
		});

		it("defaults exclude/include to empty arrays when both absent", () => {
			const merged = mergeConfigs({}, {});
			expect(merged.exclude).toEqual([]);
			expect(merged.include).toEqual([]);
		});
	});
});
