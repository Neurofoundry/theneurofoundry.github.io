const PRODUCT_KEY = 'skeleton-key';
const INSTALLER_PATH = '/download/SkeletonKeySetup.exe';

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    })
  });
}

function getCounter(env) {
  return env.DOWNLOAD_COUNTER.get(env.DOWNLOAD_COUNTER.idFromName(PRODUCT_KEY));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/count') {
      const response = await getCounter(env).fetch('https://counter/count');
      return json(await response.json());
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === INSTALLER_PATH) {
      if (request.method === 'GET') {
        await getCounter(env).fetch('https://counter/increment');
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: env.INSTALLER_URL,
          'Cache-Control': 'no-store'
        }
      });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  }
};

export class DownloadCounter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    const count = (await this.state.storage.get('count')) || 0;

    if (path === '/increment') {
      const nextCount = count + 1;
      await this.state.storage.put('count', nextCount);
      return json({ count: nextCount });
    }

    if (path === '/count') {
      return json({ count });
    }

    return json({ error: 'Not found' }, 404);
  }
}
