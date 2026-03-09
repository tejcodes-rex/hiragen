import { registerTool } from './index';

registerTool({
  name: 'github_create_issue',
  description: 'Create a GitHub issue on a repository. Requires the user to have connected their GitHub integration.',
  requiresIntegration: 'github',
  parameters: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'Repository owner (username or org)' },
      repo: { type: 'string', description: 'Repository name' },
      title: { type: 'string', description: 'Issue title' },
      body: { type: 'string', description: 'Issue body (markdown)' },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Labels to apply',
      },
    },
    required: ['owner', 'repo', 'title'],
  },
  async execute(args, context) {
    const config = context?.integrations?.github;
    if (!config?.personalAccessToken) return 'Error: GitHub integration not configured';

    const payload: any = { title: args.title };
    if (args.body) payload.body = args.body;
    if (args.labels) payload.labels = args.labels;

    const res = await fetch(
      `https://api.github.com/repos/${args.owner}/${args.repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.personalAccessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Hiragen/1.0',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return `Error: GitHub returned ${res.status} — ${text.slice(0, 500)}`;
    }

    const issue = await res.json();
    return `Issue created: ${issue.html_url}`;
  },
});
