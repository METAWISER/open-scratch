# OpenScratch visual identity

The original code-and-spark mark represents a small idea becoming runnable code. Rounded outlines and restrained violet, coral and mint accents give the app a friendly character while keeping the editor visually quiet.

## Palette

| Role | Dark | Light |
| --- | --- | --- |
| Background | `#171522` | `#FAF8FF` |
| Panel | `#201D2E` | `#FFFFFF` |
| Main text | `#EEEAF7` | `#30253F` |
| Muted text | `#AFA6C2` | `#706480` |
| Primary accent | `#C4ADFF` | `#6940BC` |
| Learning accent | `#FFD0AC` | `#98501B` |
| Package/string accent | `#A1E8CC` | `#21765E` |

Accent colors complement shape, tooltips and accessible names; they are not the sole action identifier. Keep focus indicators visible, respect reduced motion and check both themes when changing the UI. The documentation uses the same palette with slightly lighter page surfaces. No external font or icon requests are needed.

## Assets and maintenance

- `assets/mark.svg`: canonical original vector mark, imported by the shared React BrandMark component.
- `src/shared/Icon.tsx`: original 24-unit outline drawings shared by desktop and website; 1.75-unit rounded strokes. Decorative SVGs are hidden from assistive technology; the parent control provides the accessible name.
- `src/renderer/style.css`, `website/style.css`: surface and interaction colors.
- `src/renderer/editor.tsx`: matching inherited Monaco light/dark themes.
- `pnpm icons`: regenerate the 1024px PNG, multi-size Windows ICO and website favicon from the SVG using Playwright Chromium. Install the development browser with `pnpm exec playwright install chromium` first if absent. Generated assets are committed; normal users and builds need no browser to load them.

The mark and icon drawings are original MIT assets. Do not substitute proprietary RunJS branding. OS title bars remain controlled by the platform. Desktop executable icons require a new build and may remain cached by the operating system.
