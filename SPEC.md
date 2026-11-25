# Portfolio specification

## Objective and acceptance

Present Anthony's cybersecurity experience to collaborators and employers, with a restrained Japanese retro-game visual identity. Visitors can explore project categories and accessible project details, read career history, contact Anthony for CV access and contact Anthony.

## Architecture

Vue 3 / TypeScript / Vite; typed repository content is the CMS. Static assets are deployed on Cloudflare Workers. No authentication, database, third-party scripts or runtime secrets. The site is independent of the hotel workspace.

## Structure and style

`src/content/portfolio.ts` contains typed content, `src/components` contains presentation components, `src/App.vue` composes the page, and `public` holds downloadable assets. Use British English, Composition API and strict types, for example `const menuOpen = ref(false)`. Formatting is enforced by Prettier.

## Verification and boundaries

Run `npm run dev`, `npm test`, `npm run build` and `npm run lint`. Vitest visitor journeys cover filtering, case studies, navigation and contact/CV links. Inspect responsive rendering in a browser. Always keep facts grounded in the supplied CV and keep secrets out of source. Confirm account access before configuring hosted resources; never invent project links or client claims.

## Build order

Content and visitor tests → Vue presentation → responsive styling → GitOps pipeline → checks and browser review. Local completion does not imply a live deployment.

## Content and publishing additions

The repository is public. GitHub Actions checks pull requests and deploys verified builds from `master`; manual Wrangler releases remain available. The custom domain is `avltree9798.co.uk`; the contact address is `me@avltree9798.co.uk`. Confidential project details must remain absent from the public site and generated CV. The original-format CV is generated privately, outside the website assets, from `src/content/cv.json` with overflow checks. Markdown posts live in `content/posts`; drafts are excluded from every production artefact, while published articles become static HTML with canonical metadata and sitemap entries.
