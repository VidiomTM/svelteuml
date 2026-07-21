import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../types/diagram.js";
import type { EdgeSet } from "../types/edge.js";
import type { EmissionResult } from "../types/pipeline.js";
import { renderClassDiagram } from "./class-diagram.js";
import { renderColorLegend, renderColorTheme } from "./color-theme.js";
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

	return {
		content: injectThemeBlock(content, opts),
		diagramKind: opts.kind,
	};
}

function injectThemeBlock(d2: string, opts: DiagramOptions): string {
	const insertions: string[] = [];

	const layout = renderLayoutDirective(opts.layoutDirection ?? "top-to-bottom");
	if (layout) insertions.push(layout);

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
