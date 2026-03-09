import crypto from 'crypto';
import { registerTool } from './index';

/**
 * OAuth 1.0a HMAC-SHA1 signing for Twitter API v2
 */
function buildOAuthHeader(
  method: string,
  url: string,
  config: { apiKey: string; apiSecret: string; accessToken: string; accessTokenSecret: string }
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.accessToken,
    oauth_version: '1.0',
  };

  // Build signature base string
  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(config.apiSecret)}&${encodeURIComponent(config.accessTokenSecret)}`;

  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams['oauth_signature'] = signature;

  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${header}`;
}

registerTool({
  name: 'twitter_post',
  description: 'Post a tweet on Twitter/X. Max 280 characters. Requires the user to have connected their Twitter integration.',
  requiresIntegration: 'twitter',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Tweet text (max 280 characters)', maxLength: 280 },
    },
    required: ['text'],
  },
  async execute(args, context) {
    const config = context?.integrations?.twitter;
    if (!config?.apiKey || !config?.accessToken) return 'Error: Twitter integration not configured';

    if (args.text.length > 280) return 'Error: Tweet exceeds 280 characters';

    const url = 'https://api.twitter.com/2/tweets';
    const authHeader = buildOAuthHeader('POST', url, config);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Hiragen/1.0',
      },
      body: JSON.stringify({ text: args.text }),
    });

    if (!res.ok) {
      const text = await res.text();
      return `Error: Twitter returned ${res.status} — ${text.slice(0, 500)}`;
    }

    const data = await res.json();
    return `Tweet posted: https://twitter.com/i/status/${data.data?.id || 'unknown'}`;
  },
});
