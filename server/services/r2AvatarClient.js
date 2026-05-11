/**
 * Cloudflare R2 client for profile/avatar uploads.
 */

const crypto = require('crypto');

const REGION = 'auto';
const SERVICE = 's3';

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET || 'profile-avatar';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || '';

  return { accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl };
}

function assertR2Config(config) {
  if (!config.accountId || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cloudflare R2 avatar storage is not configured');
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

function makeAvatarKey(user, contentType) {
  const extension = contentType === 'image/png' ? 'png' : 'webp';
  return `avatars/${user.id}.${extension}`;
}

function makeAvatarUrl(config, key, userId) {
  const version = Date.now();
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, '')}/${key}?v=${version}`;
  }
  return `/api/profile/avatar/public/${encodeURIComponent(userId)}?v=${version}`;
}

async function uploadProfileAvatar({ file, user }) {
  const config = getR2Config();
  assertR2Config(config);

  const contentType = file.mimetype === 'image/png' ? 'image/png' : 'image/webp';
  const key = makeAvatarKey(user, contentType);
  const body = Buffer.from(file.buffer);
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
      'cache-control': 'public, max-age=31536000, immutable'
    },
    body
  });

  if (!response.ok) {
    throw new Error(await parseR2Error(response));
  }

  return {
    id: key,
    key,
    contentType,
    avatarUrl: makeAvatarUrl(config, key, user.id),
    uploaded: new Date().toISOString()
  };
}

async function deleteProfileAvatar(key) {
  if (!key) return;

  const config = getR2Config();
  assertR2Config(config);
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
}

async function getProfileAvatar(key) {
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

module.exports = {
  uploadProfileAvatar,
  deleteProfileAvatar,
  getProfileAvatar
};
