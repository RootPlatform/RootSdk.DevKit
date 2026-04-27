const fs = require("fs");
const path = require("path");

// Static paths to delete recursively. Generated dirs, lockfiles, build
// caches — anything reproducible from source.
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

// Glob-style patterns matched against files at the workspace root.
// `rootapp-*.pkg` is the artifact `rootsdk pack` produces (named after
// the manifest version, so the suffix changes per release). The repo's
// top-level .gitignore already excludes *.pkg from source control;
// `npm run clean` should also wipe it so a fresh build starts truly
// empty rather than re-uploading a stale package.
const rootFilePatterns = [
  /^rootapp-.*\.pkg$/,
];

function clean() {
  for (const p of pathsToDelete) {
    try {
      console.log(`Clean: deleting ${p}`);
      fs.rmSync(p, { recursive: true, force: true });
    } catch (error) {
      console.error(`Clean: failed to delete ${p}:`, error);
    }
  }

  let rootEntries;
  try {
    rootEntries = fs.readdirSync(".");
  } catch (error) {
    console.error("Clean: failed to read workspace root:", error);
    return;
  }
  for (const entry of rootEntries) {
    if (!rootFilePatterns.some((re) => re.test(entry))) continue;
    const full = path.join(".", entry);
    try {
      console.log(`Clean: deleting ${full}`);
      fs.rmSync(full, { force: true });
    } catch (error) {
      console.error(`Clean: failed to delete ${full}:`, error);
    }
  }
}

clean();
