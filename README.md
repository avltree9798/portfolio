# Anthony Viriya · Portfolio

A standalone Vue 3 + strict TypeScript portfolio. Original CSS and SVG artwork evokes Japanese nights and retro games. All content is compiled at build time; there is no database, CMS service or runtime tracking.

## Local development

Use Node.js 22 LTS and npm.

```sh
npm ci
git config core.hooksPath .githooks
npm run dev
```

`npm run check` runs formatting, visitor-journey tests, type checking and the production build. `npm run test:e2e` checks ten desktop, phone, landscape and foldable viewport sizes (install the browser once with `npx playwright install chromium`). `npm run preview` serves the production output. `npm run deploy:check` validates Cloudflare packaging without publishing.

## Git is the CMS

1. Edit `src/content/portfolio.ts` for projects, career history, skills and contact links. Project types catch missing fields at build time. Optional project URLs should point to verified, public repositories only.
2. Replace `public/Anthony_Viriya_CV.pdf` when the CV changes. This is a public download, including the contact details in the supplied CV.
3. Open a pull request. GitHub Actions runs the quality gates and deployment dry run.
4. Merge to `master`. The exact checked build is deployed to Cloudflare Workers.

For layout and introductory copy, edit `src/App.vue`; for artwork, edit `src/components/PixelLandscape.vue`. Run `npm run format` after editing. Wrangler is pinned to 4.164.0 because 4.165.0 fails when querying this account’s deployed Worker subdomain. Current employment and outcomes reflect the supplied July 2026 CV and should be reviewed when updating. Open-source project links are omitted until their exact repository URLs are confirmed.

## Connect GitHub and Cloudflare

This folder is an independent Git repository connected to `avltree9798/portfolio` on the `master` branch.

1. In GitHub, create a `production` environment and add `CLOUDFLARE_API_TOKEN` as an environment secret. The non-secret account ID is declared in `wrangler.jsonc`. Use a scoped Workers deployment token for the intended Cloudflare account; never use a global API key or a `VITE_` environment variable for credentials.
2. Require the `check` status on `master` and enable pull request review protection in GitHub settings. These account settings are not applied by the source files.
3. Review `wrangler.jsonc` and choose a unique Worker name if needed. Push the project to `master` to deploy. GitHub Actions validates every pull request and deploys verified builds on pushes to `master`.
4. In Cloudflare Workers settings, add your custom domain (for example, your existing portfolio domain). Configure DNS through Cloudflare. A custom domain is not preconfigured in this source.

Cloudflare Workers Static Assets serves the Vite output directly, without an unnecessary request-handler Worker. `_headers` supplies a restrictive content security policy. A real 404 page handles unknown URLs.

Manual deployment: `npx wrangler login`, then `npm run deploy`. To roll back, revert the content/code commit via a pull request and merge it; for urgent recovery use `npx wrangler rollback` after inspecting deployed versions. Repository: https://github.com/avltree9798/portfolio.

References: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
