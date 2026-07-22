import type {
	ClassSymbol,
	PropSymbol,
	RouteSymbol,
	StoreSymbol,
	SymbolTable,
} from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import type { EdgeSet, EdgeType } from "../types/edge.js";
import { normalizeFilePath } from "../utils/path.js";
import { sanitizeStereotype } from "./color-theme.js";
import { d2str, renderClassRef } from "./d2-utils.js";
import { routeStereotype } from "./route-utils.js";
import { applyFocusFilter, filterHiddenComponents } from "./tag-processor.js";

function emptySymbolTable(): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		events: [],
		exports: [],
		routes: [],
		components: [],
	};
}

function collectGroups(symbols: SymbolTable): Map<string, SymbolTable> {
	const groups = new Map<string, SymbolTable>();

	pushToGroup(symbols.classes, groups, (t) => t.classes);
	pushToGroup(symbols.stores, groups, (t) => t.stores);
	pushToGroup(symbols.functions, groups, (t) => t.functions);
	pushToGroup(symbols.props, groups, (t) => t.props);
	pushToGroup(symbols.events, groups, (t) => t.events);
	pushToGroup(symbols.exports, groups, (t) => t.exports);
	pushToGroup(symbols.routes ?? [], groups, (t) => t.routes);
	pushToGroup(symbols.components ?? [], groups, (t) => t.components);

	return groups;
}

function pushToGroup<T extends { group?: string }>(
	items: T[],
	groups: Map<string, SymbolTable>,
	getList: (t: SymbolTable) => T[],
): void {
	for (const item of items) {
		if (!item.group) continue;
		let g = groups.get(item.group);
		if (!g) {
			g = emptySymbolTable();
			groups.set(item.group, g);
		}
		getList(g).push(item);
	}
}

interface RenderContext {
	options: DiagramOptions;
	declared: Set<string>;
	/** Maps a node name to its fully-qualified D2 id (container-prefixed). */
	nodeIds: Map<string, string>;
	prefix: string;
}

function renderGroupedSymbols(lines: string[], symbols: SymbolTable, ctx: RenderContext): void {
	const groups = collectGroups(symbols);
	if (groups.size === 0) return;

	for (const [groupName, groupSymbols] of groups) {
		lines.push(`${sanitizeId(groupName)}: {`);
		lines.push(`  label: "${d2str(groupName)}"`);
		const groupCtx: RenderContext = { ...ctx, prefix: `${sanitizeId(groupName)}.` };
		renderSymbolsBlock(lines, groupSymbols, groupCtx, "  ");
		lines.push("}");
	}
}

function registerNode(ctx: RenderContext, name: string, filePath?: string): string {
	const id = `${ctx.prefix}${sanitizeId(name)}`;
	ctx.nodeIds.set(name, id);
	// Also override the file-path key so edges resolved by path point at the
	// container-prefixed id, not the non-prefixed placeholder from seedNameMap.
	if (filePath) ctx.nodeIds.set(normalizeFilePath(filePath, ctx.options.targetDir), id);
	return sanitizeId(name);
}

function renderSymbolsBlock(
	lines: string[],
	symbols: SymbolTable,
	ctx: RenderContext,
	indent: string,
): void {
	for (const cls of [...symbols.classes].sort((a, b) => a.name.localeCompare(b.name))) {
		if (ctx.declared.has(cls.name)) continue;
		ctx.declared.add(cls.name);
		renderClass(lines, cls, ctx, indent);
	}

	if (ctx.options.showStores) {
		for (const store of [...symbols.stores].sort((a, b) => a.name.localeCompare(b.name))) {
			if (ctx.declared.has(store.name)) continue;
			ctx.declared.add(store.name);
			renderStore(lines, store, ctx, indent);
		}
	}

	if (ctx.options.showProps) {
		const propMap = groupPropsByComponent(symbols.props);
		for (const comp of [...symbols.components].sort((a, b) => a.name.localeCompare(b.name))) {
			if (ctx.declared.has(comp.name)) continue;
			ctx.declared.add(comp.name);
			const key = `${comp.filePath}::${comp.name}`;
			renderComponent(lines, comp.name, propMap.get(key) ?? [], ctx, indent, comp.filePath);
		}
	}

	for (const fn of [...symbols.functions].sort((a, b) => a.name.localeCompare(b.name))) {
		if (ctx.declared.has(fn.name)) continue;
		ctx.declared.add(fn.name);
		const local = registerNode(ctx, fn.name, fn.filePath);
		const stereotypes = fn.isExported ? ["function", "Exported"] : ["function"];
		lines.push(`${indent}${local}: {`);
		lines.push(`${indent}  shape: class`);
		lines.push(`${indent}  label: "${d2str(fn.name)}"`);
		lines.push(`${indent}  class: ${renderClassRef(stereotypes)}`);
		lines.push(`${indent}}`);
	}

	for (const route of [...(symbols.routes ?? [])].sort((a, b) => a.name.localeCompare(b.name))) {
		if (ctx.declared.has(route.name)) continue;
		ctx.declared.add(route.name);
		renderRoute(lines, route, ctx, indent);
	}
}

