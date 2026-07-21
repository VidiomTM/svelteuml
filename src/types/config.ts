/** Core types for SvelteUML pipeline configuration and discovery results. */

import type { GroupConfig } from "./diagram.js";

/** Maps alias specifiers (e.g. "$lib") to their resolved absolute paths. */
export type AliasMap = Record<string, string>;

/** Categorised file lists returned by the discovery engine. */
export interface DiscoveredFiles {
	svelte: string[];
	typescript: string[];
	javascript: string[];
	svelteModules: string[];
	exportedFiles?: Set<string>;
}

/** Result of parsing svelte.config.js for path aliases. */
export interface SvelteConfigResult {
	/** Resolved alias map from kit.alias / vite.resolve.alias. */
	aliases: AliasMap;
	/** Whether the config file was found and parsed successfully. */
	found: boolean;
	/** Path to the parsed config file, if found. */
	configPath?: string;
}

/** Result of parsing .svelte-kit/tsconfig.json for compiler options. */
export interface TsConfigResult {
	/** Alias map derived from compilerOptions.paths. */
	aliases: AliasMap;
	/** Base URL from compilerOptions.baseUrl. */
	baseUrl: string;
	/** Whether the tsconfig file was found and parsed successfully. */
	found: boolean;
	/** Path to the parsed tsconfig file, if found. */
	configPath?: string;
}

/** Complete pipeline configuration — the single source of truth. */
export interface SvelteUMLConfig {
	/** Absolute path to the target SvelteKit project root. */
	targetDir: string;
	/** Absolute path for the generated D2 output file. */
	outputPath: string;
	/** Custom alias overrides (merged over discovered aliases). */
	aliasOverrides: AliasMap;
	/** Glob patterns to exclude from discovery. */
	exclude: string[];
	/** Glob patterns to include (additions to defaults). */
	include: string[];
	/** Maximum depth for dependency traversal (0 = unlimited). */
	maxDepth: number;
	/** Whether to truncate at node_modules boundaries. */
	excludeExternals: boolean;
	/** Group definitions for organizing symbols by file path pattern. */
	groups: GroupConfig[];
}

/** Supported output formats for diagram generation. */
export type OutputFormat = "d2" | "svg" | "png";
