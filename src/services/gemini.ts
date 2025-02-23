import { GoogleGenerativeAI } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import type { CommitAnalysis, CommitInfo } from "../types/commit";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
	throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface RawCommitAnalysis {
	"01_reasoning": string;
	"02_description": string;
	"03_effort": number;
}

const stripNumericPrefix = (
	obj: RawCommitAnalysis,
): Omit<CommitAnalysis, "hash" | "title"> => {
	return {
		reasoning: obj["01_reasoning"],
		description: obj["02_description"],
		effort: obj["03_effort"],
	};
};

const analyzeCommitConfig = {
	temperature: 1,
	topP: 0.95,
	topK: 40,
	maxOutputTokens: 8192,
	responseMimeType: "application/json",
	responseSchema: {
		type: SchemaType.ARRAY,
		items: {
			type: SchemaType.OBJECT,
			properties: {
				"01_reasoning": {
					type: SchemaType.STRING,
					description: "The reasoning behind the analysis",
				},
				"02_description": {
					type: SchemaType.STRING,
					description: "A description of the commit's changes and impact",
				},
				"03_effort": {
					type: SchemaType.NUMBER,
					description:
						"A numerical score (1-10) representing the effort required",
				},
			},
			required: ["01_reasoning", "02_description", "03_effort"],
		},
	},
};

const analyzeCommitWithReferencesConfig = {
	temperature: 1,
	topP: 0.95,
	topK: 40,
	maxOutputTokens: 8192,
	responseMimeType: "application/json",
	responseSchema: {
		type: SchemaType.OBJECT,
		properties: {
			"01_reasoning": {
				type: SchemaType.STRING,
				description: "The reasoning behind the analysis",
			},
			"02_description": {
				type: SchemaType.STRING,
				description: "A description of the commit's changes and impact",
			},
			"03_effort": {
				type: SchemaType.NUMBER,
				description:
					"A numerical score (1-10) representing the effort required",
			},
		},
		required: ["01_reasoning", "02_description", "03_effort"],
	},
};

const ANALYSIS_PROMPT = "Estimate the relative effort for the new commit";

const RELATIVE_EFFORT_PROMPT = `Given a new commit and reference commits with known effort scores, estimate the relative effort for the new commit.
Consider how the complexity and scope of the new commit compares to the reference commits.`;

const analysisModel = genAI.getGenerativeModel({
	model: "gemini-2.0-flash",
	systemInstruction: ANALYSIS_PROMPT,
});

const relativeEffortModel = genAI.getGenerativeModel({
	model: "gemini-2.0-flash",
	systemInstruction: RELATIVE_EFFORT_PROMPT,
});

export async function analyzeCommits(
	commits: CommitInfo[],
): Promise<CommitAnalysis[]> {
	console.log(`🔍 Analyzing ${commits.length} commits`);

	const commitsPrompt = commits
		.map(
			(commit) => `
Commit Hash: ${commit.hash}
Title: ${commit.title}
Patch:
${commit.patch || "No patch available"}
---
`,
		)
		.join("\n");

	console.log("📝 Generated prompt for commits");

	const chatSession = analysisModel.startChat({
		// @ts-ignore
		generationConfig: analyzeCommitConfig,
		history: [],
	});

	console.log("🤖 Sending request to Gemini...");
	const result = await chatSession.sendMessage(commitsPrompt);
	console.log("✅ Received response from Gemini");

	const response = result.response.text();
	console.log("📄 Raw response:", response);

	const analyses = JSON.parse(response);
	console.log("🔎 Parsed analyses:", analyses);

	const finalResults = commits.map((commit, index) => ({
		hash: commit.hash,
		title: commit.title,
		...stripNumericPrefix(analyses[index]),
	}));
	console.log("🏁 Final results:", finalResults);

	return finalResults;
}

export async function analyzeCommitWithReferences(
	commit: CommitInfo,
	referenceCommits: CommitAnalysis[],
): Promise<CommitAnalysis> {
	console.log("🔍 Analyzing commit with references:", {
		targetCommit: commit.hash,
		referenceCount: referenceCommits.length,
	});

	const referencesText = referenceCommits
		.map(
			(ref) => `
Hash: ${ref.hash}
Title: ${ref.title}
Effort: ${ref.effort}
Description: ${ref.description}
`,
		)
		.join("\n");

	console.log("📚 Reference commits text:", referencesText);

	const prompt = `Here is the commit to analyze:

Hash: ${commit.hash}
Title: ${commit.title}
Patch:
${commit.patch || "No patch available"}

Reference commits for effort comparison:
${referencesText}

Please analyze this commit relative to the reference commits.`;

	console.log("📝 Generated prompt:", prompt);

	const chatSession = relativeEffortModel.startChat({
		// @ts-ignore
		generationConfig: analyzeCommitWithReferencesConfig,
		history: [],
	});

	console.log("🤖 Sending request to Gemini...");
	const result = await chatSession.sendMessage(prompt);
	console.log("✅ Received response from Gemini");

	const response = result.response.text();
	console.log("📄 Raw response:", response);

	const analysis = JSON.parse(response);
	console.log("🔎 Parsed analysis:", analysis);

	const finalResult = {
		hash: commit.hash,
		title: commit.title,
		...stripNumericPrefix(analysis),
	};
	console.log("🏁 Final result:", finalResult);

	return finalResult;
}
