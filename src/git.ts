import git from 'isomorphic-git';
import fs from 'fs';
import http from 'isomorphic-git/http/node';

export async function getLocalGitCommits(owner: string, repo: string): Promise<any[]> {
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    const repoPath = `/tmp/${owner}-${repo}`;

    try {
        // Clean up any existing repo
        try {
            await fs.promises.rm(repoPath, { recursive: true, force: true });
        } catch { }

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
            throw new Error('No default branch found');
        }

        // Get commits
        const commits = await git.log({
            fs,
            dir: repoPath,
            ref: defaultBranch,
        });

        // Clean up
        await fs.promises.rm(repoPath, { recursive: true, force: true });

        // Format commits
        return commits.map(commit => ({
            hash: commit.oid,
            author: commit.commit.author.name,
            date: commit.commit.author.timestamp,
            message: commit.commit.message,
            url: `https://github.com/${owner}/${repo}/commit/${commit.oid}`
        }));
    } catch (error) {
        console.error('Error in git operations:', error);
        // Clean up on error
        try {
            await fs.promises.rm(repoPath, { recursive: true, force: true });
        } catch { }
        throw error;
    }
} 