/**
 * Email Service
 * Handles sending verification and password reset emails
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const {
  renderVerificationEmailTemplate,
  renderWelcomeEmailTemplate,
  renderPasswordResetEmailTemplate,
  renderSkeletonKeyPinResetEmailTemplate,
  renderSkeletonKeyAccessCodeEmailTemplate
} = require('./emailTemplates');

let transporterPromise = null;
let transporterMode = 'disabled';
const sentEmailLog = [];

function isPlaceholderValue(value) {
  if (!value) return true;
  const lower = String(value).toLowerCase();
  return (
    lower.includes('your-') ||
    lower.includes('xxxxx') ||
    lower.includes('example') ||
    lower.includes('change-this')
  );
}

function recordSentEmail(entry) {
  sentEmailLog.push({
    ...entry,
    timestamp: new Date().toISOString()
  });
  if (sentEmailLog.length > 50) {
    sentEmailLog.shift();
  }
}

async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    const hasSmtpConfig = !isPlaceholderValue(process.env.SMTP_HOST)
      && !isPlaceholderValue(process.env.SMTP_USER)
      && !isPlaceholderValue(process.env.SMTP_PASSWORD);

    if (hasSmtpConfig) {
      transporterMode = 'smtp';
      console.log('✅ Email service configured (SMTP)');
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }

    if (process.env.NODE_ENV !== 'production' && process.env.DEV_EMAIL_FALLBACK !== 'false') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporterMode = 'ethereal';
        console.log('✅ Email service configured (Ethereal dev fallback)');
        return nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      } catch (error) {
        console.warn('⚠️  Failed to initialize Ethereal dev email fallback:', error.message);
      }
    }

    transporterMode = 'disabled';
    console.warn('⚠️  Email service not configured. Email functionality disabled.');
    return null;
  })();

  return transporterPromise;
}

/**
 * Generate verification token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send verification email
 */
async function sendVerificationEmail(user) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('Email service not configured - skipping verification email');
    return {
      sent: false,
      mode: transporterMode,
      reason: 'email_service_not_configured'
    };
  }

  const token = generateVerificationToken();

  // Store token with user (implement this in userService)
  const { updateUser } = require('./userService');
  await updateUser(user.id, {
    verificationToken: token,
    verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });

  const verificationBase = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  const verificationUrlObj = new URL('/members/verify-email/', verificationBase);
  verificationUrlObj.searchParams.set('token', token);
  const verificationUrl = verificationUrlObj.toString();

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Verify your Neurofoundry account',
    html: renderVerificationEmailTemplate({
      name: user.name,
      verificationUrl
    })
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  recordSentEmail({
    type: 'verification',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  });

  console.log(`Verification email sent to ${user.email}`);
  if (previewUrl) {
    console.log(`📧 Ethereal preview URL: ${previewUrl}`);
  }

  return {
    sent: true,
    type: 'verification',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  };
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, context = {}) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('Email service not configured - skipping password reset email');
    return {
      sent: false,
      mode: transporterMode,
      reason: 'email_service_not_configured'
    };
  }

  const token = generateVerificationToken();

  // Store token with user
  const { updateUser } = require('./userService');
  await updateUser(user.id, {
    resetPasswordToken: token,
    resetPasswordExpires: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
  });

  const resetBase = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  const resetUrlObj = new URL('/members/reset-password/', resetBase);
  resetUrlObj.searchParams.set('token', token);
  const resetUrl = resetUrlObj.toString();

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Reset your Neurofoundry password',
    html: renderPasswordResetEmailTemplate({
      name: user.name,
      resetUrl,
      requestLocation: context.requestLocation
    })
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  recordSentEmail({
    type: 'password_reset',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  });

  console.log(`Password reset email sent to ${user.email}`);
  if (previewUrl) {
    console.log(`📧 Ethereal preview URL: ${previewUrl}`);
  }

  return {
    sent: true,
    type: 'password_reset',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  };
}

async function sendWelcomeEmail(user) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('Email service not configured - skipping welcome email');
    return {
      sent: false,
      mode: transporterMode,
      reason: 'email_service_not_configured'
    };
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Welcome to Neurofoundry',
    html: renderWelcomeEmailTemplate({
      name: user.name
    })
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  recordSentEmail({
    type: 'welcome',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  });

  console.log(`Welcome email sent to ${user.email}`);
  if (previewUrl) {
    console.log(`Ethereal preview URL: ${previewUrl}`);
  }

  return {
    sent: true,
    type: 'welcome',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  };
}

async function sendSkeletonKeyPinResetEmail(user, code, context = {}) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('Email service not configured - skipping Skeleton Key PIN reset email');
    return {
      sent: false,
      mode: transporterMode,
      reason: 'email_service_not_configured'
    };
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Your Skeleton Key PIN reset code',
    html: renderSkeletonKeyPinResetEmailTemplate({
      name: user.name,
      code,
      appName: context.appName || 'Skeleton Key',
      requestLocation: context.requestLocation
    })
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  recordSentEmail({
    type: 'skeleton_key_pin_reset',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  });

  console.log(`Skeleton Key PIN reset email sent to ${user.email}`);
  if (previewUrl) {
    console.log(`Ethereal preview URL: ${previewUrl}`);
  }

  return {
    sent: true,
    type: 'skeleton_key_pin_reset',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  };
}

async function sendSkeletonKeyAccessCodeEmail(user, code) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('Email service not configured - skipping Skeleton Key access code email');
    return {
      sent: false,
      mode: transporterMode,
      reason: 'email_service_not_configured'
    };
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Your Skeleton Key access code',
    html: renderSkeletonKeyAccessCodeEmailTemplate({ code })
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  recordSentEmail({
    type: 'skeleton_key_access_code',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  });

  console.log(`Skeleton Key access code email sent to ${user.email}`);
  if (previewUrl) {
    console.log(`Ethereal preview URL: ${previewUrl}`);
  }

  return {
    sent: true,
    type: 'skeleton_key_access_code',
    from: fromAddress,
    to: user.email,
    messageId: info.messageId,
    previewUrl,
    mode: transporterMode
  };
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSkeletonKeyPinResetEmail,
  sendSkeletonKeyAccessCodeEmail,
  getLastSentEmail: () => sentEmailLog[sentEmailLog.length - 1] || null,
  getSentEmailLog: () => [...sentEmailLog]
};
