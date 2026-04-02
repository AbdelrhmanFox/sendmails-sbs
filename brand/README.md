# SBS Brand Assets

This folder holds the **source of truth** for brand colors and marks used by the dashboard.

## Layout

| Path | Purpose |
| --- | --- |
| `Main Logo/` | Official logo exports (PNG). **Sidebar uses `Colored (White Text).png`** on dark UI. |
| `Color Palette/` | `ColorPalette.pdf` — full brand color system (primary, solids, gradients). `palette.json` hex values align with the logo and PDF; adjust both when marketing updates the PDF. |
| `palette.json` | Canonical hex values consumed by `dashboard/css/tokens.css` (update manually in sync). |
| `exports/logo.png` | Copy of the white-text mark for deployment parity with `dashboard/assets/logo.png`. |
| `Characters/` | Illustration assets (optional for marketing; not required for the staff dashboard). |

## Dashboard wiring

- **`dashboard/assets/logo.png`** — copy of `Main Logo/Colored (White Text).png` for static hosting.
- **`dashboard/css/tokens.css`** — maps `--brand-*` from **`palette.json`**. Plain CSS cannot import JSON; keep them aligned when colors change.

## Source binaries

Heavy `.ai` files are optional in git. To drop Illustrator sources from the repo while keeping PNG/PDF, add `brand/**/*.ai` to the root `.gitignore` and run `git rm --cached` on those paths.
