#!/usr/bin/env node
// Generates AGENTS.md catalog tables from per-folder README frontmatter.
// Marker-bounded regions are rewritten; hand-written content stays untouched.
//
// Usage:
//   node generate-agents-md.js          # rewrite AGENTS.md in place
//   node generate-agents-md.js --check  # exit non-zero if AGENTS.md would change
//
// Source of truth: YAML frontmatter at the top of each catalogued README under
// apps/, bots/, recipes/, api-samples/.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname);
const AGENTS_MD = path.join(ROOT, "AGENTS.md");

const COMPLEXITY_ORDER = { minimal: 1, moderate: 2, complex: 3 };

const API_SAMPLE_SECTIONS = [
  { category: "server-community-api",        heading: "Server — Community API" },
  { category: "server-persistence-scheduling", heading: "Server — Persistence & Scheduling" },
  { category: "server-lifecycle-utilities",  heading: "Server — Lifecycle & Utilities" },
  { category: "developer-tools",             heading: "Developer Tools" },
  { category: "client-app",                  heading: "Client (Apps only)" },
];

// --- Frontmatter parser (constrained YAML: scalars, flow arrays, block arrays) ---

function parseFrontmatter(text, filePath) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  return parseYamlBlock(match[1], filePath);
}

function parseYamlBlock(yaml, filePath) {
  const result = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) { i++; continue; }
    const kv = line.match(/^([a-z_][a-z0-9_]*):\s*(.*)$/);
    if (!kv) {
      throw new Error(`Frontmatter parse error in ${filePath} at line: ${line}`);
    }
    const key = kv[1];
    const raw = kv[2];
    if (raw === "") {
      // Block-style array: indented `- item` lines
      const items = [];
      i++;
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        items.push(stripQuotes(lines[i].replace(/^\s+-\s/, "").trim()));
        i++;
      }
      result[key] = items;
      continue;
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const inner = raw.slice(1, -1).trim();
      result[key] = inner === ""
        ? []
        : inner.split(",").map(s => stripQuotes(s.trim())).filter(Boolean);
    } else if (raw === "null") {
      result[key] = null;
    } else {
      result[key] = stripQuotes(raw);
    }
    i++;
  }
  return result;
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// --- Inventory ---

function listFolders(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}

function readFrontmatter(folderPath) {
  const readme = path.join(folderPath, "README.md");
  if (!fs.existsSync(readme)) return null;
  const text = fs.readFileSync(readme, "utf8");
  return parseFrontmatter(text, readme);
}

function inventory() {
  const result = { apps: [], bots: [], recipes: [], apiSamples: [] };
  const buckets = [
    ["apps",        "sample-app",  result.apps],
    ["bots",        "sample-bot",  result.bots],
    ["recipes",     "recipe",      result.recipes],
    ["api-samples", "api-sample",  result.apiSamples],
  ];
  for (const [dir, expectedKind, target] of buckets) {
    for (const folder of listFolders(path.join(ROOT, dir))) {
      const fm = readFrontmatter(path.join(ROOT, dir, folder));
      if (fm && fm.kind === expectedKind) target.push({ folder, ...fm });
    }
  }
  return result;
}

// --- Validation ---

function validateInventory(inv) {
  const failures = [];
  const buckets = [
    ["apps",        "sample-app",  inv.apps],
    ["bots",        "sample-bot",  inv.bots],
    ["recipes",     "recipe",      inv.recipes],
    ["api-samples", "api-sample",  inv.apiSamples],
  ];
  for (const [dir, kind, items] of buckets) {
    const fsFolders = listFolders(path.join(ROOT, dir));
    const indexed = new Set(items.map(i => i.folder));
    for (const folder of fsFolders) {
      if (!indexed.has(folder)) {
        const readme = path.join(ROOT, dir, folder, "README.md");
        const reason = fs.existsSync(readme)
          ? `README has no '${kind}' frontmatter`
          : `no README.md`;
        failures.push(`${dir}/${folder}: ${reason}`);
      }
    }
  }
  // Per-kind required-field checks
  for (const a of inv.apps) requireFields(a, ["description", "complexity", "key_patterns"], `apps/${a.folder}`, failures);
  for (const b of inv.bots) requireFields(b, ["description", "complexity", "key_patterns"], `bots/${b.folder}`, failures);
  for (const r of inv.recipes) requireFields(r, ["category", "question", "composes"], `recipes/${r.folder}`, failures);
  for (const s of inv.apiSamples) requireFields(s, ["category", "description", "domain", "key_methods"], `api-samples/${s.folder}`, failures);
  // Recipe composes resolution
  const apiSampleFolders = new Set(inv.apiSamples.map(s => s.folder));
  for (const r of inv.recipes) {
    for (const c of r.composes || []) {
      if (!apiSampleFolders.has(c)) {
        failures.push(`recipes/${r.folder}: composes '${c}' does not resolve under api-samples/`);
      }
    }
    if (r.exemplified_by && !inv.apps.some(a => a.folder === r.exemplified_by)) {
      failures.push(`recipes/${r.folder}: exemplified_by '${r.exemplified_by}' does not resolve under apps/`);
    }
  }
  return failures;
}

function requireFields(item, fields, label, failures) {
  for (const f of fields) {
    if (item[f] === undefined || item[f] === null) {
      failures.push(`${label}: missing required field '${f}'`);
    }
  }
}

// --- Generators ---

