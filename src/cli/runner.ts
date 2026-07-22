import { existsSync, writeFileSync } from "node:fs";
import type { SvelteUMLConfigInput } from "../config/schema.js";
import { mergeConfigs, validateConfig } from "../config/schema.js";
import {
	buildEdges,
	buildServerLoadEdges,
	detectCircularDependencies,
	scanImports,
	trackPropFlows,
	trackStoreSubscriptions,
} from "../dependency/index.js";
import { trackReactiveDependencies } from "../dependency/reactive-tracker.js";
import { discoverFiles } from "../discovery/file-discovery.js";
import { loadSvelteConfig } from "../discovery/svelte-config.js";
import { loadTsConfig } from "../discovery/tsconfig.js";
import { assignGroups, parseAliasGroups, validateGroups } from "../emission/alias.js";
import { emitD2 } from "../emission/d2-emitter.js";
import {
	filterByExcludePatterns,
	filterEdgesByScope,
	filterSymbolsByScope,
	resolveFocusScope,
	resolveGlobalScope,
} from "../emission/focus.js";
import { renderD2 } from "../emission/renderer.js";
import { getTheme } from "../emission/themes.js";
import { SymbolExtractor } from "../extraction/symbol-extractor.js";
import { convertFiles } from "../parsing/svelte-to-tsx.js";
import { buildParsingProject } from "../parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../pipeline/error-handler.js";
import type { OutputFormat } from "../types/config.js";
import type { DiagramOptions } from "../types/diagram.js";
import { DEFAULT_DIAGRAM_OPTIONS, DEFAULT_STEREOTYPE_COLORS } from "../types/diagram.js";
import type { Edge } from "../types/edge.js";
import { createEdgeSet } from "../types/edge.js";
import type { SvelteUMLConfig } from "../types/index.js";
import type { CliOptions } from "./args.js";
import type { ProgressReporter } from "./progress.js";

export interface RunResult {
	success: boolean;
	outputPath?: string;
	error?: string;
	fileCount?: number;
	edgeCount?: number;
}

const FORMAT_DEFAULTS: Record<OutputFormat, string> = {
	d2: "diagram.d2",
	svg: "diagram.svg",
	png: "diagram.png",
};

function getDefaultOutputPath(format: OutputFormat): string {
	return FORMAT_DEFAULTS[format];
}

export function filterEdges(
	edges: Edge[],
	options: { hideTypeDeps: boolean; hideStateDeps: boolean },
): Edge[] {
	return edges.filter((edge) => {
		if (options.hideTypeDeps && edge.label === "type") return false;
		if (options.hideStateDeps && edge.label === "store") return false;
		if (options.hideStateDeps && edge.label?.includes("<<store-subscription>>")) return false;
		return true;
	});
}

export function buildCliConfig(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
): SvelteUMLConfig {
	const outputPath = cliOpts.outputPath ?? getDefaultOutputPath(cliOpts.format);

	const cliMergeArgs: Partial<SvelteUMLConfigInput> = {
		targetDir: cliOpts.targetDir,
		outputPath,
	};
	if (cliOpts.exclude.length > 0) cliMergeArgs.exclude = cliOpts.exclude;
	if (cliOpts.maxDepth !== 0) cliMergeArgs.maxDepth = cliOpts.maxDepth;
	if (cliOpts.excludeExternals) cliMergeArgs.excludeExternals = cliOpts.excludeExternals;

	const merged = mergeConfigs(fileConfig as Partial<SvelteUMLConfigInput>, cliMergeArgs);

	return validateConfig(merged);
}

