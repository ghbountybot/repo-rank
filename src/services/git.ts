import git, { type WalkerEntry } from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "node:fs";
import type { CommitInfo } from "../types/commit";

const TEMP_DIR = "/tmp/repo-rank";
const MAX_LINES_PER_COMMIT = 1000; // Maximum number of lines changed per commit
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB max file size

interface DiffEntry {
	filepath: string;
	oldContent: string;
	newContent: string;
}

export async function getCommitsWithPatches(
	owner: string,
	repo: string,
): Promise<CommitInfo[]> {
	const repoUrl = `https://github.com/${owner}/${repo}.git`;
	const repoPath = `${TEMP_DIR}/${owner}-${repo}`;

	try {
		// Clean up any existing repo
		try {
			await fs.promises.rm(repoPath, { recursive: true, force: true });
		} catch {}

		// Create directory
		await fs.promises.mkdir(repoPath, { recursive: true });

		// Clone the repository
		console.log(`Cloning ${repoUrl}...`);
		await git.clone({
			fs,
			http,
			dir: repoPath,
			url: repoUrl,
			singleBranch: true,
		});

		// Get the default branch
		const defaultBranch = await git.currentBranch({
			fs,
			dir: repoPath,
		});

		if (!defaultBranch) {
			throw new Error("No default branch found");
		}

		// Get commits
		const commits = await git.log({
			fs,
			dir: repoPath,
			ref: defaultBranch,
		});

		// Get patches for each commit
		const commitsWithPatches = await Promise.all(
			commits.map(async (commit) => {
				let patch = "";
				try {
					// Get the commit's parent
					const parents = commit.commit.parent;
					if (parents && parents.length > 0) {
						const parent = parents[0];
						// Get the diff between parent and current commit
						const walkResult = await git.walk({
							fs,
							dir: repoPath,
							trees: [git.TREE({ ref: parent }), git.TREE({ ref: commit.oid })],

							// tslint:disable-next-line
							map: async (
								filepath: string,
								entries: Array<WalkerEntry | null>,
							) => {
								if (entries.length !== 2) {
									return;
								}
								const [A, B] = entries as [
									WalkerEntry | null,
									WalkerEntry | null,
								];

								// Skip if both are present and identical
								if (A && B && (await A.oid()) === (await B.oid())) {
									return;
								}

								// Get contents, handling void returns
								const aContent = A ? await A.content() : undefined;
								const bContent = B ? await B.content() : undefined;

								// Skip if no valid content changes
								if (!aContent && !bContent) {
									return;
								}

								return {
									filepath,
									oldContent:
										aContent instanceof Uint8Array
											? new TextDecoder().decode(aContent)
											: "/dev/null",
									newContent:
										bContent instanceof Uint8Array
											? new TextDecoder().decode(bContent)
											: "/dev/null",
								} as DiffEntry;
							},
						});

						// Filter out undefined entries and format the diff
						const diffEntries = (walkResult.diff || []).filter(
							Boolean,
						) as DiffEntry[];
						if (diffEntries.length > 0) {
							// Check commit size limits
							let totalLinesChanged = 0;
							let totalSize = 0;

							for (const entry of diffEntries) {
								totalLinesChanged += Math.abs(
									entry.newContent.split("\n").length -
										entry.oldContent.split("\n").length,
								);
								totalSize += entry.newContent.length + entry.oldContent.length;

								if (
									totalLinesChanged > MAX_LINES_PER_COMMIT ||
									totalSize > MAX_FILE_SIZE_BYTES
								) {
									patch = "Commit too large - skipped";
									break;
								}
							}

							if (patch !== "Commit too large - skipped") {
								patch = diffEntries
									.map(
										({ filepath, oldContent, newContent }) =>
											`diff --git a/${filepath} b/${filepath}\n` +
											`--- a/${filepath}\n` +
											`+++ b/${filepath}\n` +
											`@@ -1,${oldContent.split("\n").length} +1,${newContent.split("\n").length} @@\n` +
											`${newContent}`,
									)
									.join("\n");
							}
						} else {
							patch = "No changes (empty commit)";
						}
					} else {
						// Initial commit
						patch = "Initial commit";
					}
				} catch (error) {
					console.warn(`Failed to get patch for commit ${commit.oid}:`, error);
					patch = "Failed to generate patch";
				}

				return {
					hash: commit.oid,
					title: commit.commit.message.split("\n")[0],
					patch,
					author: commit.commit.author.name,
					date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
					url: `https://github.com/${owner}/${repo}/commit/${commit.oid}`,
				} as CommitInfo;
			}),
		);

		// Clean up
		await fs.promises.rm(repoPath, { recursive: true, force: true });

		return commitsWithPatches;
	} catch (error) {
		console.error("Error in git operations:", error);
		// Clean up on error
		try {
			await fs.promises.rm(repoPath, { recursive: true, force: true });
		} catch {}
		throw error;
	}
}
