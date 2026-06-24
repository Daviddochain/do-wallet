import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(sourceRoot, "src");
const config = JSON.parse(await readFile(path.join(srcRoot, "build-config.json"), "utf8"));

async function fileKb(file) {
  return Math.round((await stat(file)).size / 102.4) / 10;
}

async function countRuntime(folder, files) {
  const rows = [];
  for (const file of files) {
    const full = path.join(srcRoot, "runtime", folder, file);
    const code = await readFile(full, "utf8");
    rows.push({
      file,
      kb: await fileKb(full),
      mutationObserver: code.includes("MutationObserver"),
      localStorage: /localStorage|sessionStorage|setItem|removeItem/.test(code),
      domObserver: /querySelector|closest\(|innerHTML|appendChild/.test(code),
    });
  }
  return rows;
}

const before = await countRuntime("before-main", config.beforeMain);
const after = await countRuntime("after-main", config.afterMain);
const standaloneAfter = await countRuntime("after-main", config.standaloneAfterMain || []);
const styles = await readdir(path.join(srcRoot, "styles"));

console.log(JSON.stringify({
  build: config.build,
  beforeMain: before,
  afterMain: after,
  standaloneAfterMain: standaloneAfter,
  styles,
  summary: {
    beforeMain: before.length,
    afterMain: after.length,
    standaloneAfterMain: standaloneAfter.length,
    runtimeModules: before.length + after.length + standaloneAfter.length,
    mutationObservers: before.concat(after, standaloneAfter).filter((row) => row.mutationObserver).length,
    storageModules: before.concat(after, standaloneAfter).filter((row) => row.localStorage).length,
  },
}, null, 2));
