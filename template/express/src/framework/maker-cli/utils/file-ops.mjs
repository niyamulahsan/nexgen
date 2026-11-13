// ./src/framework/maker-cli/utils/file-ops.mjs

import fs from "node:fs/promises";
import path from "node:path";

/** Write a file only if it does not already exist. Returns true if created. */
export async function writeFileIfMissing(filePath, content) {
  try {
    await fs.access(filePath);
    console.log(`Skipped existing: ${path.relative(process.cwd(), filePath)}`);
    return false;
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`Created: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
}

/** Write a file, overwriting if it exists. */
export async function writeFileAlways(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  console.log(`Updated: ${path.relative(process.cwd(), filePath)}`);
}

/** Source-file extensions that take a `//` line-1 location header. */
const TS_EXTENSIONS = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i;

/**
 * Build the line-1 location header for a source file, or null when the path is
 * outside `src/` or is not a source file that carries one.
 *
 * Why: every source file names its own location on line 1 (AGENTS.md ground
 * rule 3). Stubs cannot hard-code it - the destination is only known at write
 * time, and a baked-in path would leak into every generated file - so the
 * generator injects it here from the real output path.
 */
export function locationHeader(filePath) {
  const relative = path.relative(process.cwd(), filePath).split(path.sep).join("/");
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (!relative.startsWith("src/")) return null;
  const target = `./${relative}`;
  if (/\.vue$/i.test(filePath)) return `<!-- ${target} -->`;
  if (TS_EXTENSIONS.test(filePath)) return `// ${target}`;
  return null;
}

/**
 * Prepend a source file's location header and a blank line, unless the content
 * already starts with one. Paths outside `src/` and non-source files are
 * returned unchanged, and a leading BOM is stripped so the header is line 1.
 */
export function withLocationHeader(filePath, content) {
  const header = locationHeader(filePath);
  if (!header) return content;
  const body = String(content).replace(/^\uFEFF/, "");
  const firstLine = (body.split("\n", 1)[0] ?? "").trim();
  if (firstLine === header || /^\/\/\s*\.\//.test(firstLine) || /^<!--\s*\.\//.test(firstLine)) return body;
  return `${header}\n\n${body}`;
}

/** Write multiple source files under a root, injecting each file's location header. */
export async function writeSourceFiles(root, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await writeFileAlways(filePath, withLocationHeader(filePath, content));
  }
}
