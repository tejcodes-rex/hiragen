import * as cheerio from 'cheerio';
import { registerTool } from './index';

registerTool({
  name: 'web_scrape',
  description: 'Fetch and extract text content from a URL. Returns page title, main text, and links.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to scrape' },
    },
    required: ['url'],
  },
  async execute(args) {
    const url = args.url as string;
    if (!url) return 'Error: url is required';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HiragenBot/1.0)',
        },
      });

      if (!res.ok) return `Error: ${url} returned ${res.status}`;

      const html = await res.text();
      const $ = cheerio.load(html);

      // Remove non-content elements
      $('script, style, nav, footer, header, aside, .sidebar, .menu, .ad').remove();

      const title = $('title').text().trim();
      const body = $('body').text().replace(/\s+/g, ' ').trim();

      const links: string[] = [];
      $('a[href]').each((i, el) => {
        if (i >= 10) return false;
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links.push(`- ${text}: ${href}`);
        }
      });

      let output = `Title: ${title}\n\nContent:\n${body}`;
      if (links.length > 0) {
        output += `\n\nKey Links:\n${links.join('\n')}`;
      }

      return output.slice(0, 4000);
    } finally {
      clearTimeout(timeout);
    }
  },
});
