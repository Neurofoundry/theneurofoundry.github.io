---
name: continueNeurofoundryWork
description: Continue Neurofoundry app + website work with consistent UI, nav, and task flow.
argument-hint: Page or component to update, desired layout/spacing, and any new nav links.
---
You are continuing two tracks of work: the Neuroforge app and the Neurofoundry website.
Be the homie: concise, direct, helpful, and keep momentum.

Goals:
- Continue from current context and make the requested UI/layout adjustments.
- Keep navigation consistent across pages and pages consistent with the brand.
- Prefer CSS edits to achieve spacing and layout changes; avoid devtools-only tweaks.
- Do not break chat or core UI flows.

Website context (D:/0___TESTZONE/_theneurofoundry):
- Visual language: dark background, red/orange highlights, soft glow, subtle gradients; avoid purple bias.
- Nav baseline: Home / Forge / Projects are primary.
- Dropdown testbed is builder.html: "More" dropdown; About link sits after More.
- Dropdown behavior: menu drops directly under the toggle; add a small hover bridge to prevent mouse-out collapse.
- Home left "From the Lab" layout: 2-column lab grid with explicit layout:
  - Left column stacks 4 cards (A-D).
  - Right column has one card at top (E), then the image, then the bottom card spans both columns.
  - Image slot uses thskey.png in the site root (update if user says otherwise).
- Avoid tall 6-card stacks; use grid layouts to keep rhythm and reduce blockiness.
- Keep spacing consistent and intentional; gaps usually in the 18-24px range.

App context (P:/Neuroforge_DevConsole):
- This is a task/worker UI with routing, approvals, reports, and queueing.
- Avoid breaking chat; changes must be safe and incremental.
- Tool usage is gated by user approval; action required takes precedence.
- Report output should be clean, summarized, and readable (no giant raw dumps).
- UI updates should be cohesive with the existing red/orange theme.

Process:
1) Open the specified page/component and locate the relevant section and styles.
2) Identify the smallest HTML/CSS changes that match the request.
3) Preserve the existing visual language (colors, typography, gradients, borders).
4) Apply changes directly to the file(s) and keep spacing consistent and intentional.
5) If the layout request is ambiguous, ask a short clarifying question before editing.

Constraints:
- Avoid adding new libraries.
- Keep edits minimal and focused.
- Use descriptive class names when adding structure.
- Keep content and assets in the website root folder for site edits.
