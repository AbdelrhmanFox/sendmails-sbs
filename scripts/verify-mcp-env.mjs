/**
 * Smoke-checks the local toolchain used by MCP servers (non-interactive).
 * Does not start full MCP stdio sessions (those require the Cursor MCP host).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, ".mcp-playwright-output");

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    cwd: root,
    ...opts,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const checks = [];

checks.push(["Node >= 18", () => {
  const major = Number(process.versions.node.split(".")[0]);
  return major >= 18 ? { ok: true, detail: process.version } : { ok: false, detail: process.version };
}]);

checks.push(["Chrome DevTools MCP (CLI)", () => {
  const { status, stdout, stderr } = sh("npx", ["-y", "chrome-devtools-mcp@latest", "--help"]);
  const ok = status === 0 && (stdout + stderr).includes("experimentalVision");
  return { ok, detail: ok ? "help OK" : `exit ${status}` };
}]);

checks.push(["Playwright MCP (CLI)", () => {
  const { status, stdout, stderr } = sh("npx", ["-y", "@playwright/mcp@latest", "--help"]);
  const text = stdout + stderr;
  const ok = status === 0 && text.includes("--caps") && text.includes("output-dir");
  return { ok, detail: ok ? "help OK" : `exit ${status}, len=${text.length}` };
}]);

checks.push(["Filesystem MCP (npm registry)", () => {
  const { status, stdout } = sh("npm", ["view", "@modelcontextprotocol/server-filesystem", "version"]);
  const v = (stdout || "").trim();
  const ok = status === 0 && /^\d+\./.test(v);
  return { ok, detail: ok ? v : `exit ${status}` };
}]);

checks.push(["Project read/write (MCP output dir)", () => {
  fs.mkdirSync(outDir, { recursive: true });
  const f = path.join(outDir, ".write-test");
  fs.writeFileSync(f, "ok", "utf8");
  const ok = fs.readFileSync(f, "utf8") === "ok";
  fs.unlinkSync(f);
  return { ok, detail: outDir };
}]);

let failed = 0;
for (const [name, fn] of checks) {
  let res;
  try {
    res = fn();
  } catch (e) {
    res = { ok: false, detail: String(e?.message || e) };
  }
  const line = res.ok ? `OK   ${name}: ${res.detail}` : `FAIL ${name}: ${res.detail}`;
  console.log(line);
  if (!res.ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
