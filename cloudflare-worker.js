// Homework Hub — Cloudflare Worker
// Proxies Claude API calls server-side so the API key is never exposed in the browser.
//
// SETUP:
// 1. Go to dash.cloudflare.com → Workers & Pages → Create → Worker
// 2. Paste this entire file into the editor and click Deploy
// 3. Go to the Worker's Settings → Variables → Add variable:
//      Name: ANTHROPIC_API_KEY   Value: sk-ant-... (your key)   ← mark as Secret
// 4. Copy the Worker URL (e.g. https://homework-hub.YOUR-NAME.workers.dev)
// 5. Paste it as CLAUDE_URL in index.html

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors('');
    }

    if (request.method === 'GET') {
      return cors(JSON.stringify({ status: 'Homework Hub Worker is running' }));
    }

    if (request.method !== 'POST') {
      return cors(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    try {
      const { prompt, max_tokens = 1000 } = await request.json();

      if (!prompt) {
        return cors(JSON.stringify({ error: 'No prompt provided' }), 400);
      }

      if (!env.ANTHROPIC_API_KEY) {
        return cors(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in Worker secrets' }), 500);
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return cors(JSON.stringify({ error: `Anthropic error ${response.status}: ${JSON.stringify(data)}` }), 500);
      }

      return cors(JSON.stringify({ text: data.content[0].text }));

    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }
};

function cors(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
