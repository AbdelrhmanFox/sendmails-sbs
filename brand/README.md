# SBS Brand Assets

This folder holds the **source of truth** for brand colors and exported marks used by the dashboard.

## Committed files

| Path | Purpose |
| --- | --- |
| `palette.json` | Canonical hex values for the product theme (JSON). |
| `exports/logo.svg` | Web-ready wordmark; copied to `dashboard/assets/logo.svg` for static hosting. |
| `Characters/Characters.ai` | Optional Illustrator source; prefer exporting SVG/PNG for the app. |

## Deriving the UI theme

- **`dashboard/css/tokens.css`** maps `--brand-*` variables from **`palette.json`**. When you change the palette, update `tokens.css` to match (there is no JSON import in plain CSS).
- The sidebar logo is **`dashboard/assets/logo.svg`** (keep in sync with `exports/logo.svg` or replace both with an approved export).

## Source binaries

Heavy `.ai` files are optional in git. If the team only needs exported SVG/PNG in-repo, you may add `brand/**/*.ai` to the root `.gitignore` and remove cached copies from the index (`git rm --cached`) so only web assets remain tracked.
