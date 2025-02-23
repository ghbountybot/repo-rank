import { CommitInfo, CommitAnalysis } from '../types/commit';
import { analyzeCommit, analyzeCommitWithReferences } from './gemini';

export async function analyzeInitialCommits(commits: CommitInfo[], sampleSize = 5): Promise<CommitAnalysis[]> {
    // Get a random sample of commits
    const sampleCommits = commits
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(sampleSize, commits.length));

    // Analyze each commit in parallel
    const analyses = await Promise.all(
        sampleCommits.map(commit => analyzeCommit(commit))
    );

    return analyses;
}

export async function analyzeRemainingCommits(
    commits: CommitInfo[],
    existingAnalyses: CommitAnalysis[],
    referenceSampleSize = 4
): Promise<CommitAnalysis[]> {
    // Filter out commits that already have analyses
    const analyzedHashes = new Set(existingAnalyses.map(a => a.hash));
    const remainingCommits = commits.filter(c => !analyzedHashes.has(c.hash));

    // Process each remaining commit
    const newAnalyses: CommitAnalysis[] = [];

    for (const commit of remainingCommits) {
        // Get a random sample of reference commits
        const referenceCommits = existingAnalyses
            .concat(newAnalyses)
            .sort(() => Math.random() - 0.5)
            .slice(0, referenceSampleSize);

        // Analyze the commit using the references
        const analysis = await analyzeCommitWithReferences(commit, referenceCommits);
        newAnalyses.push(analysis);
    }

    return newAnalyses;
}

export async function analyzeRepository(owner: string, repo: string, commits: CommitInfo[]): Promise<CommitAnalysis[]> {
    console.log(`Analyzing repository ${owner}/${repo}...`);
    console.log(`Total commits to analyze: ${commits.length}`);

    // First, analyze a sample of commits
    console.log('Analyzing initial sample of commits...');
    const initialAnalyses = await analyzeInitialCommits(commits);
    console.log(`Completed initial analysis of ${initialAnalyses.length} commits`);

    // Then analyze remaining commits using the initial analyses as reference
    console.log('Analyzing remaining commits...');
    const remainingAnalyses = await analyzeRemainingCommits(commits, initialAnalyses);
    console.log(`Completed analysis of ${remainingAnalyses.length} remaining commits`);

    // Combine all analyses
    return [...initialAnalyses, ...remainingAnalyses];
} 