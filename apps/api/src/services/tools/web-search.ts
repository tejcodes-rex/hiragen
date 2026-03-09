import * as cheerio from 'cheerio';
import { registerTool } from './index';

registerTool({
  name: 'web_search',
  description: 'Search the web using DuckDuckGo. Returns titles, URLs, and snippets for the top results.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
  async execute(args) {
    const query = args.query as string;
    if (!query) return 'Error: query is required';

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HiragenBot/1.0)',
      },
    });

    if (!res.ok) return `Error: DuckDuckGo returned ${res.status}`;

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: string[] = [];

    $('.result').each((i, el) => {
      if (i >= 8) return false;
      const title = $(el).find('.result__a').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const href = $(el).find('.result__a').attr('href') || '';
      if (title) {
        results.push(`${i + 1}. ${title}\n   URL: ${href}\n   ${snippet}`);
      }
    });

    if (results.length === 0) return 'No results found.';
    const output = `Search results for "${query}":\n\n${results.join('\n\n')}`;
    return output.slice(0, 4000);
  },
});
