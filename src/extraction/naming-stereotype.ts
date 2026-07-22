// Infer a stereotype from a file name suffix so domain diagrams read
// semantically. Returns undefined when no naming pattern matches.
export function namingStereotype(filePath: string): string | undefined {
	const normalized = filePath.replace(/\\/g, "/").toLowerCase();
	if (/\.(repo|repository)\.ts$/.test(normalized)) return "repository";
	if (/\.service\.ts$/.test(normalized)) return "service";
	if (/\.store\.ts$/.test(normalized)) return "store";
	if (/\.guard\.ts$/.test(normalized)) return "guard";
	return undefined;
}