function hasGroup(sym: { group?: string }): boolean {
	return sym.group !== undefined && sym.group !== "";
}

function isUngrouped<T extends { group?: string }>(sym: T): boolean {
	return !hasGroup(sym);
}

export function renderClassDiagram(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: DiagramOptions,
): string {
	const lines: string[] = [];
	const title = options.title ?? "Diagram";
	lines.push(`# ${title}`);

	const filteredComponents = filterHiddenComponents(symbols.components ?? []);
	const focusedComponents = applyFocusFilter(filteredComponents);

	const filteredComponentSet = new Set(filteredComponents);
	const hiddenNames = new Set(
		symbols.components.filter((c) => !filteredComponentSet.has(c)).map((c) => c.name),
	);

	const ctx: RenderContext = {
		options,
		declared: new Set<string>(),
		nodeIds: new Map<string, string>(),
		prefix: "",
	};

	const withFocus = { ...symbols, components: focusedComponents };
	seedNameMap(ctx, withFocus, options.targetDir);

	const groups = collectGroups(symbols);
	if (groups.size > 0) {
		renderGroupedSymbols(lines, symbols, ctx);
	}

	const ungrouped: SymbolTable = {
		classes: symbols.classes.filter(isUngrouped),
		functions: symbols.functions.filter(isUngrouped),
		stores: symbols.stores.filter(isUngrouped),
		props: symbols.props,
		events: symbols.events,
		exports: symbols.exports,
		routes: (symbols.routes ?? []).filter(isUngrouped),
		components: (symbols.components ?? []).filter(isUngrouped),
	};
	renderSymbolsBlock(lines, ungrouped, ctx, "");

	const sortedEdges = [...edgeSet.edges].sort((a, b) => {
		const bySource = a.source.localeCompare(b.source);
		if (bySource !== 0) return bySource;
		const byTarget = a.target.localeCompare(b.target);
		if (byTarget !== 0) return byTarget;
		return a.type.localeCompare(b.type);
	});
	for (const edge of sortedEdges) {
		if (hiddenNames.has(edge.source) || hiddenNames.has(edge.target)) continue;
		renderEdge(lines, edge, ctx.nodeIds, options.targetDir);
	}

	return lines.join("\n");
}

// Pre-populate name/filepath lookups so edges can resolve endpoints by either.
function seedNameMap(ctx: RenderContext, symbols: SymbolTable, targetDir?: string): void {
	const add = (name: string, filePath: string) => {
		ctx.nodeIds.set(name, sanitizeId(name));
		ctx.nodeIds.set(normalizeFilePath(filePath, targetDir), sanitizeId(name));
	};
	for (const cls of symbols.classes) add(cls.name, cls.filePath);
	for (const store of symbols.stores) add(store.name, store.filePath);
	for (const fn of symbols.functions) add(fn.name, fn.filePath);
	for (const route of symbols.routes ?? []) add(route.name, route.filePath);
	for (const comp of symbols.components) add(comp.name, comp.filePath);
}

function classStereotypes(cls: ClassSymbol): string[] {
	const base: string[] =
		cls.kind === "interface"
			? ["interface"]
			: cls.kind === "abstract-class"
				? ["abstract_class"]
				: [];
	if (cls.isExported) base.push("Exported");
	return base;
}

function renderClass(lines: string[], cls: ClassSymbol, ctx: RenderContext, indent: string): void {
	const local = registerNode(ctx, cls.name, cls.filePath);
	lines.push(`${indent}${local}: {`);
	lines.push(`${indent}  shape: class`);
	lines.push(`${indent}  label: "${d2str(cls.name)}"`);
	const stereotypes = classStereotypes(cls);
	if (stereotypes.length > 0) lines.push(`${indent}  class: ${renderClassRef(stereotypes)}`);
	if (ctx.options.showMembers) {
		for (const member of cls.members) {
			if (member.kind === "method" && !ctx.options.showMethods) continue;
			const vis = mapVisibility(member.visibility, ctx.options.showVisibility);
			if (member.kind === "property") {
				lines.push(`${indent}  "${d2str(`${vis}${member.name}`)}": "${d2str(member.type)}"`);
			} else {
				const params = member.parameters?.map((p) => `${p.name}: ${p.type}`).join(", ") ?? "";
				const ret = member.returnType ?? member.type;
				lines.push(`${indent}  "${d2str(`${vis}${member.name}(${params})`)}": "${d2str(ret)}"`);
			}
		}
	}
	lines.push(`${indent}}`);
}

