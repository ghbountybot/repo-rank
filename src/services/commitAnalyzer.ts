import type { CommitAnalysis, CommitInfo } from "../types/commit";
import { analyzeCommits, analyzeCommitWithReferences } from "./gemini";

export async function analyzeInitialCommits(
	commits: CommitInfo[],
	sampleSize = 5,
): Promise<CommitAnalysis[]> {
	// Get a random sample of commits
	const sampleCommits = commits
		.sort(() => Math.random() - 0.5)
		.slice(0, Math.min(sampleSize, commits.length));

	// Analyze each commit in parallel
	const analyses = await analyzeCommits(sampleCommits);

	return analyses;
}

export async function analyzeRemainingCommits(
	commits: CommitInfo[],
	existingAnalyses: CommitAnalysis[],
	referenceSampleSize = 4,
): Promise<CommitAnalysis[]> {
	const BATCH_SIZE = 10;

	// Filter out commits that already have analyses
	const analyzedHashes = new Set(existingAnalyses.map((a) => a.hash));
	const remainingCommits = commits.filter((c) => !analyzedHashes.has(c.hash));

	// Split remaining commits into batches
	const batches = [];

	for (let i = 0; i < remainingCommits.length; i += BATCH_SIZE) {
		batches.push(remainingCommits.slice(i, i + BATCH_SIZE));
	}

	// Get reference commits
	const referenceCommits = existingAnalyses
		.sort(() => Math.random() - 0.5)
		.slice(0, referenceSampleSize);

	// Process all batches in parallel
	const batchResults = await Promise.all(
		batches.map(async (batch) => {
			// Process all commits in this batch in parallel
			return Promise.all(
				batch.map((commit) =>
					analyzeCommitWithReferences(commit, referenceCommits),
				),
			);
		}),
	);

	// Flatten results from all batches
	return batchResults.flat();
}

export async function analyzeRepository(
	owner: string,
	repo: string,
	commits: CommitInfo[],
): Promise<CommitAnalysis[]> {
	// tslint:disable-next-line:no-console
	console.info(`Analyzing repository ${owner}/${repo}...`);

	// tslint:disable-next-line:no-console
	console.info(`Total commits to analyze: ${commits.length}`);

	// First, analyze a sample of commits
	// tslint:disable-next-line:no-console
	console.info("Analyzing initial sample of commits...");
	const initialAnalyses = await analyzeInitialCommits(commits);
	// tslint:disable-next-line:no-console
	console.info(
		`Completed initial analysis of ${initialAnalyses.length} commits`,
	);

	// Then analyze remaining commits using the initial analyses as reference
	// tslint:disable-next-line:no-console
	console.info("Analyzing remaining commits...");
	const remainingAnalyses = await analyzeRemainingCommits(
		commits,
		initialAnalyses,
	);
	// tslint:disable-next-line:no-console
	console.info(
		`Completed analysis of ${remainingAnalyses.length} remaining commits`,
	);

	// Combine all analyses
	return [...initialAnalyses, ...remainingAnalyses];
}
