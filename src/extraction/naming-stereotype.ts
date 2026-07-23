// Infer a stereotype from a file name suffix so domain diagrams read
// semantically. Returns undefined when no naming pattern matches.
export function namingStereotype(filePath: string): string | undefined {
	const normalized = filePath.replace(/\\/g, "/").toLowerCase();
	if (/\.(repo|repository)\.ts$/.test(normalized)) return "repository";
	if (/\.service\.ts$/.test(normalized)) return "service";
	if (/\.store\.ts$/.test(normalized)) return "store";
	if (/\.guard\.ts$/.test(normalized)) return "guard";
	// Svelte 5 rune modules hold reactive state; treat them as stores so they
	// color consistently without forcing a *.store.ts rename.
	if (/\.svelte\.(ts|js)$/.test(normalized)) return "store";
	return undefined;
}
