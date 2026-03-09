/**
 * Tool: http_request — Make HTTP requests to external APIs
 * This enables agents to interact with ANY REST API for real automation work.
 */
import { registerTool } from './index';

registerTool({
  name: 'http_request',
  description: 'Make HTTP GET or POST requests to external APIs. Use this for API integrations, fetching data from services, triggering webhooks, and automating workflows. Returns the response body.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The full URL to request' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default: GET)' },
      headers: { type: 'object', description: 'Optional headers as key-value pairs' },
      body: { type: 'string', description: 'Optional request body (for POST/PUT/PATCH)' },
    },
    required: ['url'],
  },
  execute: async (args) => {
    const { url, method = 'GET', headers = {}, body } = args;

    // Block requests to internal/private networks
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '172.16.', '192.168.', '169.254.'];
    if (blocked.some(b => url.includes(b))) {
      return 'Error: Cannot make requests to internal/private network addresses';
    }

    try {
      const options: RequestInit = {
        method,
        headers: {
          'User-Agent': 'HiragenAgent/1.0',
          ...headers,
        },
        signal: AbortSignal.timeout(15000),
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = body;
        if (!headers['Content-Type'] && !headers['content-type']) {
          (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      let responseBody: string;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await response.text();
      }

      const result = `HTTP ${response.status} ${response.statusText}\n\n${responseBody}`;
      return result.slice(0, 8000);
    } catch (err: any) {
      return `HTTP request failed: ${err.message}`;
    }
  },
});
