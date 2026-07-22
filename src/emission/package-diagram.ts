import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import type { EdgeSet } from "../types/edge.js";
import { normalizeFilePath } from "../utils/path.js";
import { d2str, renderClassRef } from "./d2-utils.js";
import { getGroupForFile } from "./groups.js";
import { routeStereotype } from "./route-utils.js";

interface PackageMember {
	name: string;
	stereotypes: string[];
}

export function renderPackageDiagram(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: DiagramOptions,
): string {
	const lines: string[] = [];
	const title = options.title ?? "Package Diagram";
	lines.push(`# ${title}`);

	const packages = buildPackages(symbols, options);

	const sortedPackageKeys = [...packages.keys()].sort((a, b) => a.localeCompare(b));
	for (const pkg of sortedPackageKeys) {
		const members = packages.get(pkg) ?? new Map<string, PackageMember>();
		const sortedMembers = [...members.values()].sort((a, b) => a.name.localeCompare(b.name));
		lines.push(`${sanitizeId(pkg)}: {`);
		lines.push(`  label: "${d2str(pkg)}"`);
		if (!options.collapseMembers) {
			for (const member of sortedMembers) {
				const ref = renderClassRef(member.stereotypes);
				lines.push(
					ref ? `  "${d2str(member.name)}": { class: ${ref} }` : `  "${d2str(member.name)}"`,
				);
			}
		}
		lines.push("}");
	}

	const edgeWeights = new Map<string, { source: string; target: string; weight: number }>();
	const groups = options.groups ?? [];
	for (const edge of edgeSet.edges) {
		const normalizedSource = normalizeFilePath(edge.source, options.targetDir);
		const normalizedTarget = normalizeFilePath(edge.target, options.targetDir);
		const sourcePkg = getGroupForFile(normalizedSource, groups) ?? extractPackage(normalizedSource);
		const targetPkg = getGroupForFile(normalizedTarget, groups) ?? extractPackage(normalizedTarget);
		if (!(sourcePkg && targetPkg) || sourcePkg === targetPkg) continue;
		const key = `${sourcePkg}|${targetPkg}`;
		const existing = edgeWeights.get(key);
		if (existing) {
			existing.weight++;
		} else {
			edgeWeights.set(key, { source: sourcePkg, target: targetPkg, weight: 1 });
		}
	}

	for (const { source, target, weight } of edgeWeights.values()) {
		lines.push(
			`${sanitizeId(source)} -> ${sanitizeId(target)}: "${weight}" { style.stroke-dash: 3 }`,
		);
	}

	return lines.join("\n");
}

function buildPackages(
	symbols: SymbolTable,
	options: DiagramOptions,
): Map<string, Map<string, PackageMember>> {
	const packages = new Map<string, Map<string, PackageMember>>();
	const groups = options.groups ?? [];

	const addEntry = (filePath: string, name: string, stereotypes: string[]) => {
		const normalized = normalizeFilePath(filePath, options.targetDir);
		const pkg = getGroupForFile(normalized, groups) ?? extractPackage(normalized);
		if (!pkg) return;
		let members = packages.get(pkg);
		if (!members) {
			members = new Map<string, PackageMember>();
			packages.set(pkg, members);
		}
		if (members.has(name)) return;
		members.set(name, { name, stereotypes });
	};

	for (const cls of symbols.classes) {
		const kind = cls.kind === "interface" ? "interface" : "class";
		addEntry(cls.filePath, cls.name, cls.isExported ? [kind, "Exported"] : [kind]);
	}

	if (options.showStores) {
		for (const store of symbols.stores) {
			const stereotype =
				store.runeKind === "state" ? "state" : store.runeKind === "derived" ? "derived" : "store";
			addEntry(
				store.filePath,
				store.name,
				store.isExported ? [stereotype, "Exported"] : [stereotype],
			);
		}
	}

	if (options.showProps) {
		for (const prop of symbols.props) {
			addEntry(prop.filePath, prop.componentName, ["component"]);
		}
		for (const comp of symbols.components) {
			addEntry(comp.filePath, comp.name, ["component"]);
		}
	}

	for (const fn of symbols.functions) {
		addEntry(fn.filePath, fn.name, fn.isExported ? ["function", "Exported"] : ["function"]);
	}

	for (const route of symbols.routes ?? []) {
		addEntry(route.filePath, route.name, [routeStereotype(route)]);
	}

	return packages;
}

function extractPackage(filePath: string): string | undefined {
	const normalized = filePath.replace(/\\/g, "/");
	const srcIndex = normalized.indexOf("src/");
	if (srcIndex === -1) {
		const parts = normalized.split("/");
		if (parts.length < 2) return undefined;
		return parts[parts.length - 2];
	}
	const afterSrc = normalized.slice(srcIndex + 4);
	const parts = afterSrc.split("/");
	if (parts.length >= 2 && parts[0]) {
		return parts[0];
	}
	return undefined;
}

function sanitizeId(path: string): string {
	return path.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}
