export interface CommitInfo {
	hash: string;
	title: string;
	patch?: string;
	author: string;
	date: string;
	url: string;
}

export interface CommitAnalysis {
	hash: string;
	title: string;
	reasoning: string;
	description: string;
	effort: number;
}
