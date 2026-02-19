/**
 * Email Service
 * Handles sending verification and password reset emails
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
  const verificationUrlObj = new URL('/verify-email.html', verificationBase);
  verificationUrlObj.searchParams.set('token', token);
  const verificationUrl = verificationUrlObj.toString();

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Verify your Neurofoundry account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #0f1113; color: #e6e9ee; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: 800; color: #e0473c; }
          .content { background: #1a1d21; border: 1px solid rgba(224, 71, 60, 0.3); border-radius: 12px; padding: 40px; }
          h1 { color: #fff; font-size: 24px; margin-top: 0; }
          p { line-height: 1.6; color: #c9d0d8; }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(180deg, #ff7b6e 0%, #e9584d 48%, #d23d33 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6a7178; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">NEUROFOUNDRY</div>
          </div>
          <div class="content">
            <h1>Welcome to Neurofoundry!</h1>
            <p>Hi ${user.name || 'there'},</p>
            <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e0473c;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with Neurofoundry, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Neurofoundry. Forged with intent.</p>
          </div>
        </div>
      </body>
      </html>
    `
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
async function sendPasswordResetEmail(user) {
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

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@neurofoundry.local';
  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject: 'Reset your Neurofoundry password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #0f1113; color: #e6e9ee; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: 800; color: #e0473c; }
          .content { background: #1a1d21; border: 1px solid rgba(224, 71, 60, 0.3); border-radius: 12px; padding: 40px; }
          h1 { color: #fff; font-size: 24px; margin-top: 0; }
          p { line-height: 1.6; color: #c9d0d8; }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(180deg, #ff7b6e 0%, #e9584d 48%, #d23d33 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6a7178; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">NEUROFOUNDRY</div>
          </div>
          <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hi ${user.name || 'there'},</p>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e0473c;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Neurofoundry. Forged with intent.</p>
          </div>
        </div>
      </body>
      </html>
    `
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

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  getLastSentEmail: () => sentEmailLog[sentEmailLog.length - 1] || null,
  getSentEmailLog: () => [...sentEmailLog]
};
