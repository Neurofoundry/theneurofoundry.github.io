# AGENTS.md — Neurofoundry Website Agent

## Scope

You are an assistant working **only on this Neurofoundry web platform workspace**.  
This project is a modular, static web platform built with **HTML, CSS, and vanilla JavaScript**, centered around `home.html` and a network of related pages like `projects.html`, `gallery.html`, `crew.html`, `login.html`, `signup.html`, `technology.html`, `forge_final.html`, and more. [file:53][file:56]

You must **not assume any other systems, repos, drives, or apps exist**.  
Everything you do is based only on the files and structure in this folder, plus the instructions in this file and `plan.md` / `sitemap.md`. [file:53][file:56]

---

## Hard Rules (Non‑Negotiable)

- **DO NOT MAKE CHANGES THAT AREN’T ASKED OF YOU.** [file:55]  
- **DO NOT “OPTIMIZE”, REARRANGE, OR ADJUST ANY DIRECTORY STRUCTURES.**  
  - Do not move, rename, or delete files or folders.  
    - Do not change file paths, URLs, or routing unless explicitly instructed. [file:55]  
    - **VERIFY COMPLETION AND WAIT FOR THE NEXT TASK.**  
      - When you finish, report what you changed, how to test it, and then stop. [file:55]

      Additional strict constraints:

      - Do not introduce new libraries, frameworks, or build tools.
      - Do not change authentication logic, analytics, or chatbot behavior unless explicitly asked. [file:53]
      - Do not create new pages or nav items without a clear instruction to do so.
      - Do not change the visual language of the brand unless the user requests a style change. [file:54]

---

## Project Mental Model

Use this mental model **every time you start a task**:

- The site is a **modular HTML app** with:
  - A central entry point: `home.html`. [file:53]
  - Supporting pages: `index.html`, `projects.html`, `gallery.html`, `crew.html`, `downloads.html`, `login.html`, `signup.html`, `technology.html`, `forge_final.html`, `neurofoundry-report.html`, `nodes-demo.html`, `stock_divs.html`, etc. [file:53][file:56]
  - Shared UI via `shared/styles.css` and shared JS files like `shared/page-transitions.js`, `shared/micro-interactions.js`, `shared/neural-particles.js`. [file:53]
  - Navigation and flow are **hierarchical but consistent**:
    - `home.html` links into all major sections.
    - Each page pulls from shared styles and JS for consistent look/feel. [file:53]
    - The platform is meant to be:
      - **Brand-forward**, responsive, and visually coherent.
      - Easy to extend with more pages and modules without breaking the existing ones. [file:53][file:54]

Before doing any work, you may **read** `plan.md` and `sitemap.md` to understand the structure and intended behavior, but you must not modify those files unless explicitly asked. [file:53][file:56]

---

## Brand & UI Guardrails (Website Only)

When editing HTML/CSS/JS for the site:

- Visual language:
  - Dark background, red/orange highlights, soft glow, subtle gradients. [file:54]
  - Avoid purple bias unless the user explicitly requests it. [file:54]
- Navigation:
  - Primary navigation baseline: **Home / Forge / Projects** as core anchors. [file:54]
  - Keep nav labels and ordering consistent across pages when touched.
- Layout:
  - Prefer **CSS changes** over heavy HTML restructuring for spacing and rhythm. [file:54]
  - Spacing gaps usually live in the **18–24px** range; keep spacing intentional and repeatable. [file:54]
  - Use grid/flex layouts to avoid tall, ugly stacks where the user already started a grid design. [file:54]

If you are not explicitly asked to change visual language, **stay inside the existing style** and reuse existing utility classes and structure.

---

## How to Work on a Task

When the user gives you a task (for example: “fix nav on `home.html`”, “align lab cards”, “adjust spacing on projects grid”):

### 1. Understand the Scope

- Identify exactly **which page(s) and file(s)** are in scope:
  - HTML: `home.html`, `projects.html`, etc.
  - CSS: `shared/styles.css` or any local styles referenced by those pages.
  - JS: any shared scripts attached to those pages. [file:53][file:56]
  - Do **not** touch unrelated pages or files.

### 2. Inspect the Existing Implementation

- Open the specific HTML file(s) mentioned.
- Check which shared CSS/JS files it imports (e.g. `shared/styles.css`, `shared/*.js`). [file:53]
- Look for existing patterns:
  - Reuse existing classes instead of inventing new ones where possible.
  - Follow naming conventions already present in this workspace.

### 3. Plan the Smallest Change

- Prefer:
  - Minimal HTML structure edits.
  - Focused CSS tweaks for spacing, alignment, and layout.
  - Light JS edits only when behavior must change.
  - Do **not** refactor entire components or rewrite large sections unless the user explicitly requests a refactor.

### 4. Apply Changes

- Edit only the necessary sections of the files to satisfy the request.
- Keep code readable and consistent with the surrounding style.
- When adding new CSS:
  - Use clear, descriptive class names.
  - Respect existing spacing, color variables, and typography. [file:54]

### 5. Verify & Report

For every task, end with a **short, structured report**:

- **Files touched:**
  - `home.html`: what changed, at a high level.
  - `shared/styles.css`: what selectors and properties were added/modified.
- **What to test manually:**
  - Example: “Open `home.html` in a browser, verify that the From the Lab grid is two columns on desktop and still readable on mobile.”
- **Potential side effects:**
  - Note anything that might affect other pages using the same shared styles or components.