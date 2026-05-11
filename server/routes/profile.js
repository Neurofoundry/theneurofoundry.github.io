/**
 * Profile Routes
 * User profile management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { updateUser } = require('../services/userService');
const { uploadProfileAvatar, deleteProfileAvatar } = require('../services/cloudflareImagesClient');
const multer = require('multer');
const path = require('path');

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

    res.json({
      success: true,
      data: {
        profile: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          username: req.user.username,
          avatar: req.user.avatar,
          location: profilePreferences.location || '',
          planTier: req.user.planTier || 'free',
          accountStatus: req.user.accountStatus || 'pending_verification',
          preferences: profilePreferences,
          emailVerified: req.user.emailVerified,
          createdAt: req.user.createdAt
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

      const allowedFields = [
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

// ============================================
// UPLOAD AVATAR
// ============================================
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
      const previousAvatarImageId = previousPreferences.cloudflareImages?.avatarImageId;
      const uploadedAvatar = await uploadProfileAvatar({
        file: req.file,
        user: req.user
      });

      await updateUser(req.user.id, {
        avatar: uploadedAvatar.avatarUrl,
        preferences: {
          ...previousPreferences,
          cloudflareImages: {
            ...(previousPreferences.cloudflareImages || {}),
            avatarImageId: uploadedAvatar.id,
            avatarUrl: uploadedAvatar.avatarUrl,
            avatarUploadedAt: uploadedAvatar.uploaded || new Date().toISOString()
          }
        }
      });

      if (previousAvatarImageId && previousAvatarImageId !== uploadedAvatar.id) {
        deleteProfileAvatar(previousAvatarImageId).catch((error) => {
          console.warn('Previous Cloudflare avatar delete failed:', error.message);
        });
      }

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: uploadedAvatar.avatarUrl,
          imageId: uploadedAvatar.id
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
    const previousAvatarImageId = previousPreferences.cloudflareImages?.avatarImageId;
    const { cloudflareImages, ...remainingPreferences } = previousPreferences;

    if (previousAvatarImageId) {
      await deleteProfileAvatar(previousAvatarImageId);
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
