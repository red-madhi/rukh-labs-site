import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

// Run after `vercel build`. File maps reference files in the project directory;
// measuring only .vercel/output/functions would miss most of each bundle.
const root = process.cwd();
const functionsDir = path.join(root, ".vercel/output/functions");

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(filename));
    else if ((await stat(filename)).isFile()) files.push(filename);
  }
  return files;
}

async function functionDirectories(directory, seen = new Set()) {
  const directories = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (!(await stat(filename)).isDirectory()) continue;
    if (entry.name.endsWith(".func")) {
      const canonical = await realpath(filename);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        directories.push(canonical);
      }
    } else if (entry.isDirectory()) {
      directories.push(...await functionDirectories(filename, seen));
    }
  }
  return directories;
}

const bundles = [];
for (const directory of await functionDirectories(functionsDir)) {
  const config = JSON.parse(await readFile(path.join(directory, ".vc-config.json"), "utf8"));
  const files = new Map();
  for (const filename of await filesUnder(directory)) {
    files.set(path.relative(directory, filename), (await stat(filename)).size);
  }
  for (const [source, destination] of Object.entries(config.filePathMap ?? {})) {
    const info = await stat(path.resolve(root, source));
    if (info.isFile()) files.set(destination, info.size);
  }
  bundles.push({
    function: path.relative(functionsDir, directory),
    runtime: config.runtime,
    fileCount: files.size,
    bytes: [...files.values()].reduce((total, size) => total + size, 0),
    sharpBytes: [...files].filter(([filename]) => /(?:\/sharp|@img\+sharp)/.test(filename))
      .reduce((total, [, size]) => total + size, 0),
  });
}

bundles.sort((a, b) => b.bytes - a.bytes);
console.log(JSON.stringify({
  measurement: "Uncompressed local Vercel build output; includes bundle metadata, excludes route aliases. This is not billed storage usage.",
  bundleCount: bundles.length,
  totalBytes: bundles.reduce((total, bundle) => total + bundle.bytes, 0),
  bundles,
}, null, 2));
