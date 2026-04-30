const fs = require("fs");

// Guard: clean must run from the workspace root (where client/, server/,
// and networking/ live). Without this, running it from a subdirectory
// silently no-ops every relative path, leaving stale build artifacts in
// place. The check is cheap and the failure is loud.
if (
  !fs.existsSync("./client") ||
  !fs.existsSync("./server") ||
  !fs.existsSync("./networking")
) {
  console.error(
    "clean.js must run from the workspace root (apps/moderation), " +
      "not a subdirectory. Expected ./client, ./server, and ./networking " +
      "to exist relative to cwd.",
  );
  process.exit(1);
}

const pathsToDelete = [
  "./node_modules",
  "./package-lock.json",

  "./client/dist",
  "./client/node_modules",

  "./networking/gen",
  "./networking/node_modules",
  "./networking/package-lock.json",

  "./server/dist",
  "./server/node_modules",
  "./server/tsconfig.tsbuildinfo",
];

function clean() {
  for (const path of pathsToDelete) {
    try {
      console.log(`Clean: deleting ${path}`);

      fs.rmSync(path, { recursive: true, force: true });
    } catch (error) {
      console.error(`Clean: failed to delete ${path}:`, error);
    }
  }
}

clean();