export async function runPipeline(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
	reporter?: ProgressReporter,
): Promise<RunResult> {
	const noopReporter: ProgressReporter = {
		start() {},
		update() {},
		succeed() {},
		fail() {},
		warn() {},
		info() {},
		stop() {},
		startPhase() {},
	};
	const r = reporter ?? noopReporter;

	if (!existsSync(cliOpts.targetDir)) {
		return { success: false, error: `Target directory does not exist: ${cliOpts.targetDir}` };
	}

	try {
		let config: SvelteUMLConfig;
		try {
			config = buildCliConfig(cliOpts, fileConfig);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return { success: false, error: message };
		}

		r.startPhase("discovery", 0);
		const discovered = await discoverFiles(config.targetDir, {
			include: config.include,
			exclude: config.exclude,
		});

		const allFiles = [
			...discovered.svelte,
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];
		r.succeed(`Discovered ${allFiles.length} files`);

		const svelteConfig = await loadSvelteConfig(config.targetDir);
		const tsConfig = await loadTsConfig(config.targetDir);

		const aliases: Record<string, string> = {
			...tsConfig.aliases,
			...svelteConfig.aliases,
			...config.aliasOverrides,
		};

		r.startPhase("parsing", allFiles.length);
		const plainFiles = [
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];
		const { results: svelteResults, parseResults } = await convertFiles(
			discovered.svelte,
			plainFiles,
		);
		r.succeed(`Parsed ${parseResults.length} files`);

		const successfulResults = svelteResults.filter((res) => res.success);

		const plainFileEntries: Array<{ path: string; content: string }> = [];
		for (const result of successfulResults) {
			if (!result.sourcePath.endsWith(".svelte")) {
				plainFileEntries.push({ path: result.virtualPath, content: result.tsxCode });
			}
		}

		const parsingProject = buildParsingProject(
			successfulResults,
			plainFileEntries,
			config,
			aliases,
		);

		const errorHandler = new PipelineErrorHandler(cliOpts.verbose);

		for (const pr of parseResults) {
			if (!pr.success && pr.error) {
				errorHandler.addError({ file: pr.sourceFile, phase: "parsing", message: pr.error.message });
			}
		}

		r.startPhase("extraction", 0);
		const extractor = new SymbolExtractor(parsingProject, errorHandler, discovered.exportedFiles);
		const symbols = extractor.extract();
		r.succeed("Symbols extracted");

		r.startPhase("resolution", 0);
		const imports = scanImports(parsingProject, aliases, {
			excludeExternals: config.excludeExternals,
		});
		const reactiveSymbols = symbols.stores.filter((s) => s.runeKind);
		const stateDeps = trackReactiveDependencies(parsingProject.getProject(), reactiveSymbols);
		const storeSubs = trackStoreSubscriptions(parsingProject, symbols.stores);
		const allStateDeps = [...stateDeps, ...storeSubs];

		const tsxContents = new Map<string, string>();
		for (const [originalPath, sf] of parsingProject.getAllSourceFiles()) {
			if (originalPath.endsWith(".svelte.tsx") && !originalPath.includes("node_modules")) {
				const originalSveltePath = originalPath.replace(/\.tsx$/, "");
				tsxContents.set(originalSveltePath, sf.getText());
			}
		}
		const propFlows = trackPropFlows(tsxContents, imports, symbols);

		let edges = buildEdges(imports, symbols, allStateDeps, propFlows);
		const serverLoadEdges = buildServerLoadEdges(symbols, parsingProject);
		edges.push(...serverLoadEdges);

		edges = filterEdges(edges, {
			hideTypeDeps: cliOpts.hideTypeDeps,
			hideStateDeps: cliOpts.hideStateDeps,
		});

		const circularResult = edges.length > 0 ? detectCircularDependencies(edges) : { cycles: [] };

		if (cliOpts.detectCircular && circularResult.cycles.length > 0) {
			for (const cycle of circularResult.cycles) {
				r.warn(`Circular dependency: ${cycle.files.join(" -> ")}`);
			}
			r.warn(
				`Found ${circularResult.cycles.length} circular dependenc${circularResult.cycles.length === 1 ? "y" : "ies"}`,
			);
			if (cliOpts.failOnCircular) {
				return {
					success: false,
					error: `Circular dependencies detected (${circularResult.cycles.length})`,
					fileCount: allFiles.length,
					edgeCount: edges.length,
				};
			}
		}

		const edgeSet = createEdgeSet(edges);
		r.succeed(`Resolved ${edges.length} dependencies`);

		r.startPhase("emission", 0);
		const theme = cliOpts.theme ? getTheme(cliOpts.theme) : undefined;
		const diagramOpts: DiagramOptions = {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: cliOpts.diagram,
			layoutDirection: cliOpts.layoutDirection,
			stereotypeColors: cliOpts.noColor
				? {}
				: (theme?.stereotypeColors ?? DEFAULT_STEREOTYPE_COLORS),
			targetDir: config.targetDir,
			collapseMembers: cliOpts.collapseMembers,
			...(cliOpts.gridColumns ? { gridColumns: cliOpts.gridColumns } : {}),
			...(theme ? { themeBackground: theme.background, themeEdgeStroke: theme.edgeStroke } : {}),
			...(config.groups.length > 0 ? { groups: config.groups } : {}),
		};

		let emissionSymbols = symbols;
		let emissionEdges = edgeSet;

		if (cliOpts.aliasGroups.length > 0) {
			const groups = parseAliasGroups(cliOpts.aliasGroups);
			const validationErrors = validateGroups(groups);
			if (validationErrors.length > 0) {
				return {
					success: false,
					error: `Alias group validation errors:\n${validationErrors.join("\n")}`,
				};
			}
			emissionSymbols = assignGroups(emissionSymbols, groups);
		}

		if (cliOpts.focus) {
			const scope = resolveFocusScope(symbols, edgeSet, {
				focusNode: cliOpts.focus,
				depth: cliOpts.maxDepth > 0 ? cliOpts.maxDepth : 1,
			});
			emissionSymbols = filterSymbolsByScope(symbols, scope);
			const filteredEdges = filterEdgesByScope(edgeSet.edges, scope);
			emissionEdges = createEdgeSet(filteredEdges);
		} else if (cliOpts.maxDepth > 0) {
			const scope = resolveGlobalScope(symbols, edgeSet, cliOpts.maxDepth);
			emissionSymbols = filterSymbolsByScope(symbols, scope);
			const filteredEdges = filterEdgesByScope(edgeSet.edges, scope);
			emissionEdges = createEdgeSet(filteredEdges);
		}

		if (cliOpts.excludePatterns.length > 0) {
			const filtered = filterByExcludePatterns(
				emissionSymbols,
				emissionEdges,
				cliOpts.excludePatterns,
			);
			emissionSymbols = filtered.symbols;
			emissionEdges = filtered.edges;
		}

		const emission = emitD2(emissionSymbols, emissionEdges, diagramOpts);
		r.succeed("Diagram generated");

		const errorSummary = errorHandler.getSummary();
		if (errorSummary) r.warn(errorSummary);

		if (cliOpts.format === "d2" && !cliOpts.outputPath) {
			process.stdout.write(emission.content);
			return {
				success: true,
				fileCount: allFiles.length,
				edgeCount: edges.length,
			};
		}

		if (cliOpts.format === "svg" || cliOpts.format === "png") {
			r.startPhase("rendering", 0);
			const renderResult = await renderD2(emission.content, cliOpts.format);
			if (renderResult.success && renderResult.data) {
				const encoding = cliOpts.format === "png" ? "base64" : "utf-8";
				writeFileSync(config.outputPath, renderResult.data, encoding);
				r.succeed(`Rendered ${cliOpts.format.toUpperCase()} to ${config.outputPath}`);
				return {
					success: true,
					outputPath: config.outputPath,
					fileCount: allFiles.length,
					edgeCount: edges.length,
				};
			}

			r.warn(renderResult.error ?? "Render failed, falling back to D2 source output");
			const fallbackPath = config.outputPath.replace(/\.(svg|png)$/, ".d2");
			writeFileSync(fallbackPath, emission.content, "utf-8");
			return {
				success: true,
				outputPath: fallbackPath,
				fileCount: allFiles.length,
				edgeCount: edges.length,
			};
		}

		writeFileSync(config.outputPath, emission.content, "utf-8");

		return {
			success: true,
			outputPath: config.outputPath,
			fileCount: allFiles.length,
			edgeCount: edges.length,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		r.fail(message);
		return { success: false, error: message };
	}
}
