# MCP setup: UX audit and frontend refactor

This project uses Cursor MCP servers for live-site inspection (Playwright + Chrome DevTools) and repository file access (official Filesystem MCP).

## Environment (verified)

| Item | Notes |
|------|--------|
| OS | Windows 10+ |
| Node.js | 18+ required for Playwright MCP; **20.19+** recommended for `chrome-devtools-mcp` (this machine: Node 22) |
| npm | Ships with Node |
| Chrome | **Stable Chrome** required for the `domAnalyzer` server (`chrome-devtools-mcp`) |

## Folder layout

```
.cursor/
  settings.json          # MCP server definitions (this repo)
.mcp-playwright-output/  # Screenshots, traces, snapshot files (gitignored)
scripts/
  verify-mcp-env.mjs      # Local smoke checks (`npm run mcp:verify`)
docs/
  MCP_UX_AUDIT_SETUP.md   # This file
```

## One-time installation (commands)

Run from any directory; `npx -y` downloads packages on first use.

```powershell
node -v
npm -v
```

Optional: install browsers for Playwright (first run of Playwright MCP may still download them automatically).

```powershell
cd "C:\Users\abdelrahmanahmed\Downloads\Sendmails SBS"
npm run mcp:verify
```

If you clone the repo elsewhere, update **absolute paths** in `.cursor/settings.json` for:

- `playwright` → `--output-dir`
- `filesystem` → allowed workspace directory argument

## MCP servers (what each does)

| Name in config | Package | Role |
|----------------|---------|------|
| `playwright` | `@playwright/mcp` | Navigate, **`browser_snapshot`** (accessibility tree), **`browser_take_screenshot`**, PDF, **`browser_evaluate`**, optional **`--caps=vision`** for coordinate-style interaction |
| `filesystem` | `@modelcontextprotocol/server-filesystem` | Read/write/search files under the allowed directory |
| `domAnalyzer` | `chrome-devtools-mcp` | CDP-backed inspection: DOM, styles, console, network, performance traces |

There is **no separate “vision” MCP process** in this setup: screenshots come from Playwright (`browser_take_screenshot`) and from Chrome DevTools tools; multimodal “vision” reasoning happens in the **model** when you attach those images. Optional: run Chrome MCP with `--experimentalVision` for coordinate-based tools (see `npx chrome-devtools-mcp@latest --help`).

## Cursor: apply config

1. Ensure `.cursor/settings.json` contains the `mcpServers` block (committed for this workspace).
2. **Cursor Settings → MCP**: confirm servers show as enabled; use **Refresh** if you edited the file.
3. Approve tool permissions when prompted (browser control and filesystem access).

## Verification

- **CLI / toolchain**: `npm run mcp:verify`
- **In Cursor**: open the MCP panel, pick each server, and confirm tools list loads without errors.
- **Playwright**: ask the agent to navigate to a public URL and call **`browser_snapshot`**, then **`browser_take_screenshot`**.
- **Filesystem**: ask the agent to read a known file (for example `README.md`) via the filesystem MCP.
- **Chrome DevTools**: ask the agent to open a page and use a DOM or performance tool from the `domAnalyzer` server (tool names follow the server’s schema in the MCP UI).

## Usage prompts (copy/paste)

### A. Open and explore a website

> Use the **Playwright** MCP: open `https://example.com`, then return a **browser_snapshot** summary of headings, primary navigation, and main interactive elements.

### B. Take screenshots

> Use **Playwright** MCP: navigate to `<URL>`, set viewport **1440×900**, take **`browser_take_screenshot`** (full page if needed). Save under `.mcp-playwright-output/` with a clear filename.

### C. Analyze UI

> From the latest **browser_snapshot** and screenshot, list UX issues: hierarchy, spacing, contrast, tap targets, form labels, empty states, and responsiveness risks. Prioritize by severity.

### D. Map UI issues to code

> Use the **Filesystem** MCP: search the `dashboard/` tree for components, CSS, or strings matching `<visible text or class>`. Link each UI issue to the most likely source files and line ranges.

### E. Refactor components

> After listing issues and file mappings, propose minimal edits. Apply changes only in the identified files, match existing patterns, and keep UI text in English.

## Troubleshooting

| Symptom | What to try |
|---------|--------------|
| `npx` fails or is slow | Run `npm run mcp:verify` once to warm the npm cache; check corporate proxy / firewall. |
| Playwright browser missing | Allow first launch to download browsers; or install Playwright browsers manually per [Playwright install docs](https://playwright.dev/docs/intro). |
| Chrome DevTools MCP errors | Install/update **Google Chrome Stable**; Node **≥ 20.19** for that server. |
| Filesystem MCP cannot read files | Confirm the allowed path in `settings.json` equals your real workspace root (no typo; mind spaces in folder names). |
| Two browsers / confusion | Use **Playwright** for scripted flows and snapshots; use **domAnalyzer** when you need DevTools-style DOM or performance data. Avoid running redundant navigation on both unless you need both views. |
| Paths after clone | Replace `C:/Users/.../Sendmails SBS` in `.cursor/settings.json` with your new absolute path (forward slashes are fine on Windows). |

## Security notes

- MCP browsers can see any page you open; avoid logged-in production sessions unless you trust the agent workflow.
- Do not commit secrets; `.mcp-playwright-output/` is gitignored but may contain sensitive screenshots if you capture authenticated pages.
