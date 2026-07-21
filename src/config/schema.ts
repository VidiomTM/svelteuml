import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { SvelteUMLConfig } from "../types/index.js";

const GroupConfigSchema = z.object({
	pattern: z.string().min(1),
	name: z.string().min(1),
});

const SvelteUMLConfigSchema = z.object({
	targetDir: z
		.string()
		.refine((val) => existsSync(val), {
			message: "Target directory does not exist",
		})
		.transform((val) => resolve(val)),
	outputPath: z
		.string()
		.default("diagram.d2")
		.transform((val) => resolve(val)),
	aliasOverrides: z.record(z.string(), z.string()).default({}),
	exclude: z.array(z.string()).default([]),
	include: z.array(z.string()).default([]),
	maxDepth: z.number().int().min(0).default(0),
	excludeExternals: z.boolean().default(false),
	groups: z.array(GroupConfigSchema).default([]),
});

export type SvelteUMLConfigInput = z.input<typeof SvelteUMLConfigSchema>;

export function validateConfig(input: unknown): SvelteUMLConfig {
	return SvelteUMLConfigSchema.parse(input);
}

export function safeValidateConfig(input: unknown):
	| {
			success: true;
			data: SvelteUMLConfig;
	  }
	| {
			success: false;
			errors: z.ZodError;
	  } {
	const result = SvelteUMLConfigSchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

export function getDefaultConfig(targetDir: string): SvelteUMLConfigInput {
	return {
		targetDir: resolve(targetDir),
		outputPath: "diagram.d2",
		aliasOverrides: {},
		exclude: [],
		include: [],
		maxDepth: 0,
		excludeExternals: false,
		groups: [],
	};
}

export function mergeConfigs(
	fileConfig: Partial<SvelteUMLConfigInput>,
	cliArgs: Partial<SvelteUMLConfigInput>,
): SvelteUMLConfigInput {
	return {
		targetDir: cliArgs.targetDir ?? fileConfig.targetDir ?? process.cwd(),
		outputPath: cliArgs.outputPath ?? fileConfig.outputPath ?? "diagram.d2",
		aliasOverrides: {
			...(fileConfig.aliasOverrides ?? {}),
			...(cliArgs.aliasOverrides ?? {}),
		},
		exclude: [...(fileConfig.exclude ?? []), ...(cliArgs.exclude ?? [])],
		include: [...(fileConfig.include ?? []), ...(cliArgs.include ?? [])],
		maxDepth: cliArgs.maxDepth ?? fileConfig.maxDepth ?? 0,
		excludeExternals: cliArgs.excludeExternals ?? fileConfig.excludeExternals ?? false,
		groups: fileConfig.groups ?? [],
	};
}
