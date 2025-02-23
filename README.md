# Repo Rank

> [!WARNING]  
> This is really bad code right now. I will improve it a lot soon. Also rankings are not as good as they could be. Feel free to try to improve.


A Git commit analysis tool that uses Google's Gemini AI to evaluate and score commit complexity and effort. This tool helps teams understand what percent of work (roughly) each person has done.
I see this as as the future of providing long-term incentives when funding repositories.

## Psuedocode

```python
def analyze_repository(owner, repo, commits, N=5, M=4):
    """
    Improved pseudo-Python for analyzing repository commits with Gemini Flash 2.0.
    Reference set is dynamically updated with each new analysis.
    
    Args:
        owner: Repository owner
        repo: Repository name
        commits: List of commits to analyze
        N: Number of initial commits to analyze (default=5)
        M: Number of reference commits to use (default=4)
    """
    
    # 1. Analyze N sample commits to build initial knowledge
    seed_commits = random.sample(commits, N)
    analyzed_results = initial_score_gemini_flash_2_0(seed_commits)
    
    # 2. Process remaining commits with dynamic reference set
    remaining_commits = [c for c in commits if c not in seed_commits]
    
    for commit in remaining_commits:
        # Sample M most results as reference set
        reference_set = random.sample(analyzed_results, M)
        
        # Analyze current commit using reference set
        result = gemini_flash_2_0_with_reference(commit, reference_set)
        analyzed_results.append(result)
    
    return analyzed_results
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

### Contributor Effort Analysis

Analyzes the proportion of work done by each contributor based on commit effort scores.

```
GET /contributor-effort/:owner/:repo
```

Example:
```
GET /contributor-effort/facebook/react
```

Response:
```json
{
    "repository": "facebook/react",
    "total_effort": 350,
    "contributors": [
        {
            "author": "Dan Abramov",
            "effort": 120,
            "proportion": 0.343
        },
        {
            "author": "Sophie Alpert",
            "effort": 95,
            "proportion": 0.271
        }
        // ... more contributors
    ]
}
```

## Environment Variables

- `GEMINI_API_KEY`: Required. Your Google Gemini API key
