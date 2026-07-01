import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectReleaseAssets } from "./collect-release-assets.mjs";

test("collectReleaseAssets publishes only short installer names", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rustitler-release-assets-"));
  const inputDir = path.join(tempDir, "release-artifacts");
  const outputDir = path.join(tempDir, "release-assets");

  fs.mkdirSync(path.join(inputDir, "rustitler-macos-offline-package"), { recursive: true });
  fs.mkdirSync(path.join(inputDir, "rustitler-windows-offline-package"), { recursive: true });

  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-macos-offline-package",
      "Rustitler_0.1.0_aarch64.dmg",
    ),
    "macos installer",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-windows-offline-package",
      "Rustitler_0.1.0_x64-setup.exe",
    ),
    "windows installer",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-windows-offline-package",
      "Rustitler_0.1.0_x64_en-US.msi",
    ),
    "windows msi",
  );
  fs.writeFileSync(
    path.join(inputDir, "rustitler-macos-offline-package", "rustitler-package-size-report.md"),
    "report",
  );
  fs.writeFileSync(
    path.join(inputDir, "rustitler-windows-offline-package", "rustitler-offline-smoke.json"),
    "{}",
  );

  const assets = collectReleaseAssets({
    inputDir,
    outputDir,
    productName: "Rustitler",
    tag: "v0.1.2",
  });

  assert.deepEqual(
    assets.map((asset) => path.basename(asset)),
    ["Rustitler-0.1.2-macos.dmg", "Rustitler-0.1.2-windows.exe"],
  );
  assert.deepEqual(fs.readdirSync(outputDir).sort(), [
    "Rustitler-0.1.2-macos.dmg",
    "Rustitler-0.1.2-windows.exe",
  ]);
  assert.equal(fs.readFileSync(path.join(outputDir, "Rustitler-0.1.2-macos.dmg"), "utf8"), "macos installer");
  assert.equal(fs.readFileSync(path.join(outputDir, "Rustitler-0.1.2-windows.exe"), "utf8"), "windows installer");
});
