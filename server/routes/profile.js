/**
 * Profile Routes
 * User profile management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { updateUser, findUserById } = require('../services/userService');
const { uploadProfileAvatar, deleteProfileAvatar, getProfileAvatar } = require('../services/r2AvatarClient');
const multer = require('multer');
const path = require('path');

function getProfileNameParts(user) {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName || lastName || !user.name) {
    return { firstName, lastName };
  }

  const parts = String(user.name).trim().split(/\s+/);
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' ')
  };
}

function isCoordinateLocation(value) {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(String(value || '').trim());
}

function getRequestLocation(req) {
  const city = String(req.headers['cf-ipcity'] || req.headers['x-vercel-ip-city'] || '').trim();
  const region = String(req.headers['cf-region-code'] || req.headers['cf-region'] || req.headers['x-vercel-ip-country-region'] || '').trim();
  const country = String(req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || '').trim();

  if (city && region) return `${city}, ${region}`;
  if (city && country) return `${city}, ${country}`;
  return '';
}

function getProfileLocation(req, profilePreferences) {
  const savedLocation = String(profilePreferences.location || '').trim();
  if (savedLocation && !isCoordinateLocation(savedLocation)) return savedLocation;
  return getRequestLocation(req);
}

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// ============================================
// GET PROFILE
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const preferences = req.user.preferences && typeof req.user.preferences === 'object'
      ? req.user.preferences
      : {};
    const profilePreferences = {
      howHeardAboutNeurofoundry: '',
      ...preferences
    };
    const nameParts = getProfileNameParts(req.user);

    res.json({
      success: true,
      data: {
        profile: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          username: req.user.username,
          avatar: req.user.avatar,
          authProvider: req.user.authProvider || 'local',
          location: getProfileLocation(req, profilePreferences),
          planTier: req.user.planTier || 'free',
          accountStatus: req.user.accountStatus || 'pending_verification',
          preferences: profilePreferences,
          emailVerified: req.user.emailVerified,
          createdAt: req.user.createdAt,
          lastLoginAt: req.user.lastLoginAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// UPDATE PROFILE
// ============================================
router.patch(
  '/',
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/)
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const allowedFields = req.user.authProvider && req.user.authProvider !== 'local'
        ? ['username']
        : [
            'name',
            'firstName',
            'lastName',
            'username'
          ];

      const updates = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const updatedUser = await updateUser(req.user.id, updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile: {
            id: updatedUser.id,
            name: updatedUser.name,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            username: updatedUser.username,
            preferences: updatedUser.preferences || {}
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/avatar/preset',
  [
    body('avatar').trim().matches(/^\/assets\/profile-avatars\/[a-zA-Z0-9._-]+\.(webp|png|jpe?g|gif)$/)
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid avatar selection',
          errors: errors.array()
        });
      }

      const previousPreferences = req.user.preferences && typeof req.user.preferences === 'object'
        ? req.user.preferences
        : {};
      const previousAvatarKey = previousPreferences.r2Avatar?.key;
      const { r2Avatar, ...remainingPreferences } = previousPreferences;
      const updatedUser = await updateUser(req.user.id, {
        avatar: req.body.avatar,
        preferences: remainingPreferences
      });

      if (previousAvatarKey) {
        deleteProfileAvatar(previousAvatarKey).catch((error) => {
          console.warn('Previous R2 avatar delete failed:', error.message);
        });
      }

      res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
          avatar: updatedUser.avatar
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// UPLOAD AVATAR
// ============================================
router.get('/avatar/public/:userId', async (req, res, next) => {
  try {
    const user = await findUserById(req.params.userId);
    const preferences = user?.preferences && typeof user.preferences === 'object'
      ? user.preferences
      : {};
    const avatarKey = preferences.r2Avatar?.key;

    if (!avatarKey) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    const avatarResponse = await getProfileAvatar(avatarKey);
    res.set('Content-Type', avatarResponse.headers.get('content-type') || 'image/webp');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    const arrayBuffer = await avatarResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/avatar',
  upload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const previousPreferences = req.user.preferences && typeof req.user.preferences === 'object'
        ? req.user.preferences
        : {};
      const previousAvatarKey = previousPreferences.r2Avatar?.key;
      const uploadedAvatar = await uploadProfileAvatar({
        file: req.file,
        user: req.user
      });

      await updateUser(req.user.id, {
        avatar: uploadedAvatar.avatarUrl,
        preferences: {
          ...previousPreferences,
          r2Avatar: {
            ...(previousPreferences.r2Avatar || {}),
            key: uploadedAvatar.key,
            avatarUrl: uploadedAvatar.avatarUrl,
            contentType: uploadedAvatar.contentType,
            avatarUploadedAt: uploadedAvatar.uploaded || new Date().toISOString()
          }
        }
      });

      if (previousAvatarKey && previousAvatarKey !== uploadedAvatar.key) {
        deleteProfileAvatar(previousAvatarKey).catch((error) => {
          console.warn('Previous R2 avatar delete failed:', error.message);
        });
      }

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: uploadedAvatar.avatarUrl,
          key: uploadedAvatar.key
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// DELETE AVATAR
// ============================================
router.delete('/avatar', async (req, res, next) => {
  try {
    const previousPreferences = req.user.preferences && typeof req.user.preferences === 'object'
      ? req.user.preferences
      : {};
    const previousAvatarKey = previousPreferences.r2Avatar?.key;
    const { r2Avatar, ...remainingPreferences } = previousPreferences;

    if (previousAvatarKey) {
      await deleteProfileAvatar(previousAvatarKey);
    }

    await updateUser(req.user.id, {
      avatar: null,
      preferences: remainingPreferences
    });

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
