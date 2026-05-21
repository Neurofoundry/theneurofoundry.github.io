/**
 * Cloudflare R2 client for Forge render persistence.
 */

const crypto = require('crypto');

const REGION = 'auto';
const SERVICE = 's3';

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const bucket = process.env.R2_FORGE_BUCKET || 'forge-renders';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  return { accountId, bucket, accessKeyId, secretAccessKey };
}

function assertR2Config(config) {
  if (!config.accountId || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cloudflare R2 Forge render storage is not configured');
  }
}

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function sha256(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function rfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function signR2Request({ method, config, key, body = Buffer.alloc(0), contentType = '' }) {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const pathname = `/${config.bucket}/${key.split('/').map(rfc3986).join('/')}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };

  if (contentType) {
    headers['content-type'] = contentType;
  }

  const signedHeaderKeys = Object.keys(headers).sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders = signedHeaderKeys.map((header) => `${header}:${headers[header]}\n`).join('');
  const canonicalRequest = [method, pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');

  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${host}${pathname}`,
    headers
  };
}

async function parseR2Error(response) {
  const text = await response.text().catch(() => '');
  const message = text.match(/<Message>([^<]+)<\/Message>/i)?.[1];
  return message || `Cloudflare R2 request failed (${response.status})`;
}

function decodeDataUrl(dataUrl, fallbackContentType = 'image/png') {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Expected a base64 image data URL');
  }

  return {
    contentType: match[1] || fallbackContentType,
    body: Buffer.from(match[2], 'base64')
  };
}

function encodeKey(key) {
  return Buffer.from(key, 'utf8').toString('base64url');
}

function makeRenderUrl(key) {
  return `/api/forge/renders/${encodeKey(key)}`;
}

function makeRenderKeys(userId) {
  const id = crypto.randomUUID();
  const now = Date.now();
  return {
    id,
    imageKey: `forge-renders/${userId}/${now}-${id}.png`,
    thumbKey: `forge-renders/${userId}/${now}-${id}-thumb.jpg`
  };
}

async function putObject({ key, dataUrl, cacheControl }) {
  const config = getR2Config();
  assertR2Config(config);
  const { contentType, body } = decodeDataUrl(dataUrl);
  const signed = signR2Request({
    method: 'PUT',
    config,
    key,
    body,
    contentType
  });

  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: {
      ...signed.headers,
      'cache-control': cacheControl || 'private, max-age=31536000, immutable'
    },
    body
  });

  if (!response.ok) {
    throw new Error(await parseR2Error(response));
  }

  return { key, contentType, size: body.length };
}

async function uploadForgeRender({ user, imageDataUrl, thumbDataUrl }) {
  if (!user?.id) {
    throw new Error('User is required for Forge render upload');
  }
  if (!imageDataUrl || !thumbDataUrl) {
    throw new Error('Forge render upload requires image and thumbnail data');
  }

  const keys = makeRenderKeys(user.id);
  const image = await putObject({
    key: keys.imageKey,
    dataUrl: imageDataUrl,
    cacheControl: 'private, max-age=31536000, immutable'
  });
  const thumb = await putObject({
    key: keys.thumbKey,
    dataUrl: thumbDataUrl,
    cacheControl: 'private, max-age=31536000, immutable'
  });
  const uploaded = new Date().toISOString();

  return {
    id: keys.id,
    key: image.key,
    thumbKey: thumb.key,
    url: makeRenderUrl(image.key),
    thumbUrl: makeRenderUrl(thumb.key),
    contentType: image.contentType,
    thumbContentType: thumb.contentType,
    size: image.size,
    thumbSize: thumb.size,
    uploaded
  };
}

async function deleteForgeRender(render) {
  const config = getR2Config();
  assertR2Config(config);
  const keys = [render?.key, render?.thumbKey].filter(Boolean);

  await Promise.all(keys.map(async (key) => {
    const signed = signR2Request({
      method: 'DELETE',
      config,
      key
    });
    const response = await fetch(signed.url, {
      method: 'DELETE',
      headers: signed.headers
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(await parseR2Error(response));
    }
  }));
}

async function getForgeRender(key) {
  const config = getR2Config();
  assertR2Config(config);
  const signed = signR2Request({
    method: 'GET',
    config,
    key
  });

  const response = await fetch(signed.url, {
    headers: signed.headers
  });

  if (!response.ok) {
    const error = new Error(await parseR2Error(response));
    error.statusCode = response.status === 404 ? 404 : 502;
    throw error;
  }

  return response;
}

function decodeRenderKey(encodedKey) {
  return Buffer.from(String(encodedKey || ''), 'base64url').toString('utf8');
}

module.exports = {
  uploadForgeRender,
  deleteForgeRender,
  getForgeRender,
  decodeRenderKey
};
