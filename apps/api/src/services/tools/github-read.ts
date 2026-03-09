import { registerTool } from './index';

const GITHUB_API = 'https://api.github.com';

async function githubFetch(path: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'HiragenBot/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

registerTool({
  name: 'github_read',
  description: 'Read public GitHub repository data. Actions: "info" (repo metadata), "readme" (README content), "issues" (open issues, top 10).',
  parameters: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'Repository owner (user or org)' },
      repo: { type: 'string', description: 'Repository name' },
      action: {
        type: 'string',
        enum: ['info', 'readme', 'issues'],
        description: 'What to fetch: info, readme, or issues',
      },
    },
    required: ['owner', 'repo', 'action'],
  },
  async execute(args) {
    const { owner, repo, action } = args as { owner: string; repo: string; action: string };
    if (!owner || !repo || !action) return 'Error: owner, repo, and action are required';

    switch (action) {
      case 'info': {
        const data = await githubFetch(`/repos/${owner}/${repo}`);
        return [
          `Repository: ${data.full_name}`,
          `Description: ${data.description || 'None'}`,
          `Stars: ${data.stargazers_count} | Forks: ${data.forks_count} | Open Issues: ${data.open_issues_count}`,
          `Language: ${data.language || 'Unknown'}`,
          `Created: ${data.created_at} | Updated: ${data.updated_at}`,
          `License: ${data.license?.name || 'None'}`,
          `Topics: ${data.topics?.join(', ') || 'None'}`,
        ].join('\n').slice(0, 4000);
      }

      case 'readme': {
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.v3.raw',
          'User-Agent': 'HiragenBot/1.0',
        };
        if (process.env.GITHUB_TOKEN) {
          headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers });
        if (!res.ok) return `No README found for ${owner}/${repo}`;
        const text = await res.text();
        return `README for ${owner}/${repo}:\n\n${text}`.slice(0, 4000);
      }

      case 'issues': {
        const issues = await githubFetch(`/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`);
        if (!issues.length) return `No open issues for ${owner}/${repo}`;
        const list = issues.map((issue: any, i: number) =>
          `${i + 1}. #${issue.number}: ${issue.title}\n   Labels: ${issue.labels.map((l: any) => l.name).join(', ') || 'none'}\n   ${issue.body?.slice(0, 150) || 'No description'}...`
        );
        return `Open issues for ${owner}/${repo}:\n\n${list.join('\n\n')}`.slice(0, 4000);
      }

      default:
        return `Unknown action: ${action}. Use "info", "readme", or "issues".`;
    }
  },
});
