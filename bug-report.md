# Bug Report

Validation date: 2026-03-09

Validation method:

- local static server
- browser pass using Playwright
- customer-facing pages only

## Findings

### P1 - Home and gallery surfaces are shipping broken image references

- `home.html:1413`
- `home.html:1416`
- `home.html:1419`
- `home.html:1422`
- `home.html:1425`
- `home.html:1428`
- `home.html:1431`
- `home.html:1434`
- `home.html:1437`
- `gallery.html:436`

Problem:

`home.html` and `gallery.html` reference `WebsiteContent/Images/*.png`, but that directory is not present in this workspace. In browser validation, those image requests return 404s and the gallery cards fall back to placeholder states.

Impact:

- the homepage proof strip looks broken
- the gallery page loses its primary content
- this weakens trust before a user reaches request-access flows

## P1 - Forge page requests a missing frame asset

- `forge_final.html:1002`

Problem:

The page requests `fg1.png`, which is missing in the current workspace. Browser validation shows a 404 for that file.

Impact:

- the main product surface loses part of its intended visual framing
- the flagship product page looks incomplete

## P1 - Projects CTA points to a missing destination

- `projects.html:629`

Problem:

The primary CTA links to `home.html#contact`, but `home.html` does not contain a `contact` anchor or section id.

Impact:

- a high-intent user can click the CTA and land nowhere meaningful
- this breaks conversion flow on one of the strongest proof pages

## P2 - Home page "View All Articles" anchor is dead

- `home.html:1347`

Problem:

The link targets `#all-articles`, but no matching anchor exists on the page.

Impact:

- creates a dead interaction in the "From the Lab" section
- reduces confidence in page polish

## P3 - Favicon is missing

Observed in browser validation:

- `http://127.0.0.1:8011/favicon.ico` returns 404

Impact:

- low severity
- browser tab branding is incomplete

## Notes

- I did not fix these bugs because the request was to report them.
- The most urgent fixes for sales impact are the broken gallery assets and the dead projects CTA.
