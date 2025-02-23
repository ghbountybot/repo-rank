import { Octokit } from "octokit";

export async function getLastYearCommits(owner: string, repo: string, authToken?: string) {
    const octokit = new Octokit({
        auth: authToken,
    });

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    try {
        const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
            owner,
            repo,
            since: oneYearAgo.toISOString(),
            per_page: 100,
        });

        return commits.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name || 'Unknown',
            date: commit.commit.author?.date,
            url: commit.html_url,
        }));
    } catch (error) {
        console.error('Error fetching commits:', error);
        throw error;
    }
} 