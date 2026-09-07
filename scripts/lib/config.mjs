import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const skillVersion = fs.readFileSync(path.join(skillRoot, "VERSION"), "utf8").trim();
export const theme = JSON.parse(fs.readFileSync(path.join(skillRoot, "assets/brand-contract.json"), "utf8"));
export const templateManifest = JSON.parse(fs.readFileSync(path.join(skillRoot,"assets/mint-template-16x9.manifest.json"),'utf8'));
export const mintTemplatePath = path.join(skillRoot,'assets',templateManifest.templateFile);
export const mintReferencePath = path.join(skillRoot,'assets',templateManifest.referenceFile);
