/**
 * Forge Routes
 * Persist generated Forge renders for authenticated users.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { updateUser } = require('../services/userService');
const {
  uploadForgeRender,
  deleteForgeRender,
  getForgeRender,
  decodeRenderKey
} = require('../services/r2ForgeRenderClient');

const MAX_FORGE_RENDERS = 10;

function getPreferences(user) {
  return user?.preferences && typeof user.preferences === 'object'
    ? user.preferences
    : {};
}

function getForgeRenders(user) {
  const preferences = getPreferences(user);
  return Array.isArray(preferences.forgeRenders)
    ? preferences.forgeRenders.filter((render) => render && render.key && render.thumbKey)
    : [];
}

router.get('/renders', authMiddleware, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        renders: getForgeRenders(req.user).slice(0, MAX_FORGE_RENDERS)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/renders', authMiddleware, async (req, res, next) => {
  try {
    const imageDataUrl = req.body?.imageDataUrl;
    const thumbDataUrl = req.body?.thumbDataUrl;

    if (!imageDataUrl || !thumbDataUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageDataUrl and thumbDataUrl are required'
      });
    }

    const preferences = getPreferences(req.user);
    const existingRenders = getForgeRenders(req.user);
    const uploadedRender = await uploadForgeRender({
      user: req.user,
      imageDataUrl,
      thumbDataUrl
    });
    const nextRenders = [uploadedRender, ...existingRenders].slice(0, MAX_FORGE_RENDERS);
    const expiredRenders = existingRenders.slice(MAX_FORGE_RENDERS - 1);

    await updateUser(req.user.id, {
      preferences: {
        ...preferences,
        forgeRenders: nextRenders
      }
    });

    expiredRenders.forEach((render) => {
      deleteForgeRender(render).catch((error) => {
        console.warn('Expired Forge render delete failed:', error.message);
      });
    });

    res.json({
      success: true,
      message: 'Forge render saved',
      data: {
        render: uploadedRender,
        renders: nextRenders
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/renders/:encodedKey', async (req, res, next) => {
  try {
    const key = decodeRenderKey(req.params.encodedKey);
    if (!key.startsWith('forge-renders/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid render key'
      });
    }

    const renderResponse = await getForgeRender(key);
    res.set('Content-Type', renderResponse.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'private, max-age=3600');
    const arrayBuffer = await renderResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
