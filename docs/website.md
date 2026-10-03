# Documentation website

The English documentation site uses React, Vite, and Marked. Its source is in `website/`; guides remain Markdown files in `docs/`. The website does not execute user snippets, load the Electron bridge, use telemetry, or call AI services.

Run `pnpm docs:dev` to serve it at http://127.0.0.1:4174. `pnpm docs:build` produces `dist-docs/`; `pnpm docs:preview` serves that production output. `pnpm test:docs` checks navigation, search, clipboard actions, themes, responsive overflow, and every guide. Install Playwright Chromium first with `pnpm exec playwright install chromium` if needed.

Add a Markdown guide and register it in `website/content.ts`. Page routes use `?page=...` so static hosting does not need fallback routing. Only bundled, reviewed repository Markdown is rendered; raw HTML is escaped. User input is not interpreted as Markdown. Learning examples come from the same bilingual catalog as the desktop app, displayed in English on the website.

The GitHub Pages workflow builds and tests before deploying `dist-docs/`. Repository Pages must use GitHub Actions as its source. No desktop installer is uploaded. Publishing a website does not verify desktop support on other operating systems.

Public destination: https://metawiser.github.io/open-scratch/. Treat this as a configured destination until a deployment has succeeded and the URL has been verified.
