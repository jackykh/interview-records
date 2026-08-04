import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "public", "tc.json");

const res = await fetch("https://www.1823.gov.hk/common/ical/tc.json");

if (!res.ok) {
  console.error(`下載失敗: HTTP ${res.status}`);
  process.exit(1);
}

const json = await res.json();
writeFileSync(outPath, JSON.stringify(json, null, 2), "utf-8");
console.log(`已下載 tc.json 至 ${outPath}`);
