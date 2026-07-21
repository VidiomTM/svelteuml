import { Command } from "commander";
import type { OutputFormat } from "../types/config.js";
import type { DiagramKind, LayoutDirection } from "../types/diagram.js";

export interface CliOptions {
	subcommand: "generate" | "watch";
	targetDir: string;
	outputPath: string | undefined;
	format: OutputFormat;
	excludeExternals: boolean;
	maxDepth: number;
	include: string[];
	exclude: string[];
	excludePatterns: string[];
	hideTypeDeps: boolean;
	hideStateDeps: boolean;
	detectCircular: boolean;
	failOnCircular: boolean;
	quiet: boolean;
	verbose: boolean;
	watch: boolean;
	classDiagram: boolean;
	packageDiagram: boolean;
	diagram: DiagramKind;
	focus: string | undefined;
	layoutDirection: LayoutDirection;
	noColor: boolean;
	aliasGroups: string[];
}

const VALID_FORMATS: readonly OutputFormat[] = ["d2", "svg", "png"];
const VALID_DIAGRAM_KINDS: readonly DiagramKind[] = ["class", "package"];
const VALID_LAYOUT_DIRECTIONS: readonly LayoutDirection[] = [
	"top-to-bottom",
	"left-to-right",
	"bottom-to-top",
	"right-to-left",
];

function parseFormat(value: string): OutputFormat {
	if (!VALID_FORMATS.includes(value as OutputFormat)) {
		throw new Error(`Invalid format: "${value}". Must be one of: ${VALID_FORMATS.join(", ")}`);
	}
	return value as OutputFormat;
}

function parseDiagramKind(value: string): DiagramKind {
	if (!VALID_DIAGRAM_KINDS.includes(value as DiagramKind)) {
		throw new Error(
			`Invalid diagram kind: "${value}". Must be one of: ${VALID_DIAGRAM_KINDS.join(", ")}`,
		);
	}
	return value as DiagramKind;
}

function parseLayoutDirection(value: string): LayoutDirection {
	if (!VALID_LAYOUT_DIRECTIONS.includes(value as LayoutDirection)) {
		throw new Error(
			`Invalid layout direction: "${value}". Must be one of: ${VALID_LAYOUT_DIRECTIONS.join(", ")}`,
		);
	}
	return value as LayoutDirection;
}

function diagramKindFromFlags(
	classDiagram: boolean,
	packageDiagram: boolean,
	fallback: DiagramKind,
): DiagramKind {
	if (classDiagram && !packageDiagram) return "class";
	if (packageDiagram && !classDiagram) return "package";
	return fallback;
}

function parseMaxDepth(value: string): number {
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n < 0) {
		throw new Error(`--max-depth must be a non-negative integer, got: "${value}"`);
	}
	return n;
}

function addSharedOptions(cmd: Command): Command {
	return cmd
		.option("-o, --output <path>", "output file path")
		.option("-f, --format <type>", "output format (d2, svg, png)", parseFormat, "d2")
		.option("--exclude-externals", "exclude external dependencies", false)
		.option("--max-depth <n>", "max dependency traversal depth (0 = unlimited)", parseMaxDepth, 0)
		.option("--include [glob...]", "glob patterns to include in discovery", [])
		.option("-e, --exclude [glob...]", "glob patterns to exclude from discovery", [])
		.option("--exclude-patterns [glob...]", "glob patterns to exclude from output diagram", [])
		.option("--hide-type-deps", "hide TypeScript type dependencies", false)
		.option("--hide-state-deps", "hide Svelte store/state dependencies", false)
		.option("-d, --diagram <kind>", "diagram kind (class, package)", parseDiagramKind, "class")
		.option("--focus <name>", "focus on a specific node and its neighbourhood")
		.option("--layout-direction <dir>", "layout direction", parseLayoutDirection, "top-to-bottom")
		.option("--class-diagram", "generate a class diagram (default)", false)
		.option("--package-diagram", "generate a package diagram", false)
		.option(
			"--alias-group <value>",
			"group symbols matching glob pattern into a named package (repeatable, format: PATTERN:NAME)",
			(val: string, prev: string[]) => [...prev, val],
			[] as string[],
		)
		.option("--disable-colors", "disable stereotype color theming", false)
		.option("-q, --quiet", "suppress all output", false)
		.option("--verbose", "show verbose output", false)
		.option("--detect-circular", "detect and report circular dependencies", false)
		.option("--fail-on-circular", "exit with error code on circular dependencies", false);
}

function toCliOptions(
	subcommand: "generate" | "watch",
	targetDir: string,
	opts: Record<string, unknown>,
): CliOptions {
	const classDiagram = opts.classDiagram as boolean;
	const packageDiagram = opts.packageDiagram as boolean;
	const diagramKind = diagramKindFromFlags(
		classDiagram,
		packageDiagram,
		opts.diagram as DiagramKind,
	);

	return {
		subcommand,
		targetDir,
		outputPath: opts.output as string | undefined,
		format: opts.format as OutputFormat,
		excludeExternals: opts.excludeExternals as boolean,
		maxDepth: opts.maxDepth as number,
		include: (opts.include as string[] | undefined) ?? [],
		exclude: (opts.exclude as string[] | undefined) ?? [],
		excludePatterns: (opts.excludePatterns as string[] | undefined) ?? [],
		hideTypeDeps: opts.hideTypeDeps as boolean,
		hideStateDeps: opts.hideStateDeps as boolean,
		detectCircular: opts.detectCircular as boolean,
		failOnCircular: opts.failOnCircular as boolean,
		classDiagram,
		packageDiagram,
		diagram: diagramKind,
		focus: opts.focus as string | undefined,
		layoutDirection: opts.layoutDirection as LayoutDirection,
		noColor: opts.disableColors as boolean,
		aliasGroups: (opts.aliasGroup as string[] | undefined) ?? [],
		watch: true,
		quiet: opts.quiet as boolean,
		verbose: opts.verbose as boolean,
	};
}

export function parseArgs(argv: string[]): CliOptions {
	let result: CliOptions | undefined;

	const program = new Command().name("svelteuml").version("1.0.0").exitOverride();

	const generateCmd = program
		.command("generate")
		.description("Generate a D2 diagram from a SvelteKit project");
	generateCmd.argument("<target-directory>", "path to the SvelteKit project root");
	addSharedOptions(generateCmd);
	generateCmd.action((targetDir: string, opts: Record<string, unknown>) => {
		result = toCliOptions("generate", targetDir, opts);
	});

	const watchCmd = program
		.command("watch")
		.description("Watch files and regenerate diagram on change");
	watchCmd.argument("<target-directory>", "path to the SvelteKit project root");
	addSharedOptions(watchCmd);
	watchCmd.action((targetDir: string, opts: Record<string, unknown>) => {
		result = toCliOptions("watch", targetDir, opts);
	});

	program.parse(stripNodeArgv(argv), { from: "user" });

	if (!result) {
		throw new Error("Expected a subcommand: generate or watch");
	}

	return result;
}

function stripNodeArgv(argv: string[]): string[] {
	// If argv looks like process.argv (node binary + script path), strip first 2
	if (argv.length >= 2 && /(?:^|[\\/])node(?:\d+)?(?:\.exe)?$/i.test(argv[0] ?? "")) {
		return argv.slice(2);
	}
	return argv;
}
