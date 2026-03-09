/**
 * Tool: github_create_pr — Create pull requests on GitHub
 * Tool: github_write_file — Write/update files in GitHub repos
 * Real GitHub automation that's worth paying for.
 */
import { registerTool } from './index';

registerTool({
  name: 'github_create_pr',
  description: 'Create a pull request on a GitHub repository. Requires GitHub integration with a personal access token.',
  parameters: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'Repository owner' },
      repo: { type: 'string', description: 'Repository name' },
      title: { type: 'string', description: 'PR title' },
      body: { type: 'string', description: 'PR description' },
      head: { type: 'string', description: 'Branch with changes' },
      base: { type: 'string', description: 'Target branch (default: main)' },
    },
    required: ['owner', 'repo', 'title', 'head'],
  },
  requiresIntegration: 'github',
  execute: async (args, context) => {
    const { owner, repo, title, body = '', head, base = 'main' } = args;
    const token = context?.integrations?.github?.personalAccessToken;
    if (!token) return 'Error: GitHub integration not configured with personalAccessToken';

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body, head, base }),
      });

      if (!response.ok) {
        const error = await response.text();
        return `Error creating PR: ${response.status} ${error}`;
      }

      const pr = await response.json();
      return `Pull request created successfully!\nTitle: ${pr.title}\nURL: ${pr.html_url}\nNumber: #${pr.number}\nState: ${pr.state}`;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
});

registerTool({
  name: 'github_write_file',
  description: 'Create or update a file in a GitHub repository. Commits the file directly to the specified branch.',
  parameters: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'Repository owner' },
      repo: { type: 'string', description: 'Repository name' },
      path: { type: 'string', description: 'File path in the repo (e.g., "src/index.ts")' },
      content: { type: 'string', description: 'File content' },
      message: { type: 'string', description: 'Commit message' },
      branch: { type: 'string', description: 'Branch name (default: main)' },
    },
    required: ['owner', 'repo', 'path', 'content', 'message'],
  },
  requiresIntegration: 'github',
  execute: async (args, context) => {
    const { owner, repo, path: filePath, content, message, branch = 'main' } = args;
    const token = context?.integrations?.github?.personalAccessToken;
    if (!token) return 'Error: GitHub integration not configured';

    try {
      // Check if file exists to get SHA for update
      let sha: string | undefined;
      try {
        const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, {
          headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        });
        if (existing.ok) {
          const data = await existing.json();
          sha = data.sha;
        }
      } catch { /* file doesn't exist, will create */ }

      const body: any = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      };
      if (sha) body.sha = sha;

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        return `Error writing file: ${response.status} ${error}`;
      }

      const result = await response.json();
      return `File ${sha ? 'updated' : 'created'} successfully!\nPath: ${filePath}\nCommit: ${result.commit.sha.slice(0, 7)}\nURL: ${result.content.html_url}`;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
});
