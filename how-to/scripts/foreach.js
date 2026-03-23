/**
 * foreach.js — Run clean, install, or build across all how-to directories.
 *
 * Usage:
 *   node scripts/foreach.js clean       Remove build artifacts from all how-tos
 *   node scripts/foreach.js install     npm install in all how-tos
 *   node scripts/foreach.js build       npm run build in all how-tos
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

// Artifact paths to delete during clean (relative to how-to root).
const FLAT_CLEAN_PATHS = [
  "dist",
  "node_modules",
  "package-lock.json",
  "tsconfig.tsbuildinfo",
];

// Additional paths for workspace-layout how-tos.
const WORKSPACE_CLEAN_PATHS = [
  "server/dist",
  "server/node_modules",
  "server/package-lock.json",
  "server/tsconfig.tsbuildinfo",
  "client/dist",
  "client/node_modules",
  "client/package-lock.json",
  "client/tsconfig.tsbuildinfo",
  "networking/gen",
  "networking/node_modules",
  "networking/package-lock.json",
];

function getHowToDirs() {
  return fs
    .readdirSync(ROOT)
    .filter((name) => {
      if (name === "scripts" || name === "node_modules") return false;
      const full = path.join(ROOT, name);
      return fs.statSync(full).isDirectory();
    })
    .sort();
}

function isWorkspaceLayout(dir) {
  return fs.existsSync(path.join(dir, "server"));
}

function cleanDir(dir) {
  const paths = [...FLAT_CLEAN_PATHS];
  if (isWorkspaceLayout(dir)) {
    paths.push(...WORKSPACE_CLEAN_PATHS);
  }
  for (const p of paths) {
    const full = path.join(dir, p);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

function runInDir(dir, cmd) {
  execSync(cmd, { cwd: dir, stdio: "inherit" });
}

// --- Main -------------------------------------------------------------------

const action = process.argv[2];

if (!["clean", "install", "build"].includes(action)) {
  console.error("Usage: node scripts/foreach.js <clean|install|build>");
  process.exit(1);
}

const dirs = getHowToDirs();
console.log(`\n[foreach] ${action} — ${dirs.length} how-to(s)\n`);

const results = [];

for (const name of dirs) {
  const dir = path.join(ROOT, name);
  const label = `[${name}]`;

  try {
    if (action === "clean") {
      process.stdout.write(`${label} cleaning...`);
      cleanDir(dir);
      console.log(" done");
      results.push({ name, ok: true });
    } else if (action === "install") {
      console.log(`${label} npm install`);
      runInDir(dir, "npm install");
      results.push({ name, ok: true });
    } else if (action === "build") {
      console.log(`${label} npm run build`);
      runInDir(dir, "npm run build");
      results.push({ name, ok: true });
    }
  } catch (err) {
    console.error(`${label} FAILED: ${err.message}`);
    results.push({ name, ok: false });
  }
}

// --- Summary ----------------------------------------------------------------

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

console.log(`\n[foreach] ${action} complete: ${passed}/${results.length} passed`);

if (failed.length > 0) {
  console.log(`[foreach] Failed:`);
  for (const f of failed) {
    console.log(`  - ${f.name}`);
  }
  process.exit(1);
}
