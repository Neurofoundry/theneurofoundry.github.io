/**
 * Profile Routes
 * User profile management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { updateUser } = require('../services/userService');
const multer = require('multer');
const path = require('path');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
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
          bio: req.user.bio,
          location: req.user.location,
          website: req.user.website,
          company: req.user.company,
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
    body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('location').optional().trim().isLength({ max: 100 }),
    body('website').optional().trim().isURL(),
    body('company').optional().trim().isLength({ max: 100 })
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
        'username',
        'bio',
        'location',
        'website',
        'company'
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
            bio: updatedUser.bio,
            location: updatedUser.location,
            website: updatedUser.website,
            company: updatedUser.company
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

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      await updateUser(req.user.id, {
        avatar: avatarUrl
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: avatarUrl
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
    await updateUser(req.user.id, {
      avatar: null
    });

    // TODO: Delete actual file from storage

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
