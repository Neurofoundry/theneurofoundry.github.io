# Neurofoundry Auth Visual Contract

This file captures the current visual rules for the Neurofoundry auth pages so login, verification, password reset, and later account pages can stay consistent.

## Source Pages

- `login.html`
- `reset-password.html`
- `verify-email.html`
- `signup.html`

## Favicon

Touched auth pages should include:

```html
<link rel="icon" type="image/png" href="assets/ui/anvil.png">
```

## Header

Shared header CSS:

- `shared/neurofoundry-header.css`

Header structure:

- black fixed header
- anvil icon from `assets/ui/anvil.png`
- full `NEUROFOUNDRY` wordmark visible on desktop and mobile
- nav links: `Home`, `Projects`, `Technology`, `Downloads`, `About`
- bottom line uses `#e0473c`

## Color Layers

Use the same dark hierarchy as the email templates:

- outer page background: `#090b0d`
- main card/surface: `#12161a`
- inner/input modules: `#0f1113`
- footer surface: `#0b0d10`
- separators and borders: `#20262c`, `#2a2f35`, `#2c333a`
- primary accent: `#e0473c`
- soft accent: `#ffb5ad`
- primary text: `#e7ebef`
- muted text: `#9aa3ad`

Avoid the older orange family:

- `#d85d2c`
- `#b34722`
- `#ee8450`

## Layout And Spacing

Use the responsive sizing pattern from `main-preview-edit/index_responsive.html`:

- body uses `width: 100%` and `overflow-x: hidden`
- fixed header height is `64px` desktop and `58px` mobile
- page padding uses `clamp(28px, 6vw, 64px) clamp(14px, 3vw, 24px)`
- auth form max width is `min(420px, 100%)`
- card padding uses `clamp(24px, 5vw, 32px)`
- border radius should stay at `8px`

## Effects

Keep effects subtle:

- cursor glow: `260px` by `260px`
- cursor glow opacity: `0.72`
- cursor glow red alpha: `rgba(224, 71, 60, 0.035)`
- card shadow: `0 12px 34px rgba(0, 0, 0, 0.26)`
- focus ring: `0 0 0 2px rgba(224, 71, 60, 0.12)`

The page should read as layered and polished, not red-glowing.
