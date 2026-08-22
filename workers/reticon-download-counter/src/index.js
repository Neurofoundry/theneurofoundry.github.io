const PRODUCT_KEY = 'reticon';
const INSTALLER_PATH = '/download/SetupReticon.exe';

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

async function hashDownloadFingerprint(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';
  const userAgent = request.headers.get('User-Agent') || 'unknown-agent';
  const language = request.headers.get('Accept-Language') || 'unknown-language';
  const input = `${env.FINGERPRINT_SALT}:${ip}:${userAgent}:${language}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function recordDownload(request, env) {
  const fingerprint = await hashDownloadFingerprint(request, env);
  const response = await getCounter(env).fetch('https://counter/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fingerprint })
  });
  return response.json();
}

async function sendUniqueDownloadNotification(env, download, request) {
  const response = await fetch(env.DOWNLOAD_NOTIFICATION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DOWNLOAD_NOTIFICATION_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      country: request.cf?.country || 'unknown',
      uniqueCount: download.uniqueCount,
      count: download.count
    })
  });

  if (!response.ok) {
    throw new Error(`Notification endpoint returned ${response.status}`);
  }
}

export default {
  async fetch(request, env, ctx) {
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
        const download = await recordDownload(request, env);
        if (download.unique) {
          ctx.waitUntil(
            sendUniqueDownloadNotification(env, download, request)
              .catch(error => console.error('Reticon download notification failed:', error))
          );
        }
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

    if (path === '/download' && request.method === 'POST') {
      const { fingerprint } = await request.json();
      if (!/^[a-f0-9]{64}$/.test(fingerprint || '')) {
        return json({ error: 'Invalid fingerprint' }, 400);
      }

      let result;
      await this.state.storage.transaction(async storage => {
        const count = (await storage.get('count')) || 0;
        const uniqueCount = (await storage.get('uniqueCount')) || 0;
        const fingerprintKey = `unique:${fingerprint}`;
        const alreadySeen = Boolean(await storage.get(fingerprintKey));
        const nextCount = count + 1;
        const nextUniqueCount = alreadySeen ? uniqueCount : uniqueCount + 1;

        await storage.put('count', nextCount);
        if (!alreadySeen) {
          await storage.put('uniqueCount', nextUniqueCount);
          await storage.put(fingerprintKey, new Date().toISOString());
        }

        result = {
          count: nextCount,
          uniqueCount: nextUniqueCount,
          unique: !alreadySeen
        };
      });

      return json(result);
    }

    if (path === '/count') {
      const count = (await this.state.storage.get('count')) || 0;
      const uniqueCount = (await this.state.storage.get('uniqueCount')) || 0;
      return json({ count, uniqueCount });
    }

    return json({ error: 'Not found' }, 404);
  }
}
