import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ReadmeAnnotation {
	title?: string;
	description?: string;
	hide?: boolean;
}

const TitleRe = /<!--\s*@uml\.title:\s*([\s\S]*?)-->/;
const DescriptionRe = /<!--\s*@uml\.description:\s*([\s\S]*?)-->/;
const HideRe = /<!--\s*@uml\.hide\s*-->/;

// Read <dir>/README.md and parse the three package annotation tags. Returns
// undefined when the file is absent. Values are trimmed but not escaped; the
// emitter escapes them.
export function readReadmeAnnotation(dir: string): ReadmeAnnotation | undefined {
	const path = join(dir, "README.md");
	if (!existsSync(path)) return undefined;
	const source = readFileSync(path, "utf-8");

	const annotation: ReadmeAnnotation = {};
	const title = TitleRe.exec(source)?.[1]?.trim();
	if (title) annotation.title = title;
	const description = DescriptionRe.exec(source)?.[1]?.trim();
	if (description) annotation.description = description;
	if (HideRe.test(source)) annotation.hide = true;

	return annotation;
}
