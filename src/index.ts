import { getCommitsWithPatches } from './services/git';
import { analyzeRepository } from './services/commitAnalyzer';

// Response helper functions
const json = (data: any, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  }
});

const text = (content: string, status = 200) => new Response(content, { status });

// Types for route handlers
type RouteHandler = (...params: string[]) => Promise<Response>;

interface Routes {
  GET: {
    [path: string]: RouteHandler;
  };
}

// Route handlers
async function handleRoot(): Promise<Response> {
  return text("Welcome to Repo Rank API! Use /analyze/:owner/:repo to analyze a repository's commits.");
}

async function handleAnalyze(owner: string, repo: string): Promise<Response> {
  try {
    const commits = await getCommitsWithPatches(owner, repo);
    const analyses = await analyzeRepository(owner, repo, commits);

    return json({
      repository: `${owner}/${repo}`,
      total_commits: commits.length,
      analyses
    });
  } catch (error: any) {
    return json({
      error: "Failed to analyze repository",
      message: error.message
    }, 500);
  }
}

// Router implementation
const routes: Routes = {
  GET: {
    "/": handleRoot,
    "/analyze/:owner/:repo": handleAnalyze
  }
};

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method as keyof typeof routes;

    // Check if method exists
    if (!(method in routes)) {
      return text("Method not allowed", 405);
    }

    // Find matching route
    for (const [pattern, handler] of Object.entries(routes[method])) {
      const paramNames: string[] = [];
      const regexPattern = pattern.replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return "([^/]+)";
      });

      const match = url.pathname.match(new RegExp(`^${regexPattern}$`));
      if (match) {
        // Extract params and call handler
        const params = match.slice(1);
        return handler(...params);
      }
    }

    return text("Not Found", 404);
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`Try: http://localhost:${server.port}/analyze/owner/repo`);

export function sayHelloWorld(world: string) {
  return `Hello ${world}`;
}
