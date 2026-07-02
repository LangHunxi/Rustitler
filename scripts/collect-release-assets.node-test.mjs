import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectReleaseAssets } from "./collect-release-assets.mjs";

test("collectReleaseAssets publishes short installer names for both LibreOffice variants", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rustitler-release-assets-"));
  const inputDir = path.join(tempDir, "release-artifacts");
  const outputDir = path.join(tempDir, "release-assets");

  const artifactDirs = [
    "rustitler-macos-offline-package-without-libreoffice",
    "rustitler-macos-offline-package-with-libreoffice",
    "rustitler-windows-offline-package-without-libreoffice",
    "rustitler-windows-offline-package-with-libreoffice",
  ];
  for (const artifactDir of artifactDirs) {
    fs.mkdirSync(path.join(inputDir, artifactDir), { recursive: true });
  }

  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-macos-offline-package-without-libreoffice",
      "Rustitler_0.1.0_aarch64.dmg",
    ),
    "macos installer without libreoffice",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-macos-offline-package-with-libreoffice",
      "Rustitler_0.1.0_aarch64.dmg",
    ),
    "macos installer with libreoffice",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-windows-offline-package-without-libreoffice",
      "Rustitler_0.1.0_x64-setup.exe",
    ),
    "windows installer without libreoffice",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-windows-offline-package-with-libreoffice",
      "Rustitler_0.1.0_x64-setup.exe",
    ),
    "windows installer with libreoffice",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-windows-offline-package-without-libreoffice",
      "Rustitler_0.1.0_x64_en-US.msi",
    ),
    "windows msi",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-macos-offline-package-without-libreoffice",
      "rustitler-package-size-report.md",
    ),
    "report",
  );
  fs.writeFileSync(
    path.join(
      inputDir,
      "rustitler-windows-offline-package-without-libreoffice",
      "rustitler-offline-smoke.json",
    ),
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
    [
      "Rustitler-0.1.2-macos-without-libreoffice.dmg",
      "Rustitler-0.1.2-macos-with-libreoffice.dmg",
      "Rustitler-0.1.2-windows-without-libreoffice.exe",
      "Rustitler-0.1.2-windows-with-libreoffice.exe",
    ],
  );
  assert.deepEqual(fs.readdirSync(outputDir).sort(), [
    "Rustitler-0.1.2-macos-with-libreoffice.dmg",
    "Rustitler-0.1.2-macos-without-libreoffice.dmg",
    "Rustitler-0.1.2-windows-with-libreoffice.exe",
    "Rustitler-0.1.2-windows-without-libreoffice.exe",
  ]);
  assert.equal(
    fs.readFileSync(
      path.join(outputDir, "Rustitler-0.1.2-macos-without-libreoffice.dmg"),
      "utf8",
    ),
    "macos installer without libreoffice",
  );
  assert.equal(
    fs.readFileSync(
      path.join(outputDir, "Rustitler-0.1.2-windows-with-libreoffice.exe"),
      "utf8",
    ),
    "windows installer with libreoffice",
  );
});
