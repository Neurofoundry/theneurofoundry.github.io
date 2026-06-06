# Neurofoundry

## Public Deployment Boundary

The repository root is private application source. It must never be served or
published directly.

`npm run build:public` creates an ignored `public/` artifact from the explicit
allowlist in `tools/build-public.mjs`.

- GitHub Pages deploys only `public/` through `.github/workflows/pages.yml`.
- The Fly image contains only `server/`, production dependencies, and the
  generated `public/` artifact.
- Express serves only `public/`.

GitHub Pages must use **GitHub Actions** as its source, not deployment from the
root of `main`.
