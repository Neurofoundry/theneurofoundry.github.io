# Codex Operational Methods

This is a narrow runbook for the command paths that have actually worked in this project.

Use this file when working on:
- `D:\0___TESTZONE\_theneurofoundry`
- `C:\Users\Neurofoundry\keychain`
- Fly app: `nf-auth-clean-20260219`

## Purpose

Keep live work tight.

Avoid:
- PowerShell eating inline JavaScript
- overcomplicated Fly shell quoting
- touching unrelated workspace junk during deploy
- re-discovering working command paths every session

## Known Good Paths

### 1. Local project work

Primary auth/backend workspace:
- `D:\0___TESTZONE\_theneurofoundry`

Primary desktop app workspace:
- `C:\Users\Neurofoundry\keychain`

### 2. Fly deploy

Run from:
- `D:\0___TESTZONE\_theneurofoundry`

Command:

```powershell
fly deploy -a nf-auth-clean-20260219
```

Healthy shape:
- small build context
- image around the known-good size
- app reaches healthy state

### 3. Fly app env access

Simple command that works:

```powershell
fly ssh console -a nf-auth-clean-20260219 -C printenv
```

Use this only when you truly need live env-backed access.

Do not echo secrets back into chat.

### 4. D1 access that actually works

Best working pattern:
1. read live env from Fly with `printenv`
2. keep values in-process only
3. run local Node against `CloudflareD1Client`

Why:
- avoids brittle remote shell quoting
- avoids PowerShell trying to parse inline JS operators
- keeps database actions deterministic

Code path used:
- `D:\0___TESTZONE\_theneurofoundry\server\services\cloudflareD1Client.js`

### 5. Electron app build

Run from:
- `C:\Users\Neurofoundry\keychain`

Command:

```powershell
npm run build
```

Use this after logic/UI edits in `src-electron`.

## Working File/Code Touchpoints

### Auth/email backend

- `D:\0___TESTZONE\_theneurofoundry\server\routes\auth.js`
- `D:\0___TESTZONE\_theneurofoundry\server\services\emailService.js`
- `D:\0___TESTZONE\_theneurofoundry\server\services\emailTemplates.js`
- `D:\0___TESTZONE\_theneurofoundry\server\config\database.js`
- `D:\0___TESTZONE\_theneurofoundry\server\services\cloudflareD1Client.js`

### Email templates

- `D:\0___TESTZONE\_theneurofoundry\admin_access\email_templates\neurofoundry_activation_template_ember.html`
- `D:\0___TESTZONE\_theneurofoundry\admin_access\email_templates\neurofoundry_password_reset_template_ember.html`
- `D:\0___TESTZONE\_theneurofoundry\admin_access\email_templates\neurofoundry_skeleton_key_pin_reset_template_ember.html`

### Skeleton Key desktop

- `C:\Users\Neurofoundry\keychain\src-electron\main.jsx`
- `C:\Users\Neurofoundry\keychain\src\shell_command_bridge.py`
- `C:\Users\Neurofoundry\keychain\src\skeletonkey_bridge.py`

## Failure Patterns To Avoid

### 1. PowerShell inline JS parsing

Bad pattern:
- giant one-line JS inside PowerShell command strings

Why it breaks:
- PowerShell tries to interpret `||`, `&&`, object literals, and nested quotes

Better:
- use a here-string piped into `node -`
- or set env in PowerShell, then run local Node separately

### 2. Overcomplicated Fly remote shell scripts

Bad pattern:
- deeply nested `fly ssh console -C "sh -lc 'node -e ...'"` command pyramids

Why it breaks:
- quoting gets mangled across Windows -> Fly -> shell -> Node

Better:
- use Fly only for simple commands like `printenv`
- do the actual D1 work locally with the live env loaded in-process

### 3. Placeholder `.env` confusion

The local file:
- `D:\0___TESTZONE\_theneurofoundry\.env`

may only be a placeholder/dev template.

Do not assume it contains the live Cloudflare D1 values.

If D1 calls come back with `undefined` account/database IDs, stop and use live env from Fly.

### 4. Deploy bloat

If deploy context suddenly gets huge again, inspect:
- `.dockerignore`

Known protected exclusions include unrelated media/build folders so Fly does not ship workspace baggage.

## Recommended Operational Sequence

### For backend/email changes

1. Edit local source/template
2. sanity check relevant file
3. deploy with:

```powershell
fly deploy -a nf-auth-clean-20260219
```

4. test real flow
5. check D1 only if needed

### For Skeleton Key desktop changes

1. edit `src-electron/main.jsx`
2. run:

```powershell
npm run build
```

3. live test in app
4. only package after behavior is proven

## Short Version

If working live:
- use Fly for deploy
- use `printenv` for live env
- use local Node for D1 actions
- use project files, not memory guesses
- avoid nested remote quoting unless absolutely necessary
