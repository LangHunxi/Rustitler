import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

test("package exposes the tauri script expected by tauri-action", () => {
  assert.equal(packageJson.scripts.tauri, "tauri");
});
