# SBS Brand Assets

This folder holds the **source of truth** for brand colors and marks used by the dashboard.

## Layout

| Path | Purpose |
| --- | --- |
| `Main Logo/` | Official logo exports (PNG). **Sidebar uses `Colored (White Text).png`** on dark UI. |
| `Color Palette/` | `ColorPalette.pdf` — full brand color system (primary, solids, gradients). `palette.json` hex values align with the logo and PDF; adjust both when marketing updates the PDF. |
| `palette.json` | Canonical hex values (aligned with **ColorPalette.pdf** RGB swatches in file metadata). |
| `exports/logo.png` | Copy of the white-text mark for deployment parity with `dashboard/assets/logo.png`. |
| `Characters/` | Illustration assets (optional for marketing; not required for the staff dashboard). |
| Stickers (source kit) | Raster stickers live under `dashboard/assets/stickers/` (`sticker-1.jpg` … `sticker-3.jpg`), copied from the visual identity **Stickers** exports. |

## Dashboard wiring

- **`dashboard/assets/logo.png`** — copy of `Main Logo/Colored (White Text).png` for static hosting.
- **`dashboard/assets/stickers/`** — decorative sticker JPGs on login and each main view header (Home, Operations, Campaigns, Training, Admin); images use `alt=""` as decoration only.
- **`dashboard/css/tokens.css`** — maps `--brand-*` from **`palette.json`**. Plain CSS cannot import JSON; keep them aligned when colors change.
- **Typography:** the dashboard loads **Montserrat** (see PDF font list) from Google Fonts.

## Source binaries

Heavy `.ai` files are optional in git. To drop Illustrator sources from the repo while keeping PNG/PDF, add `brand/**/*.ai` to the root `.gitignore` and run `git rm --cached` on those paths.
