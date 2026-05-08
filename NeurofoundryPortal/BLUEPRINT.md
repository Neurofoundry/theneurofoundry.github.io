# NeurofoundryPortal Blueprint

## Mission
Create a resilient, high-contrast interactive portal that operationalizes Neurofoundry Mythos Fragments as structured, searchable, exportable knowledge units.

## System Architecture

### Runtime
- Client-only web application (HTML/CSS/JS) for rapid portability and zero backend dependency.
- Local persistence via `localStorage` (keyed object array).
- Modular JS functions for generation, indexing, filtering, export/import, and bulk ops.

### Core Components
1. Generation Module
- Parameterized fragment synthesis with controls:
  - title
  - classification
  - signature
  - thematic influence
  - intensity / complexity / cryptic ratio
  - content seed
  - length profile
- Output structure enforced:
  - Title
  - Classification
  - Content
  - Signature

2. Registry Module
- Persist and retrieve all fragments.
- Full-text search over title/content/signature.
- Filter by classification and theme.
- Sort modes (newest/oldest/title/classification).

3. Bulk Operations Module
- Select visible/clear selection.
- Bulk delete.
- Export selected fragments (JSON).
- Export all fragments (JSON, CSV).
- Import JSON arrays with normalization.

4. Resilience Module
- Input hardening with safe JSON parsing.
- Defensive type checks on imported records.
- Contextual user feedback (toasts + status).
- Confirm gates on destructive actions.

## Data Structures

### Fragment
```json
{
  "id": "frag_...",
  "title": "string",
  "classification": "Doctrine|Incident|Entity|Protocol|Artifact|Unknown",
  "content": "string",
  "signature": "string",
  "theme": "string",
  "intensity": 1,
  "complexity": 1,
  "cryptic": 1,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "persistedAt": "ISO-8601",
  "tags": ["string"]
}
```

## UI/UX Language
- Palette: deep blues, stark whites, muted grays, strategic neon accents.
- Interaction: minimalist, direct, cryptic microcopy where appropriate.
- Layout: two-pane operational model (Generation + Registry).
- Accessibility baseline: semantic sections, high contrast, mobile adaptive grid.

## Integration Readiness
- Immediate deployment as static artifact.
- Future adapters:
  - backend API persistence (`/fragments`)
  - remote search index
  - role-based access controls
  - audit stream appenders

## Operational Notes
- Current persistence is local browser storage for low-friction bootstrap.
- The app is intentionally backend-agnostic to allow drop-in integration across operational tiers.
