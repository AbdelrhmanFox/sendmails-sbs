# Bridges Cursor MCP (stdio) to the official Zoho MCP remote endpoint.
# Set ZOHO_MCP_URL in .cursor/mcp.json (from https://mcp.zoho.com → Connect → Cursor).
$ErrorActionPreference = "Stop"

$url = $env:ZOHO_MCP_URL
if ([string]::IsNullOrWhiteSpace($url) -or $url -match 'PASTE_') {
  [Console]::Error.WriteLine(
    "ZOHO_MCP_URL is missing. Open https://mcp.zoho.com, create a server with Zoho Mail tools, copy the Cursor JSON URL, and paste it into .cursor/mcp.json under zoho-mail.env.ZOHO_MCP_URL."
  )
  exit 1
}

& npx -y mcp-remote $url --transport http-only