function renderStore(
	lines: string[],
	store: StoreSymbol,
	ctx: RenderContext,
	indent: string,
): void {
	const local = registerNode(ctx, store.name, store.filePath);
	const stereotype =
		store.runeKind === "state" ? "state" : store.runeKind === "derived" ? "derived" : "store";
	const stereotypes = store.isExported ? [stereotype, "Exported"] : [stereotype];
	lines.push(`${indent}${local}: {`);
	lines.push(`${indent}  shape: class`);
	lines.push(`${indent}  label: "${d2str(store.name)}"`);
	lines.push(`${indent}  class: ${renderClassRef(stereotypes)}`);
	lines.push(`${indent}  "storeType": "${d2str(store.storeType)}"`);
	lines.push(`${indent}  "valueType": "${d2str(store.valueType)}"`);
	lines.push(`${indent}}`);
}

function renderComponent(
	lines: string[],
	name: string,
	props: PropSymbol[],
	ctx: RenderContext,
	indent: string,
	filePath?: string,
): void {
	const local = registerNode(ctx, name, filePath);
	lines.push(`${indent}${local}: {`);
	lines.push(`${indent}  shape: class`);
	lines.push(`${indent}  label: "${d2str(name)}"`);
	lines.push(`${indent}  class: [component]`);
	if (ctx.options.showMembers) {
		for (const prop of props) {
			const suffix = prop.isRequired ? "" : "?";
			lines.push(`${indent}  "${d2str(`+ ${prop.name}${suffix}`)}": "${d2str(prop.type)}"`);
		}
	}
	lines.push(`${indent}}`);
}

function renderRoute(
	lines: string[],
	route: RouteSymbol,
	ctx: RenderContext,
	indent: string,
): void {
	const local = registerNode(ctx, route.name, route.filePath);
	const stereotype = sanitizeStereotype(routeStereotype(route));
	lines.push(`${indent}${local}: {`);
	lines.push(`${indent}  shape: class`);
	lines.push(`${indent}  label: "${d2str(route.name)}"`);
	lines.push(`${indent}  class: ${renderClassRef([stereotype])}`);
	lines.push(`${indent}  "path": "${d2str(route.routeSegment.raw)}"`);
	for (const param of route.routeSegment.params) {
		const matcherSuffix = param.matcher ? `=${param.matcher}` : "";
		lines.push(`${indent}  "${d2str(`${param.kind} ${param.name}${matcherSuffix}`)}": ""`);
	}
	for (const group of route.routeSegment.groups) {
		lines.push(`${indent}  "group: ${group}": ""`);
	}
	lines.push(`${indent}}`);
}

interface EdgeStyle {
	label?: string;
	dash: number;
}

function renderEdge(
	lines: string[],
	edge: { source: string; target: string; type: EdgeType; label?: string },
	nodeIds: Map<string, string>,
	targetDir?: string,
): void {
	const { from, to } = orientEdge(edge);
	const style = mapEdge(edge.type);
	const label = edge.label ?? style.label;
	const normalizedFrom = normalizeFilePath(from, targetDir);
	const normalizedTo = normalizeFilePath(to, targetDir);
	const fromId = nodeIds.get(normalizedFrom) ?? sanitizeId(normalizedFrom);
	const toId = nodeIds.get(normalizedTo) ?? sanitizeId(normalizedTo);
	const labelPart = label ? `: "${d2str(label)}"` : "";
	lines.push(`${fromId} -> ${toId}${labelPart} { style.stroke-dash: ${style.dash} }`);
}

function orientEdge(edge: { source: string; target: string; type: EdgeType }): {
	from: string;
	to: string;
} {
	if (edge.type === "extends") {
		return { from: edge.target, to: edge.source };
	}
	return { from: edge.source, to: edge.target };
}

function mapEdge(type: EdgeType): EdgeStyle {
	switch (type) {
		case "extends":
			return { label: "extends", dash: 0 };
		case "implements":
			return { label: "implements", dash: 3 };
		case "composition":
			return { label: "composition", dash: 0 };
		case "aggregation":
			return { label: "aggregation", dash: 0 };
		case "dependency":
		case "state_dependency":
		case "event":
		case "slot":
		case "server_load":
			return { dash: 3 };
		case "association":
		case "prop_flow":
		case "component_usage":
			return { dash: 0 };
	}
}

function mapVisibility(vis: string, show: boolean): string {
	if (!show) return "";
	switch (vis) {
		case "private":
			return "- ";
		case "protected":
			return "# ";
		default:
			return "+ ";
	}
}

function sanitizeId(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

function groupPropsByComponent(props: PropSymbol[]): Map<string, PropSymbol[]> {
	const map = new Map<string, PropSymbol[]>();
	for (const prop of props) {
		const key = `${prop.filePath}::${prop.componentName}`;
		let list = map.get(key);
		if (!list) {
			list = [];
			map.set(key, list);
		}
		list.push(prop);
	}
	return map;
}
