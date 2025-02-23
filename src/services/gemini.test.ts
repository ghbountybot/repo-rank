import { describe, expect, test } from "bun:test";
import type { CommitAnalysis, CommitInfo } from "../types/commit";
import { analyzeCommits, analyzeCommitWithReferences } from "./gemini";

describe("Gemini Service", () => {
	const sampleCommit: CommitInfo = {
		hash: "abc123",
		title: "feat: add user authentication",
		author: "test@example.com",
		date: new Date().toISOString(),
		url: "https://github.com/example/repo/commit/abc123",
		patch: `
diff --git a/src/auth.ts b/src/auth.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/auth.ts
@@ -0,0 +1,15 @@
+export function authenticate(username: string, password: string) {
+    // Basic auth implementation
+    return true;
+}`,
	};

	const referenceCommits: CommitAnalysis[] = [
		{
			hash: "def456",
			title: "chore: update dependencies",
			description: "Updated npm packages",
			reasoning: "Simple dependency update",
			effort: 2,
		},
		{
			hash: "ghi789",
			title: "feat: implement user dashboard",
			description: "Added new user dashboard with charts",
			reasoning: "Complex UI implementation with data visualization",
			effort: 8,
		},
	];

	test("analyzeCommit returns valid analysis", async () => {
		const analysis = await analyzeCommits(sampleCommit);

		expect(analysis.hash).toBe(sampleCommit.hash);
		expect(analysis.title).toBe(sampleCommit.title);
		expect(analysis.description).toBeTruthy();
		expect(analysis.reasoning).toBeTruthy();
		expect(analysis.effort).toBeNumber();
		expect(analysis.effort).toBeGreaterThanOrEqual(1);
		expect(analysis.effort).toBeLessThanOrEqual(10);
	});

	test("analyzeCommitWithReferences returns valid relative analysis", async () => {
		const analysis = await analyzeCommitWithReferences(
			sampleCommit,
			referenceCommits,
		);

		expect(analysis.hash).toBe(sampleCommit.hash);
		expect(analysis.title).toBe(sampleCommit.title);
		expect(analysis.description).toBeTruthy();
		expect(analysis.reasoning).toBeTruthy();
		expect(analysis.effort).toBeNumber();
		expect(analysis.effort).toBeGreaterThanOrEqual(1);
		expect(analysis.effort).toBeLessThanOrEqual(10);
	});

	test("handles commit without patch", async () => {
		const commitWithoutPatch: CommitInfo = {
			hash: "xyz789",
			title: "docs: update README",
			author: "test@example.com",
			date: new Date().toISOString(),
			url: "https://github.com/example/repo/commit/xyz789",
		};

		const analysis = await analyzeCommits(commitWithoutPatch);

		expect(analysis.hash).toBe(commitWithoutPatch.hash);
		expect(analysis.title).toBe(commitWithoutPatch.title);
		expect(analysis.description).toBeTruthy();
		expect(analysis.reasoning).toBeTruthy();
		expect(analysis.effort).toBeNumber();
		expect(analysis.effort).toBeGreaterThanOrEqual(1);
		expect(analysis.effort).toBeLessThanOrEqual(10);
	});
});
