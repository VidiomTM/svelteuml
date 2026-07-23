import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../types/diagram.js";
import type { EdgeSet } from "../types/edge.js";
import type { EmissionResult } from "../types/pipeline.js";
import { renderClassDiagram } from "./class-diagram.js";
import { NODE_FONT_SIZE, NODE_RADIUS, renderColorLegend, renderColorTheme } from "./color-theme.js";
import { renderLayoutDirective } from "./layout-hints.js";
import { renderPackageDiagram } from "./package-diagram.js";

export function emitD2(
	symbols: SymbolTable,
	edges: EdgeSet,
	options?: DiagramOptions,
): EmissionResult {
	const opts = options ?? DEFAULT_DIAGRAM_OPTIONS;

	const content =
		opts.kind === "package"
			? renderPackageDiagram(symbols, edges, opts)
			: renderClassDiagram(symbols, edges, opts);

	let themed = injectThemeBlock(content, opts);
	if (opts.themeEdgeStroke) {
		// Glob applies the muted stroke to every edge; must follow the edges.
		themed += `\n(* -> *)[*].style.stroke: "${opts.themeEdgeStroke}"`;
	}

	return {
		content: themed,
		diagramKind: opts.kind,
	};
}

function injectThemeBlock(d2: string, opts: DiagramOptions): string {
	const insertions: string[] = [];

	const layout = renderLayoutDirective(opts.layoutDirection ?? "top-to-bottom");
	if (layout) insertions.push(layout);

	if (opts.themeBackground) {
		insertions.push(`style: { fill: "${opts.themeBackground}" }`);
		// Global node defaults so containers/packages without a stereotype class
		// still read as rounded surface cards (matches the per-stereotype classes).
		insertions.push(`**.style.border-radius: ${NODE_RADIUS}`);
		insertions.push(`**.style.font-size: ${NODE_FONT_SIZE}`);
	}

	if (opts.gridColumns && opts.gridColumns > 0) {
		insertions.push(`grid-columns: ${opts.gridColumns}`);
	}

	const theme = renderColorTheme(opts.stereotypeColors ?? {});
	if (theme) insertions.push(theme);

	const legend = renderColorLegend(opts.stereotypeColors ?? {});
	if (legend) insertions.push(legend);

	if (insertions.length === 0) return d2;

	const lines = d2.split("\n");
	// The rendered body opens with a `# <title>` comment; theme follows it.
	const insertAt = lines[0]?.startsWith("#") ? 1 : 0;
	lines.splice(insertAt, 0, ...insertions);
	return lines.join("\n");
}
