import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(".github/workflows/offline-package.yml", "utf8");

test("Windows smoke step waits for the packaged GUI process and report file", () => {
  assert.match(workflow, /Start-Process[\s\S]*-Wait[\s\S]*-PassThru/);
  assert.match(workflow, /for \(\$attempt = 0; \$attempt -lt 30; \$attempt\+\+\)/);
  assert.match(workflow, /Test-Path \$smokeReport/);
  assert.match(workflow, /Start-Sleep -Seconds 1/);
});
