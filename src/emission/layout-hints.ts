import type { LayoutDirection } from "../types/diagram.js";

const DIRECTION_MAP: Record<LayoutDirection, string> = {
	"top-to-bottom": "down",
	"left-to-right": "right",
	"bottom-to-top": "up",
	"right-to-left": "left",
};

export function renderLayoutDirective(direction: LayoutDirection): string {
	const d2 = DIRECTION_MAP[direction];
	return d2 ? `direction: ${d2}` : "";
}
