export interface GroupConfig {
	pattern: string;
	name: string;
}

export type DiagramKind = "class" | "package";

export type LayoutDirection = "top-to-bottom" | "left-to-right" | "bottom-to-top" | "right-to-left";

export interface StereotypeColors {
	[key: string]: string;
}

export interface DiagramOptions {
	kind: DiagramKind;
	showMembers: boolean;
	showMethods: boolean;
	showVisibility: boolean;
	showStores: boolean;
	showProps: boolean;
	hideEmptyPackages: boolean;
	title?: string;
	layoutDirection?: LayoutDirection;
	stereotypeColors?: StereotypeColors;
	/** Project root directory — used to normalize absolute paths to relative for portable output. */
	targetDir?: string;
	/** Group definitions for organizing symbols by file path pattern. */
	groups?: GroupConfig[];
	/** Package diagram only: render package nodes without their members. */
	collapseMembers?: boolean;
}

export const DEFAULT_STEREOTYPE_COLORS: StereotypeColors = {
	component: "#4A90D9",
	store: "#E67E22",
	state: "#E74C3C",
	derived: "#9B59B6",
	page: "#27AE60",
	layout: "#2ECC71",
	PageLoad: "#16A085",
	LayoutLoad: "#1ABC9C",
	endpoint: "#E74C3C",
	"error-page": "#C0392B",
	function: "#3498DB",
	Exported: "#95A5A6",
};

export const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
	kind: "class",
	showMembers: true,
	showMethods: true,
	showVisibility: true,
	showStores: true,
	showProps: true,
	hideEmptyPackages: false,
	layoutDirection: "top-to-bottom",
	stereotypeColors: DEFAULT_STEREOTYPE_COLORS,
};
