# Repo Rank

A sophisticated Git commit analysis tool that uses Google's Gemini AI to evaluate and score commit complexity and effort. This tool helps teams understand the relative complexity and impact of code changes across their repositories.

## Features

- 🤖 Powered by Google Gemini AI
- 📊 Scores commits on a 1-10 effort scale
- 💡 Provides detailed reasoning for each analysis
- 🔄 Supports relative scoring against reference commits
- 📝 Generates comprehensive commit descriptions

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables:

```bash
export GEMINI_API_KEY=your_api_key_here
```

## API Endpoints

### Analyze Repository

Analyzes all commits in a GitHub repository and provides effort scores and analysis for each commit.

```
GET /analyze/:owner/:repo
```

Example:
```
GET /analyze/facebook/react
```

Response:
```json
{
    "repository": "facebook/react",
    "total_commits": 42,
    "analyses": [
        {
            "hash": "commit_hash",
            "title": "commit_title",
            "reasoning": "Detailed analysis of why this score was given",
            "description": "Comprehensive description of the changes",
            "effort": 7
        }
        // ... more commits
    ]
}
```

## How It Works

1. The system uses Google's Gemini AI model to analyze git commits
2. Each commit is evaluated based on:
   - Code complexity
   - Number of files changed
   - Impact on the codebase
   - Technical debt implications
   - Testing requirements
3. The AI provides a structured analysis including:
   - Numerical effort score (1-10)
   - Detailed reasoning for the score
   - Comprehensive description of changes

## Development

Built with:
- TypeScript
- Bun
- Google Gemini AI API

To run in development mode:

```bash
bun run dev
```

## Environment Variables

- `GEMINI_API_KEY`: Required. Your Google Gemini API key
