# NeurofoundryPortal

Interactive data portal for generating, systematizing, and operating on **Neurofoundry Mythos Fragments**.

## Guiding Principles
- **Operational clarity**: every fragment is structured and queryable.
- **Mythos fidelity**: controlled thematic generation with consistent output form.
- **Resilience first**: guarded destructive actions, safe parsing, explicit feedback.
- **Immediate portability**: static app, no server required for baseline use.

## Fragment Contract
Every generated fragment adheres to:
1. **Title**
2. **Classification**
3. **Content**
4. **Signature**

## Features
- Parameterized fragment generation (theme/intensity/complexity/cryptic ratio).
- Persistent local registry.
- Search + classification/theme filtering + sorting.
- Bulk selection, delete, selected export.
- Full export to JSON and CSV.
- JSON import with normalization and validation.

## Run
Open:
- `index.html` directly in browser

Optional local server (PowerShell):
```powershell
cd D:\0___TESTZONE\_theneurofoundry\NeurofoundryPortal
python -m http.server 5510
```
Then visit:
- `http://127.0.0.1:5510`

## Deployment Strategy
### Tier 0 (Immediate)
- Serve as static files from any internal host.

### Tier 1 (Integrated Data Plane)
- Add REST API for shared persistence:
  - `POST /fragments`
  - `GET /fragments`
  - `PATCH /fragments/:id`
  - `DELETE /fragments/:id`
- Replace local storage adapter with API adapter.

### Tier 2 (Operational Mesh)
- Add role-aware auth, audit logging, and policy gates.
- Add remote indexing for cross-node retrieval and analytics.

## Files
- `index.html` UI shell and control surface
- `styles.css` Neurofoundry visual language
- `app.js` generation + state + data operations logic
- `BLUEPRINT.md` architecture and integration model