function sentenceCase(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateAppsOrBotsTable(items) {
  const sorted = [...items].sort((a, b) => {
    const cd = (COMPLEXITY_ORDER[a.complexity] || 99) - (COMPLEXITY_ORDER[b.complexity] || 99);
    if (cd !== 0) return cd;
    return a.folder.localeCompare(b.folder);
  });
  const rows = sorted.map(item => {
    const kp = item.key_patterns || [];
    const patterns = kp.length === 0 ? "" : [sentenceCase(kp[0]), ...kp.slice(1)].join(", ");
    return `| \`${item.folder}\` | ${item.description} | ${patterns} | ${sentenceCase(item.complexity)} |`;
  });
  return [
    "| Folder | Description | Key Patterns | Complexity |",
    "|--------|-------------|-------------|------------|",
    ...rows,
  ].join("\n");
}

function generateRecipesTable(recipes) {
  const sorted = [...recipes].sort((a, b) => {
    const cd = (a.category || "").localeCompare(b.category || "");
    if (cd !== 0) return cd;
    return a.folder.localeCompare(b.folder);
  });
  const rows = sorted.map(r => {
    const composes = (r.composes && r.composes.length)
      ? r.composes.map(c => `\`${c}\``).join(", ")
      : "—";
    const exemplified = r.exemplified_by
      ? `\`apps/${r.exemplified_by}\``
      : "—";
    return `| \`${r.folder}\` | ${r.question} | ${composes} | ${exemplified} |`;
  });
  return [
    "| Folder | Question | Composes | Exemplified by |",
    "|--------|----------|----------|----------------|",
    ...rows,
  ].join("\n");
}

function generateApiSamplesIndex(apiSamples) {
  const out = [];
  for (const { category, heading } of API_SAMPLE_SECTIONS) {
    const rows = apiSamples
      .filter(s => s.category === category)
      .sort((a, b) => a.folder.localeCompare(b.folder));
    if (rows.length === 0) continue;
    if (out.length > 0) out.push("");
    out.push(`### ${heading}`, "");
    out.push("| Folder | Domain | Key Methods |");
    out.push("|--------|--------|-------------|");
    for (const r of rows) {
      const km = (r.key_methods || []).join(", ");
      out.push(`| \`${r.folder}\` | ${r.domain} | ${km} |`);
    }
  }
  return out.join("\n");
}

// --- Marker replacement ---

function replaceMarker(content, name, body) {
  const begin = `<!-- BEGIN: ${name} -->`;
  const end = `<!-- END: ${name} -->`;
  const re = new RegExp(`(${escapeRegex(begin)})[\\s\\S]*?(${escapeRegex(end)})`);
  if (!re.test(content)) {
    throw new Error(`Marker not found in AGENTS.md: ${name}`);
  }
  return content.replace(re, `$1\n${body}\n$2`);
}

function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

// --- Link lint (markdown-link form only; backtick paths can be added later) ---

function lintLinks(content) {
  const failures = [];
  const seen = new Set();
  const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(content))) {
    const target = m[1];
    if (seen.has(target)) continue;
    seen.add(target);
    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#")) continue;
    if (target.includes("{") && target.includes("}")) continue; // {app,bot}-docs shorthand
    const cleaned = target.replace(/[#?].*$/, "").replace(/:\d+(:\d+)?$/, "");
    const candidate = path.resolve(ROOT, cleaned);
    if (!fs.existsSync(candidate)) failures.push(target);
  }
  return failures;
}

// --- Main ---

function main(args = process.argv.slice(2)) {
  const checkOnly = args.includes("--check");

  const inv = inventory();

  const failures = validateInventory(inv);
  if (failures.length) {
    console.error("Inventory validation failed:");
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
  }

  const before = fs.readFileSync(AGENTS_MD, "utf8");
  let after = before;
  after = replaceMarker(after, "catalog/sample-apps",  generateAppsOrBotsTable(inv.apps));
  after = replaceMarker(after, "catalog/sample-bots",  generateAppsOrBotsTable(inv.bots));
  after = replaceMarker(after, "catalog/recipes",      generateRecipesTable(inv.recipes));
  after = replaceMarker(after, "catalog/api-samples",  generateApiSamplesIndex(inv.apiSamples));

  const linkFailures = lintLinks(after);

  if (checkOnly) {
    if (after !== before) {
      console.error("AGENTS.md is out of date. Run: node generate-agents-md.js");
      process.exit(1);
    }
    if (linkFailures.length) {
      console.error(`AGENTS.md link lint failed (${linkFailures.length} unresolved):`);
      linkFailures.forEach(f => console.error(`  ${f}`));
      process.exit(1);
    }
    console.log("AGENTS.md is up to date and links resolve.");
    return;
  }

  if (after !== before) {
    fs.writeFileSync(AGENTS_MD, after);
    console.log(`AGENTS.md regenerated (${inv.apps.length} apps, ${inv.bots.length} bots, ${inv.recipes.length} recipes, ${inv.apiSamples.length} api-samples).`);
  } else {
    console.log("AGENTS.md unchanged.");
  }

  if (linkFailures.length) {
    console.warn(`Link lint: ${linkFailures.length} unresolved markdown link(s) in AGENTS.md:`);
    linkFailures.forEach(f => console.warn(`  ${f}`));
  } else {
    console.log("Link lint: all markdown links resolve.");
  }
}

if (require.main === module) main();

module.exports = { main };
