# Registration Contract

This document is the working reference for how Neurofoundry account registration currently works in production, what fields are expected, what is written to the database, and how this flow should be extended later for other verification sources and outbound email types.

## Purpose

The current registration system is designed to:

- create a user account in the D1 `users` table
- send a verification email
- require email verification before the account is treated as active
- avoid exposing auth tokens or setting a login cookie during registration

This applies to the current Fly-hosted API at:

- `https://api.theneurofoundry.com/api`

## Current Registration Flow

1. Client submits `POST /api/auth/register`
2. API validates required fields
3. API creates the user row in D1
4. API assigns default account fields
5. API generates a verification token
6. API sends the activation email
7. User clicks the verification link
8. API verifies the token
9. API marks:
   - `email_verified = 1`
   - `account_status = active`

## Registration Endpoint

Route:

```text
POST /api/auth/register
```

Expected JSON body:

```json
{
  "email": "person@example.com",
  "password": "Password091611!!",
  "name": "Adam Weber"
}
```

Required fields:

- `email`
- `password`
- `name`

Current signup page:

- [signup.html](D:/0___TESTZONE/_theneurofoundry/signup.html)

Signup page fields:

- `firstName`
- `lastName`
- `email`
- `password`
- `confirmPassword`
- `terms`

Fields intentionally not used:

- username/codename
- access tier/account type

Validation rules:

- `email` must be a valid email address
- `password` must be at least 10 characters
- `password` must include at least one capital letter
- `password` must include at least one number
- `password` must include at least one special character
- `name` must not be empty

## Registration Response Contract

