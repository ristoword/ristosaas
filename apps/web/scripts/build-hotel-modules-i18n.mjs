/**
 * Generates EN/NL/PT hotel module dictionaries from IT base + locale overrides.
 * Run: node apps/web/scripts/build-hotel-modules-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, "../src/core/i18n/hotel-modules-i18n.ts");

function parseItObject(source) {
  const start = source.indexOf("export const hotelModulesIt = {");
  const end = source.indexOf("} as const;", start);
  const block = source.slice(start + "export const hotelModulesIt = ".length, end + 1);
  const entries = {};
  for (const m of block.matchAll(/"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g)) {
    entries[m[1]] = m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  return entries;
}

/** @type {Record<string, Partial<Record<'en'|'nl'|'pt', string>>>} */
const overrides = JSON.parse(
  fs.readFileSync(path.join(__dirname, "hotel-modules-i18n-overrides.json"), "utf8"),
);

function buildLocale(it, locale) {
  const out = {};
  for (const [key, value] of Object.entries(it)) {
    out[key] = overrides[key]?.[locale] ?? overrides[key]?.en ?? value;
  }
  return out;
}

function toTsExport(name, obj) {
  const lines = Object.entries(obj).map(([k, v]) => {
    const esc = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    return `  "${k}": "${esc}",`;
  });
  return `export const ${name} = {\n${lines.join("\n")}\n} as const;`;
}

const source = fs.readFileSync(srcPath, "utf8");
const itOnly = source.split("export const hotelModulesEn")[0].trimEnd();
const it = parseItObject(source);
const en = buildLocale(it, "en");
const nl = buildLocale(it, "nl");
const pt = buildLocale(it, "pt");

const footer = `\n\n${toTsExport("hotelModulesEn", en)}\n\n${toTsExport("hotelModulesNl", nl)}\n\n${toTsExport("hotelModulesPt", pt)}\n\nexport const hotelModulesByLocale = {\n  it: hotelModulesIt,\n  en: hotelModulesEn,\n  nl: hotelModulesNl,\n  pt: hotelModulesPt,\n} as const;\n`;

fs.writeFileSync(srcPath, itOnly + footer);
console.log(`Updated ${srcPath} with ${Object.keys(en).length} keys × 3 locales`);
