import { describe, expect, it } from "vitest";
import { namingStereotype } from "../../src/extraction/naming-stereotype.js";

describe("namingStereotype", () => {
	it("maps .repo.ts and .repository.ts to repository", () => {
		expect(namingStereotype("src/lib/video.repo.ts")).toBe("repository");
		expect(namingStereotype("src/lib/video.repository.ts")).toBe("repository");
	});

	it("maps .service.ts to service", () => {
		expect(namingStereotype("src/lib/vocab.service.ts")).toBe("service");
	});

	it("maps .store.ts to store", () => {
		expect(namingStereotype("src/lib/auth.store.ts")).toBe("store");
	});

	it("maps .guard.ts to guard", () => {
		expect(namingStereotype("src/lib/admin.guard.ts")).toBe("guard");
	});

	it("returns undefined for unmatched names", () => {
		expect(namingStereotype("src/lib/foo.ts")).toBeUndefined();
		expect(namingStereotype("src/lib/Button.svelte")).toBeUndefined();
	});
});
