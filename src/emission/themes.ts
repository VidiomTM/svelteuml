import type { StereotypeColors } from "../types/diagram.js";

export interface Theme {
	/** Canvas background fill. */
	background: string;
	/** Muted stroke for dependency edges. */
	edgeStroke: string;
	/** Per-stereotype node fills. */
	stereotypeColors: StereotypeColors;
}

const FG = "#f5f5fa";
const ACCENT = "#8be9fd";
const ACCENT2 = "#ff79c6";
const MUTED = "#6272a4";

// presentation-design house palette. font-color is applied per stereotype by
// renderColorTheme; fills here are drawn from the signature accents so every
// diagram reads as one visual system.
const SIGNATURE: Theme = {
	background: "#1a1a2e",
	edgeStroke: MUTED,
	stereotypeColors: {
		component: ACCENT,
		function: MUTED,
		store: ACCENT2,
		state: ACCENT2,
		derived: ACCENT2,
		page: ACCENT,
		layout: ACCENT,
		PageLoad: ACCENT,
		LayoutLoad: ACCENT,
		endpoint: ACCENT2,
		"error-page": ACCENT2,
		repository: MUTED,
		service: ACCENT,
		guard: ACCENT2,
		interface: MUTED,
		abstract_class: MUTED,
		Exported: ACCENT,
		package: ACCENT,
	},
};

const THEMES: Record<string, Theme> = { signature: SIGNATURE };

export const THEME_NAMES = Object.keys(THEMES);

export function getTheme(name: string): Theme | undefined {
	return THEMES[name];
}

export { FG };
