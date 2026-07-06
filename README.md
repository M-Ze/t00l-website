# T00L Landing Page

Responsive static landing page for **T00L**, a modular calculation surface for TXT/TOML-based engineering calculation workflows.

The page explains the concept with **Volumina** as the first example module. Volumina is used to demonstrate fill-height and vessel-volume workflows, but it is not the boundary: T00L is designed for additional modules, templates, parsers, result views, and previews.

## What The Page Does

- Presents T00L as a simple text-file driven calculation interface.
- Warms up the configured *Render* app in the background when the page loads.
- Explains the workflow with animated input, calculation, output, and module-step states.
- Demonstrates Volumina as an example module for fill height, filled volume, vessel volume, and volume profiles.
- Provides *light* and *dark* themes plus *German* and *English* content.
- Keeps URLs, email, app links, and feature switches centralized in `src/site-config.js`.

## Project Structure

```text
website/
  index.html              Static HTML shell and SEO metadata
  public/assets/          Public images and icons
  src/animations/         GSAP timelines split by page area and animation concern
  src/content.js          German and English page copy
  src/lib/                Shared DOM, HTML, and viewport-layout helpers
  src/main.js             Page lifecycle, warmup, scroll controls, and orchestration
  src/render/             DOM builders for header, hero, sections, footer, and controls
  src/services/           Shared GSAP and Lenis services
  src/site-config.js      Public configuration values
  src/styles.css          Layout, themes, responsive design, and animation styles
```

## Configuration

Update `src/site-config.js` before publishing:

```js
export const siteConfig = {
  appUrl: "https://app-t00l.onrender.com/",
  warmupUrl: "https://app-t00l.onrender.com/",
  githubUrl: "https://github.com/M-Ze",
  email: "web.application.t00l@gmail.com",
  renderWarmupEnabled: true,
};
```

The warmup request uses `fetch(..., { mode: "no-cors", cache: "no-store" })` so the Render-hosted app can start before the visitor clicks the app link.

## Development

Install dependencies:

```powershell
pnpm install
```

Run a production build:

```powershell
pnpm run build
```

Run a local preview:

```powershell
pnpm run preview
```


## Quality Notes

- The page is static and deploys from Vite's `dist/` output.
- No runtime analytics are enabled by default.
- GSAP drives card reveals, title motion, workflow typing, profile drawing, module highlights, and scroll controls.
- Reduced-motion preferences are respected by shortening or disabling motion-heavy effects.
