/**
 * Cloudflare Images API client for profile/avatar uploads.
 */

function getImagesConfig() {
  const accountId = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  const requireSignedURLs = String(process.env.CLOUDFLARE_IMAGES_REQUIRE_SIGNED_URLS || 'false') === 'true';

  return { accountId, apiToken, requireSignedURLs };
}

function assertImagesConfig(config) {
  if (!config.accountId || !config.apiToken) {
    throw new Error('Cloudflare Images is not configured');
  }
}

function pickVariant(variants, preferredVariant = process.env.CLOUDFLARE_IMAGES_AVATAR_VARIANT || 'public') {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  return variants.find((variant) => variant.endsWith(`/${preferredVariant}`)) || variants[0];
}

async function uploadProfileAvatar({ file, user }) {
  const config = getImagesConfig();
  assertImagesConfig(config);

  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  const metadata = {
    source: 'neurofoundry-profile-avatar',
    userId: user.id,
    email: user.email || ''
  };

  formData.append('file', blob, file.originalname || 'avatar');
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('requireSignedURLs', String(config.requireSignedURLs));

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiToken}`
      },
      body: formData
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Cloudflare Images token is missing Cloudflare Images Edit permission');
    }

    const message = payload?.errors?.[0]?.message
      || payload?.messages?.[0]?.message
      || `Cloudflare Images upload failed (${response.status})`;
    throw new Error(message);
  }

  const image = payload.result || {};
  const avatarUrl = pickVariant(image.variants);
  if (!image.id || !avatarUrl) {
    throw new Error('Cloudflare Images upload did not return a usable avatar URL');
  }

  return {
    id: image.id,
    filename: image.filename,
    uploaded: image.uploaded,
    variants: image.variants || [],
    avatarUrl
  };
}

async function deleteProfileAvatar(imageId) {
  if (!imageId) return;

  const config = getImagesConfig();
  assertImagesConfig(config);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1/${encodeURIComponent(imageId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${config.apiToken}`
      }
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Cloudflare Images token is missing Cloudflare Images Edit permission');
    }

    const message = payload?.errors?.[0]?.message
      || payload?.messages?.[0]?.message
      || `Cloudflare Images delete failed (${response.status})`;
    throw new Error(message);
  }
}

module.exports = {
  uploadProfileAvatar,
  deleteProfileAvatar
};
