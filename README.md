# Anthony Viriya · Portfolio

A standalone Vue 3 + strict TypeScript portfolio. Original CSS and SVG artwork evokes Japanese nights and retro games. All content is compiled at build time; there is no database, CMS service or runtime tracking.

## Local development

Use Node.js 22 LTS and npm.

```sh
npm ci
git config core.hooksPath .githooks
npx playwright install chromium
npm run dev
```

`npm run check` runs formatting, visitor-journey tests, type checking and the production build. `npm run test:e2e` checks ten desktop, phone, landscape and foldable viewport sizes (install the browser once with `npx playwright install chromium`). `npm run preview` serves the production output. `npm run deploy:check` validates Cloudflare packaging without publishing.

## Git is the CMS

1. Edit `src/content/portfolio.ts` for projects, career history, skills and contact links. Project types catch missing fields at build time. Optional project URLs should point to verified, public repositories only.
2. Edit `src/content/cv.json` when the CV changes. `npm run cv:generate` regenerates the public download using the original three-page Letter format and Source Sans 3 fonts. The PDF is generated automatically by development and production builds and is not stored in Git. Overflow fails the build rather than clipping content. Confidential project details are excluded from public content.
3. Open a pull request. GitHub Actions runs the quality gates and deployment dry run.
4. Merge to `master`. When GitHub runners are available, the exact checked build is deployed to Cloudflare Workers. For now, run the manual release flow below.

For layout and introductory copy, edit `src/App.vue`; for artwork, edit `src/components/PixelLandscape.vue`. Run `npm run format` after editing. Wrangler is pinned to 4.164.0 because 4.165.0 fails when querying this account’s deployed Worker subdomain. Current employment and outcomes reflect the supplied July 2026 CV and should be reviewed when updating. Open-source project links are omitted until their exact repository URLs are confirmed.

## Connect GitHub and Cloudflare

This folder is an independent Git repository connected to `avltree9798/portfolio` on the `master` branch.

1. In GitHub, create a `Prod` environment and add `CLOUDFLARE_API_TOKEN` as an environment secret. The non-secret account ID is declared in `wrangler.jsonc`. Use a scoped Workers deployment token for the intended Cloudflare account; never use a global API key or a `VITE_` environment variable for credentials.
2. Require the `check` status on `master` and enable pull request review protection in GitHub settings. These account settings are not applied by the source files.
3. Review `wrangler.jsonc` and choose a unique Worker name if needed. Push the project to `master` to deploy. GitHub Actions validates every pull request and deploys verified builds on pushes to `master`.
4. The custom domain `avltree9798.co.uk` is declared in `wrangler.jsonc` and bound to the Worker.

Cloudflare Workers Static Assets serves the Vite output directly, without an unnecessary request-handler Worker. `_headers` supplies a restrictive content security policy. A real 404 page handles unknown URLs.

Manual deployment: `npx wrangler login`, then `npm run deploy`. To roll back, revert the content/code commit via a pull request and merge it; for urgent recovery use `npx wrangler rollback` after inspecting deployed versions. Repository: https://github.com/avltree9798/portfolio.

References: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Deployment status

The repository is private. Manual deployment with `npm run deploy` is currently the accepted release path. GitHub Actions is configured for the `Prod` environment, but its runners are blocked by the account billing/spending-limit restriction until that account issue is resolved. The primary domain is https://avltree9798.co.uk, with a workers.dev fallback. The public contact address is me@avltree9798.co.uk.

Source Sans 3 is bundled only for PDF generation under its SIL Open Font Licence; see `scripts/cv/fonts/OFL.txt`.

## Write a blog post in Markdown

Create `content/posts/my-post.md` with this front matter:

```markdown
---
title: My next field note
date: 2026-11-20
summary: One sentence describing the post.
tags: [security, engineering]
draft: true
---

## A heading

Write ordinary **Markdown** here, including lists, links and fenced code blocks.
```

Set `draft: false` to publish. The filename becomes `/blog/my-post/`. Drafts are excluded from the public index, compiled assets, article pages and sitemap. `npm run dev` previews published posts at `/blog/`; restart it after adding or changing a post to refresh the homepage list. `npm run build` produces complete static HTML articles with canonical metadata and a sitemap. Raw HTML in Markdown is disabled, and unsafe link protocols are rejected. The included `hello-world.md` remains a private draft.

For the currently accepted manual release flow: edit content, run `npm run check` and `npm run test:e2e`, then `npx wrangler deploy` (the check command already builds the assets).
