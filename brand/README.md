# SBS Brand Assets

This folder holds the **source of truth** for brand colors and marks used by the dashboard.

## Layout

| Path | Purpose |
| --- | --- |
| `Main Logo/` | Official logo exports (PNG). **Sidebar uses `Colored (White Text).png`** on dark UI. |
| `Color Palette/` | `ColorPalette.pdf` — full brand color system (primary, solids, gradients). `palette.json` hex values align with the logo and PDF; adjust both when marketing updates the PDF. |
| `source/` | Illustrator sources when present (e.g. `Characters.ai`); additional `.ai` files may live under `visual-identity/` or a root-level `Characters/` folder from design handoffs. |
| `palette.json` | Canonical hex values (aligned with **ColorPalette.pdf** RGB swatches in file metadata). |
| `exports/logo.png` | Copy of the white-text mark for deployment parity with `dashboard/assets/logo.png`. |
| `visual-identity/` | Full visual identity kit (Stickers, Elements & Patterns, Logo, Fonts, etc.), moved from the old Drive-style root folder name. |

Raster stickers for the app UI live under `dashboard/assets/stickers/` (`sticker-1.jpg` … `sticker-3.jpg`), copied from the visual identity **Stickers** exports.

## Exports for web (Elements, Patterns, Characters)

Raster copies used by the live dashboard live under **`dashboard/assets/brand/`** (deployed with the static site).

| Dashboard path | Source (repo) |
| --- | --- |
| `dashboard/assets/brand/elements/main.png` | `visual-identity/Elements & Patterns/Elements/All/Main.png` |
| `dashboard/assets/brand/elements/advisory.png` | `…/Elements/All/Advisory.png` |
| `dashboard/assets/brand/elements/skills-factory.png` | `…/Elements/All/Skills Factory.png` |
| `dashboard/assets/brand/patterns/inside-out.png` | `…/Patterns/Inside Out.png` (login / light texture) |
| `dashboard/assets/brand/patterns/cultura.png` | `…/Patterns/Cultura.png` (app shell texture) |

When marketing updates the **Elements** or **Patterns** PNGs, recopy the files into `dashboard/assets/brand/` (or adjust paths in `dashboard/css/brand-surfaces.css`).

**Characters:** export from `source/Characters.ai` into `dashboard/assets/brand/characters/` — see `dashboard/assets/brand/characters/README.md`.

## Dashboard wiring

- **`dashboard/assets/logo.png`** — copy of `Main Logo/Colored (White Text).png` for static hosting.
- **`dashboard/assets/stickers/`** — decorative sticker JPGs on login and each main view header (Home, Operations, Campaigns, Training, Admin); images use `alt=""` as decoration only.
- **`dashboard/css/brand-surfaces.css`** — optional pattern and hero watermark layers using `dashboard/assets/brand/` (loaded after `tokens.css`).
- **`dashboard/css/tokens.css`** — maps `--brand-*` from **`palette.json`**. Plain CSS cannot import JSON; keep them aligned when colors change.
- **Typography:** the dashboard loads **Montserrat** (see PDF font list) from Google Fonts.
- **Finance charts:** the Finance tab uses **Chart.js** (CDN); series colors follow `--brand-*` tokens from `tokens.css` for visual consistency with the rest of the UI.

## Source binaries

Heavy `.ai` files are optional in git. To drop Illustrator sources from the repo while keeping PNG/PDF, add `brand/**/*.ai` to the root `.gitignore` and run `git rm --cached` on those paths.
