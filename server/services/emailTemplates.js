/**
 * Transactional email templates
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_ROOT = path.resolve(__dirname, '..', '..', 'admin_access', 'email_templates');
const ACTIVATION_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, 'neurofoundry_activation_template_ember.html');
const WELCOME_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, 'neurofoundry_welcome_template_ember.html');
const PASSWORD_RESET_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, 'neurofoundry_password_reset_template_ember.html');
const SKELETON_KEY_PIN_RESET_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, 'neurofoundry_skeleton_key_pin_reset_template_ember.html');
const SKELETON_KEY_ACCESS_CODE_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, 'aegres_email_template_external_image.html');
const NEUROFOUNDRY_HOME_URL = 'https://www.theneurofoundry.com';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHighlights(items) {
  return items.map((item) => `
    <tr>
      <td style="padding: 6px 0; font-family: Inter, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #55555d;">
        <span style="display: inline-block; min-width: 64px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #a56a18;">${escapeHtml(item.label)}</span>
        <span>${escapeHtml(item.text)}</span>
      </td>
    </tr>
  `).join('');
}

function replaceTemplateTokens(template, replacements) {
  return Object.entries(replacements).reduce((html, [token, value]) => {
    return html.split(token).join(String(value || ''));
  }, template);
}

function formatRequestLocation(location) {
  const cleanLocation = String(location || '').trim();
  return cleanLocation ? ` in ${escapeHtml(cleanLocation)}` : '';
}

function renderLayout({
  preheader,
  heading,
  greeting,
  paragraphA,
  paragraphB,
  highlightsTitle,
  highlights,
  paragraphC,
  ctaLabel,
  ctaUrl,
  fallbackLabel,
  footerNote
}) {
  const safeUrl = escapeHtml(ctaUrl);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neurofoundry</title>
</head>
<body style="margin:0; padding:0; background:#f0eeeb;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">The Engine is the Mind, for the Network you Design. ${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0eeeb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="width:100%; max-width:680px; border:1px solid #ece9e4; border-radius:10px; overflow:hidden; background:#ffffff;">
          <tr>
            <td style="padding:32px; background:#141416;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="52" valign="top">
                    <div style="width:44px; height:44px; border-radius:999px; background:linear-gradient(135deg,#d4952d 0%,#b7761b 60%,#8f5714 100%); text-align:center; line-height:44px; font-size:18px; font-weight:700; color:#141416;">N</div>
                  </td>
                  <td valign="top">
                    <div style="font-family:Arial, sans-serif; font-size:28px; font-weight:700; letter-spacing:4px; color:#e8e6e1;">NEUROFOUNDRY</div>
                    <div style="font-family:Arial, sans-serif; margin-top:6px; font-size:10px; letter-spacing:1.5px; color:#6f6b64;">THE ENGINE IS THE MIND, FOR THE NETWORK YOU DESIGN</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:38px 32px 16px 32px; font-family:Inter, Arial, sans-serif;">
              <p style="margin:0 0 18px 0; color:#2a2a2e; font-size:15px;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 14px 0; color:#4a4a50; font-size:14px; line-height:1.75;">${escapeHtml(paragraphA)}</p>
              <p style="margin:0 0 26px 0; color:#4a4a50; font-size:14px; line-height:1.75;">${escapeHtml(paragraphB)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="6" valign="top" style="background:linear-gradient(180deg,#d4952d 0%,#b7761b 70%,#8f5714 100%); border-radius:999px;">&nbsp;</td>
                  <td width="14">&nbsp;</td>
                  <td style="background:#faf9f7; border:1px solid #e8e5df; border-radius:8px; padding:16px;">
                    <div style="font-family:Arial, sans-serif; font-size:13px; font-weight:700; letter-spacing:1.2px; color:#2a2a2e; margin-bottom:8px;">
                      ${escapeHtml(highlightsTitle)}
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${renderHighlights(highlights)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 20px 32px; font-family:Inter, Arial, sans-serif;">
              <p style="margin:0 0 20px 0; color:#4a4a50; font-size:14px; line-height:1.75;">${escapeHtml(paragraphC)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:6px; background:linear-gradient(90deg,#b7761b 0%,#a76614 100%);">
                    <a href="${safeUrl}" style="display:inline-block; padding:13px 26px; color:#ffffff; text-decoration:none; font-family:Arial, sans-serif; font-size:13px; font-weight:700; letter-spacing:1.5px;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0 0; color:#7b776f; font-size:12px; line-height:1.6;">${escapeHtml(fallbackLabel)}<br><a href="${safeUrl}" style="color:#8b5514; word-break:break-all;">${safeUrl}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 34px 32px; font-family:Inter, Arial, sans-serif;">
              <p style="margin:0; color:#4a4a50; font-size:14px; line-height:1.7;">Sincerely,</p>
              <p style="margin:4px 0 0 0; color:#2a2a2e; font-size:14px;">The Architect</p>
            </td>
          </tr>

          <tr>
            <td style="background:#f7f6f3; border-top:1px solid #e8e5df; padding:20px 32px;">
              <p style="margin:0 0 8px 0; font-family:Arial, sans-serif; font-size:10px; letter-spacing:2px; color:#9a958e;">NEUROFOUNDRY</p>
              <p style="margin:0; font-family:Inter, Arial, sans-serif; color:#a09a93; font-size:12px; line-height:1.6;">${escapeHtml(footerNote)}</p>
              <p style="margin:8px 0 0 0; font-family:Inter, Arial, sans-serif; color:#8a857e; font-size:12px;">
                <a href="https://www.theneurofoundry.com/privacy-policy.html" style="color:#8a857e;">Privacy</a>
                &nbsp;|&nbsp;
                <a href="https://www.theneurofoundry.com/terms-of-service.html" style="color:#8a857e;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function renderVerificationEmailTemplate({ name, verificationUrl }) {
  const template = fs.readFileSync(ACTIVATION_TEMPLATE_PATH, 'utf8');
  const safeName = escapeHtml(name || 'there');
  const safeVerificationUrl = escapeHtml(verificationUrl);

  return replaceTemplateTokens(template, {
    '[Recipient Name]': safeName,
    '[verification link]': safeVerificationUrl,
    '[privacy link]': 'https://www.theneurofoundry.com/privacy-policy.html',
    '[terms link]': 'https://www.theneurofoundry.com/terms-of-service.html'
  });
}

function renderWelcomeEmailTemplate({ name }) {
  const template = fs.readFileSync(WELCOME_TEMPLATE_PATH, 'utf8');
  const safeName = escapeHtml(name || 'there');
  const safeHomeUrl = escapeHtml(NEUROFOUNDRY_HOME_URL);

  return replaceTemplateTokens(template, {
    '[Recipient Name]': safeName,
    '[verification link]': safeHomeUrl,
    '[privacy link]': 'https://www.theneurofoundry.com/privacy-policy.html',
    '[terms link]': 'https://www.theneurofoundry.com/terms-of-service.html'
  });
}

function renderPasswordResetEmailTemplate({ name, resetUrl, requestLocation }) {
  const template = fs.readFileSync(PASSWORD_RESET_TEMPLATE_PATH, 'utf8');
  const safeName = escapeHtml(name || 'there');
  const safeResetUrl = escapeHtml(resetUrl);

  return replaceTemplateTokens(template, {
    '[Recipient Name]': safeName,
    '[request location]': formatRequestLocation(requestLocation),
    '[reset link]': safeResetUrl,
    '[privacy link]': 'https://www.theneurofoundry.com/privacy-policy.html',
    '[terms link]': 'https://www.theneurofoundry.com/terms-of-service.html'
  });
}

function renderSkeletonKeyPinResetEmailTemplate({ name, code, appName = 'Skeleton Key', requestLocation }) {
  const template = fs.readFileSync(SKELETON_KEY_PIN_RESET_TEMPLATE_PATH, 'utf8');

  return replaceTemplateTokens(template, {
    '[Recipient Name]': escapeHtml(name || 'there'),
    '[AppName]': escapeHtml(appName),
    '[request location]': formatRequestLocation(requestLocation),
    '[pin code]': escapeHtml(code),
    '[privacy link]': 'https://www.theneurofoundry.com/privacy-policy.html',
    '[terms link]': 'https://www.theneurofoundry.com/terms-of-service.html'
  });
}

function renderSkeletonKeyAccessCodeEmailTemplate({ code }) {
  const template = fs.readFileSync(SKELETON_KEY_ACCESS_CODE_TEMPLATE_PATH, 'utf8');

  return replaceTemplateTokens(template, {
    'placeholder="1234"': `value="${escapeHtml(code)}" placeholder="${escapeHtml(code)}"`,
    'Google authentication succeeded. Enter the one-time verification code to continue in Skeleton Key.': 'Neurofoundry account verified. Enter this one-time access code to continue in Skeleton Key.',
    'https://example.com/activate': 'https://www.theneurofoundry.com'
  });
}

module.exports = {
  renderVerificationEmailTemplate,
  renderWelcomeEmailTemplate,
  renderPasswordResetEmailTemplate,
  renderSkeletonKeyPinResetEmailTemplate,
  renderSkeletonKeyAccessCodeEmailTemplate
};
