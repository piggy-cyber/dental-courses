import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicFiles = [
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/components/PublicHeader.tsx",
  "src/components/SignInPanel.tsx",
  "src/components/games/GameNavigation.tsx",
];
const forbidden = [/href=["']\/(?:d1|home|library|contacts|course|resource)/i, /student workspace/i, /private d1/i, /approved student accounts/i];
for (const file of publicFiles) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const pattern of forbidden) assert(!pattern.test(source), `${file} exposes a private-workspace reference: ${pattern}`);
}

const robotsSource = readFileSync(resolve(root, "src/app/robots.ts"), "utf8");
for (const privateRoute of ["/admin", "/contacts", "/course", "/d1", "/home", "/library", "/resource", "/workspace-settings"]) {
  assert(!robotsSource.includes(privateRoute), `robots.ts publicly enumerates a private route: ${privateRoute}`);
}
console.log("Public access boundary validation passed.");
