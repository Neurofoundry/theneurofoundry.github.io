# Neurofoundry Template Spacing Reference

Source skill:
`C:\Users\Neurofoundry\.agents\skills\neurofoundry-templates\SKILL.md`

Pattern: Neurofoundry dark ember layout rhythm.

Use this when matching Neurofoundry page, auth, email, or header spacing without redesigning.

## Global Site Spacing

- Body top padding on current root homepage: `58px`
- Shared horizontal page/header padding: `clamp(14px, 3vw, 24px)`
- Header container height: `64px`
- Header mobile height: `50px`
- Header brand icon box: `36px x 36px`
- Header brand image: `22px x 22px`
- Fixed header uses compact right-aligned nav links.
- Header bottom border uses warm Neurofoundry accent.

## Account/Auth Page Shell

Use the shared account shell pattern rather than duplicating layout CSS.

```css
.nf-account-main {
  padding: clamp(28px, 6vw, 64px) clamp(14px, 3vw, 24px);
}

.nf-account-shell {
  gap: 18px;
}
```

Auth/account page rhythm:

- Body top padding: `64px`
- Main content padding: `clamp(28px, 6vw, 64px) clamp(14px, 3vw, 24px)`
- Login/reset width: `min(420px, 100%)`
- Signup width: `min(520px, 100%)`
- Shell gap between heading and card: `18px`
- Separate functional blocks should be separate stacked `.nf-account-card` windows.

## Account Card

```css
.nf-account-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: clamp(24px, 5vw, 32px);
  box-shadow: 9px 11px 12px rgba(0, 0, 0, 0.62);
}
```

Preserve:

- Compact `8px` card radius
- Tight bottom-right shadow
- Centered constrained forms/cards
- Dark surfaces with warm ember/orange accents

Avoid:

- Oversized rounded corners
- Blue-heavy palettes
- Split-marketing layouts
- Extra decorative sections unless already present in the source file

## Account Heading

```css
.nf-account-heading h1 {
  font-size: clamp(34px, 5vw, 44px);
}
```

Heading rhythm:

- Desktop heading aligns top-right above the frame.
- Mobile heading left-aligns.
- Subtitle sits close to the card.
- Subtitle lines should not use trailing periods unless copy requires it.

## Form Controls

Inputs:

```css
input,
select,
textarea {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #2c333a;
  background: #0f1113;
  font-size: 14px;
}
```

Labels:

```css
label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
```

Primary submit buttons:

```css
button[type="submit"],
.primary-button {
  width: 100%;
  border-radius: 8px;
  border: 2px solid #a2362f;
  font: 700 14px system-ui, sans-serif;
}
```

## Signup Layout

```css
.signup-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.social-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
```

## Email Template Shell

Email shell:

- Outer background: `#090b0d`
- Max shell width: `640px`
- Header padding: `24px 28px`
- Content padding: `34px 28px 28px 28px`
- Footer padding: `20px 28px 28px 28px`
- Shell/card surfaces:
  - Shell: `#12161a`
  - Header/card: `#0f1113`
  - Footer: `#0b0d10`

## Email Header

- Icon cell width: `48px`
- Anvil image: `40px x 40px`
- Text block left padding: `10px`
- Title: `24px / 28px`, bold, white, `letter-spacing: 1px`
- Slogan: `11px / 15px`, warm accent `#ffb5ad`, `letter-spacing: 1.4px`

## Email Cards

```css
.email-card {
  background-color: #0f1113;
  border: 1px solid #2c333a;
}
```

Email content card rhythm:

- Kicker labels: uppercase, `11px`, `letter-spacing: 1.8px`
- Welcome/activation label column: `120px`
- Description text: `13px / 20px`

## Email CTA

```css
.email-cta {
  background: #e0473c;
  color: #ffffff;
  padding: 14px 28px;
  font: 700 14px/18px Arial, sans-serif;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
```

CTA shape:

- Compact rectangular button
- Not a pill
- Warm ember red background
- White uppercase text

## Closest Source Files

- Root homepage/header authority: `D:\0___TESTZONE\_theneurofoundry\index.html`
- Shared header CSS: `D:\0___TESTZONE\_theneurofoundry\common\site-header.css`
- Shared account shell CSS: `D:\0___TESTZONE\_theneurofoundry\common\account-shell.css`
- Login: `D:\0___TESTZONE\_theneurofoundry\members\login\index.html`
- Signup: `D:\0___TESTZONE\_theneurofoundry\members\signup\index.html`
- Profile: `D:\0___TESTZONE\_theneurofoundry\members\profile\index.html`
- Reset password: `D:\0___TESTZONE\_theneurofoundry\members\reset-password\index.html`
- Ember emails: `D:\0___TESTZONE\_theneurofoundry\admin_access\email_templates\`