Successful registration returns:

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "person@example.com",
      "name": "Adam Weber",
      "emailVerified": false
    }
  }
}
```

Important security rule:

- registration must not return `accessToken`
- registration must not return `refreshToken`
- registration must not set an auth cookie

Tokens are only appropriate after a valid login or other approved authenticated flow.

## Users Table Contract

The current `users` table supports these important account fields:

- `email`
- `name`
- `password`
- `auth_provider`
- `auth_provider_id`
- `email_verified`
- `role`
- `plan_tier`
- `account_status`
- `billing_id`
- `last_login_at`
- `created_at`
- `updated_at`
- `verification_token`
- `verification_token_expires`
- `reset_password_token`
- `reset_password_expires`

## Current Field Defaults

For local email/password registration, new users are created with:

- `auth_provider = local`
- `email_verified = 0`
- `role = user`
- `plan_tier = free`
- `account_status = pending_verification`
- `billing_id = null`

When email verification succeeds:

- `email_verified = 1`
- `account_status = active`
- `verification_token = null`
- `verification_token_expires = null`

## Allowed Values

These are the currently intended values.

### `role`

Allowed:

- `admin`
- `support`
- `user`

Current default:

- `user`

### `plan_tier`

Allowed:

- `pro`
- `free`
- `trial`

Current default:

- `free`

### `account_status`

Allowed:

- `active`
- `pending_verification`
- `suspended`
- `disabled`

Current defaults:

- unverified account -> `pending_verification`
- verified account -> `active`

### `billing_id`

Allowed:

- `null`
- external billing/customer identifier later

Current default:

- `null`

## Verification Email Contract

Current verification email behavior:

- email is triggered immediately after successful registration
- email contains a verification link
- verification link points to the frontend verification page
- frontend verification page calls the API token verification route

Current editable verification template:

- [neurofoundry_activation_template_ember.html](D:/0___TESTZONE/_theneurofoundry/admin_access/email_templates/neurofoundry_activation_template_ember.html)

Current template renderer:

- [server/services/emailTemplates.js](D:/0___TESTZONE/_theneurofoundry/server/services/emailTemplates.js)

Current email sender:

- [server/services/emailService.js](D:/0___TESTZONE/_theneurofoundry/server/services/emailService.js)

Current registration route:

- [server/routes/auth.js](D:/0___TESTZONE/_theneurofoundry/server/routes/auth.js)

Current user data logic:

- [server/services/userService.js](D:/0___TESTZONE/_theneurofoundry/server/services/userService.js)

## Welcome Email Contract

Current welcome email behavior:

- welcome email is sent only after successful email verification
- already-verified accounts do not trigger another welcome email from a cleared verification token
- welcome email is informational and does not issue auth credentials

Current editable welcome template:

- [neurofoundry_welcome_template_ember.html](D:/0___TESTZONE/_theneurofoundry/admin_access/email_templates/neurofoundry_welcome_template_ember.html)

## Password Reset Contract

Current password reset request route:

```text
POST /api/auth/forgot-password
```

Expected JSON body:

```json
{
  "email": "person@example.com"
}
```

Password reset rules:

- public response is generic and must not reveal whether an account exists
- reset emails are sent only for verified users
- reset links point to `reset-password.html?token=...`
- reset tokens expire after 1 hour
- reset flow does not log the user in automatically
- invalid or missing reset links show an email field to request a new reset link
- password changes require a valid reset token; email alone must not update a password
- new passwords follow the same 10-character/capital/number/special rule as registration

Current password reset page:

- [reset-password.html](D:/0___TESTZONE/_theneurofoundry/reset-password.html)

Current password reset token lookup route:

```text
GET /api/auth/reset-password/:token
```

Purpose:

- lets the reset page show the account email associated with a valid token
- does not consume the reset token
- returns only the email needed by the page

Current password update route:

```text
POST /api/auth/reset-password
```

Expected JSON body:

```json
{
  "token": "reset-token",
  "password": "new-password"
}
```

Current editable password reset email template:

- [neurofoundry_password_reset_template_ember.html](D:/0___TESTZONE/_theneurofoundry/admin_access/email_templates/neurofoundry_password_reset_template_ember.html)

## Skeleton Key PIN Reset Contract

Current PIN reset request route:

```text
POST /api/auth/skeleton-key/pin-reset/request
```

Expected JSON body:

```json
{
  "email": "person@example.com"
}
```

PIN reset rules:

- public response is generic
- email contains a generated 6-digit PIN reset code
- code expires after 10 minutes
- email must not include a raw IP address
- email must not include an action button or reset link

Current PIN reset verify route:

```text
POST /api/auth/skeleton-key/pin-reset/verify
```

Expected JSON body:

```json
{
  "email": "person@example.com",
  "code": "123456"
}
```

Current editable PIN reset email template:

- [neurofoundry_skeleton_key_pin_reset_template_ember.html](D:/0___TESTZONE/_theneurofoundry/admin_access/email_templates/neurofoundry_skeleton_key_pin_reset_template_ember.html)

## Auth Page Visual Contract

Current visual contract:

- [AUTH_VISUAL_CONTRACT.md](D:/0___TESTZONE/_theneurofoundry/AUTH_VISUAL_CONTRACT.md)

Shared header CSS:

- [shared/neurofoundry-header.css](D:/0___TESTZONE/_theneurofoundry/shared/neurofoundry-header.css)

Shared header asset:

- [assets/ui/anvil.png](D:/0___TESTZONE/_theneurofoundry/assets/ui/anvil.png)

Current auth header links:

- `Home`
- `Projects`
- `Technology`
- `Downloads`
- `About`

## Verification Sources Later

This document should remain the source contract even if more verification sources are added later.

Examples:

- email verification
- password reset
- PIN reset
- magic link
- Google-authenticated account setup
- other OAuth-linked identity confirmation

The rule should stay consistent:

- account creation contract stays stable
- verification event changes account state
- outbound email template can vary by message type
- auth tokens should only be issued by the proper authenticated flow

## Future Email Types

This same system can be reused for:

- verification email
- password reset email
- Skeleton Key PIN reset email
- welcome email
- billing notices
- account suspension/reactivation notices

Recommended pattern:

1. keep template HTML editable in standalone files
2. keep token/code insertion in the renderer layer
3. keep delivery logic in `emailService.js`
4. keep business-state updates in `userService.js` or the route/service that owns the workflow

## Practical Rules

- Registration creates the account.
- Verification activates the account.
- Login issues credentials.
- Reset flows must not silently log a user in unless explicitly intended.
- Template changes should not require rewriting core registration logic.
- Field defaults must remain predictable and easy to audit.

## Current Production Truth

As of April 20, 2026:

- registration is live
- verification email is live
- verification sets `email_verified = 1`
- verification sets `account_status = active`
- registration no longer exposes auth tokens
- registration no longer sets auth cookies
