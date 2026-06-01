/**
 * Transactional email templates
 * Layout inspired by the provided Neurofoundry concept, adapted for email clients.
 */

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
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
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
                    <div style="font-family:Arial, sans-serif; margin-top:6px; font-size:10px; letter-spacing:1.5px; color:#6f6b64;">THE ENGINE IS THE MIND | FOR THE NETWORK YOU DESIGN</div>
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
              <p style="margin:0; color:#4a4a50; font-size:14px; line-height:1.7;">Cheers,</p>
              <p style="margin:4px 0 0 0; color:#2a2a2e; font-size:14px;">The Neurofoundry Team</p>
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
  return renderLayout({
    preheader: 'Verify your Neurofoundry account.',
    heading: 'Verify Email',
    greeting: `Hi ${name || 'there'},`,
    paragraphA: 'Thank you for joining Neurofoundry. Your account is created and ready for activation.',
    paragraphB: 'Before you continue, verify your email address so we can secure your account and enable the full platform.',
    highlightsTitle: 'ACCOUNT ACTIVATION',
    highlights: [
      { label: 'FORGE', text: 'Your workspace was provisioned successfully.' },
      { label: 'BUILD', text: 'Authentication and profile pipeline initialized.' },
      { label: 'DEPLOY', text: 'Email verification required for trusted access.' },
      { label: 'SECURE', text: 'Verification token expires in 24 hours.' }
    ],
    paragraphC: 'Use the button below to complete verification and continue into your account.',
    ctaLabel: 'VERIFY EMAIL ADDRESS',
    ctaUrl: verificationUrl,
    fallbackLabel: 'If the button does not work, use this link:',
    footerNote: 'You received this email because a Neurofoundry account was created with this address.'
  });
}

function renderPasswordResetEmailTemplate({ name, resetUrl }) {
  return renderLayout({
    preheader: 'Reset your Neurofoundry password.',
    heading: 'Reset Password',
    greeting: `Hi ${name || 'there'},`,
    paragraphA: 'We received a request to reset your Neurofoundry password.',
    paragraphB: 'Use the secure reset link below to set a new password. If this was not you, you can ignore this email.',
    highlightsTitle: 'PASSWORD RESET',
    highlights: [
      { label: 'FORGE', text: 'Reset request received and authenticated.' },
      { label: 'BUILD', text: 'One-time token generated for your account.' },
      { label: 'DEPLOY', text: 'Reset link can be used once only.' },
      { label: 'SECURE', text: 'Reset token expires in 1 hour.' }
    ],
    paragraphC: 'Click below to continue with password reset and regain account access.',
    ctaLabel: 'RESET PASSWORD',
    ctaUrl: resetUrl,
    fallbackLabel: 'If the button does not work, use this link:',
    footerNote: 'You received this email because a password reset was requested for your Neurofoundry account.'
  });
}

module.exports = {
  renderVerificationEmailTemplate,
  renderPasswordResetEmailTemplate
};
