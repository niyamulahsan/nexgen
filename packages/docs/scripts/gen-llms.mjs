#!/usr/bin/env node
// ./scripts/gen-llms.mjs

/**
 * Generate `public/llms.txt` (an index) and `public/llms-full.txt` (every page
 * concatenated) from the VitePress markdown, so an AI can read the whole docs
 * set in one request without an MCP server or any client configuration.
 *
 * Runs as a `prebuild` step: VitePress copies `public/` at build time, so the
 * two files land at the site root (`/nexwire/llms.txt`).
 *
 * URLs are extensionless to match the site navigation (GitHub Pages serves
 * `/guide/modules` for `guide/modules.html`).
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const BASE = "https://niyamulahsan.github.io/nexwire";

const SKIP_DIRS = new Set(["node_modules", ".vitepress", "public", "scripts"]);

/** Group order and headings in llms.txt. Anything else falls into "Other". */
const GROUPS = [
  ["guide", "Guide"],
  ["cli", "CLI"],
  ["api", "API Reference"],
  ["deploy", "Deploy"],
  ["", "Other"],
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
    } else if (extname(entry.name).toLowerCase() === ".md") {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Drop a leading `---` frontmatter block so headings are found. */
function stripFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4).replace(/^\r?\n/, "");
}

/** First `# Title`, or a fallback derived from the path. */
function titleOf(text, rel) {
  const match = /^#\s+(.+?)\s*$/m.exec(stripFrontmatter(text));
  if (match) return match[1].trim();
  const leaf = basename(rel, ".md");
  if (leaf === "index") return basename(dirname(rel)) || "nexwire";
  return leaf.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First real paragraph after the title, trimmed to one clean line. */
function descriptionOf(text) {
  const body = stripFrontmatter(text);
  const lines = body.split(/\r?\n/);
  let seenTitle = false;
  let inFence = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^(```|~~~)/.test(t)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!seenTitle) {
      if (/^#\s/.test(t)) seenTitle = true;
      continue;
    }
    if (!t) continue;
    if (/^(#{1,6}\s|:::|<|>|\||-{3,})/.test(t)) continue;
    if (/^[-*+]\s/.test(t) || /^\d+\.\s/.test(t)) continue;
    const clean = t
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) continue;
    return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
  }
  return "";
}

/** `guide/modules.md` -> `/guide/modules`, `index.md` -> `/`. */
function urlOf(rel) {
  const noExt = rel.split("\\").join("/").replace(/\.md$/, "");
  const clean = noExt.replace(/(^|\/)index$/, "$1").replace(/\/$/, "");
  return clean ? `${BASE}/${clean}` : `${BASE}/`;
}

const files = walk(ROOT).sort((a, b) => a.localeCompare(b));
const pages = files.map((file) => {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  return {
    rel: rel.split("\\").join("/"),
    group: rel.includes("\\") || rel.includes("/") ? rel.split(/[\\/]/)[0] : "",
    url: urlOf(rel),
    title: titleOf(text, rel),
    description: descriptionOf(text),
    content: stripFrontmatter(text).trim(),
  };
});

// --- llms.txt -------------------------------------------------------------

const index = [
  "# nexwire",
  "",
  "> Full-stack TypeScript framework — a Hono, Express or Fastify API + a Vue 3",
  "> SPA + Drizzle ORM + Redis services, with conventions that a coding agent can",
  "> follow. Read this index first, then fetch the page you need.",
  "",
  `Everything in one file: ${BASE}/llms-full.txt`,
  "",
];

for (const [key, heading] of GROUPS) {
  const items = pages.filter((p) => p.group === key && p.rel !== "index.md");
  if (!items.length) continue;
  index.push(`## ${heading}`, "");
  for (const page of items) {
    index.push(`- [${page.title}](${page.url})${page.description ? `: ${page.description}` : ""}`);
  }
  index.push("");
}

// --- llms-full.txt --------------------------------------------------------

const full = [
  "# nexwire — full documentation",
  "",
  `> Generated from ${BASE}. Every page below is verbatim.`,
  "",
];

for (const page of pages) {
  full.push("---", "", `# ${page.title}`, "", `Source: ${page.url}`, "", page.content, "");
}

mkdirSync(PUBLIC, { recursive: true });
writeFileSync(join(PUBLIC, "llms.txt"), `${index.join("\n").trimEnd()}\n`);
writeFileSync(join(PUBLIC, "llms-full.txt"), `${full.join("\n").trimEnd()}\n`);

console.log(`llms.txt + llms-full.txt generated from ${pages.length} pages.`);
