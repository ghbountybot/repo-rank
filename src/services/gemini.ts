import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { CommitAnalysis, CommitInfo } from "../types/commit";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
            reasoning: {
                type: SchemaType.STRING,
                description: "The reasoning behind the analysis"
            },
            description: {
                type: SchemaType.STRING,
                description: "A description of the commit's changes and impact"
            },
            effort: {
                type: SchemaType.NUMBER,
                description: "A numerical score (1-10) representing the effort required"
            }
        },
        required: ["reasoning", "description", "effort"]
    },
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: "You are a helpful assistant that analyzes git commits and provides a structured analysis of the effort required.",
});

const ANALYSIS_PROMPT = `Analyze the following git commit and provide a structured analysis of the effort required.
Consider factors like:
- Code complexity
- Number of files changed
- Impact on the codebase
- Technical debt implications
- Testing requirements

Commit details:
Title: {title}
Patch:
{patch}

Provide your analysis as structured JSON matching the response schema.`;

const RELATIVE_EFFORT_PROMPT = `Given a new commit and 4 reference commits with known effort scores, estimate the relative effort for the new commit.
Consider how the complexity and scope of the new commit compares to the reference commits.

Reference commits:
{referenceCommits}

New commit:
Title: {title}
Patch:
{patch}

Provide your analysis as structured JSON matching the response schema.`;

export async function analyzeCommit(commit: CommitInfo): Promise<CommitAnalysis> {
    console.log("🔍 Analyzing single commit:", commit.hash);
    const prompt = ANALYSIS_PROMPT
        .replace("{title}", commit.title)
        .replace("{patch}", commit.patch || "No patch available");

    console.log("📝 Generated prompt:", prompt);

    const chatSession = model.startChat({
        // @ts-ignore
        generationConfig,
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
        ...analysis,
    };
    console.log("🏁 Final result:", finalResult);

    return finalResult;
}

export async function analyzeCommitWithReferences(
    commit: CommitInfo,
    referenceCommits: CommitAnalysis[]
): Promise<CommitAnalysis> {
    console.log("🔍 Analyzing commit with references:", {
        targetCommit: commit.hash,
        referenceCount: referenceCommits.length
    });

    const referencesText = referenceCommits
        .map(
            (ref) => `
Hash: ${ref.hash}
Title: ${ref.title}
Effort: ${ref.effort}
Description: ${ref.description}
`
        )
        .join("\n");

    console.log("📚 Reference commits text:", referencesText);

    const prompt = RELATIVE_EFFORT_PROMPT
        .replace("{referenceCommits}", referencesText)
        .replace("{title}", commit.title)
        .replace("{patch}", commit.patch || "No patch available");

    console.log("📝 Generated prompt:", prompt);

    const chatSession = model.startChat({
        // @ts-ignore
        generationConfig,
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
        ...analysis,
    };
    console.log("🏁 Final result:", finalResult);

    return finalResult;
} 