# AGENTS.md instructions

@/Users/shenxiaoliang/.codex/RTK.md

## Drag-drop duplicate output regression

If the app creates two renamed output files for a single default drag-and-drop
import, first check whether the frontend started the same batch twice.

Tauri on macOS can emit the same drag-drop gesture through both the current
webview and the current window. `src/api/dragDrop.ts` intentionally subscribes
to both targets for compatibility, so it must deduplicate identical `drop`
payloads arriving in the same short gesture window before calling the import
handler.

Do not "fix" this symptom by removing the rename module's normal filename
conflict suffix behavior. Creating `标题 (2).doc` is still correct when a real
same-name output file already exists. For this regression, add or preserve a
frontend test proving that one gesture emitted by both Tauri targets calls the
drop handler only once.

## Rustitler packaging

Always prefix shell commands with `rtk`, as required by the shared RTK
instructions.

Never use plain `tauri build`, `cargo build --release`, or
`npm run tauri -- build` for a user-facing Rustitler package. Those builds do
not enable the runtime extraction feature flags and can produce the app error
`当前构建未启用文档提取依赖。`

The release/offline package command is:

```sh
rtk npm run tauri:build:offline
```

That script prepares OCR assets and invokes Tauri with
`--features offline-bundle`, which enables:

- PDF extraction dependencies
- DOCX extraction dependencies
- OCR extraction dependencies
- bundled `resources/tessdata/chi_sim.traineddata`

The LibreOffice runtime is controlled separately by whether
`src-tauri/resources/libreoffice/LibreOffice.app` exists before packaging.

Final delivery DMGs must be copied to the stable package directory
`src-tauri/target/release/packages/`. Do not rely on
`src-tauri/target/release/bundle/dmg/` as the final handoff location because
Tauri rebuilds can clean or replace that directory when producing the next
variant.

The two expected delivery artifact names are:

- `src-tauri/target/release/packages/Rustitler_0.1.0_aarch64_without-libreoffice.dmg`
- `src-tauri/target/release/packages/Rustitler_0.1.0_aarch64_with-libreoffice.dmg`

## Package without bundled LibreOffice

Use this only when the package does not need fully offline legacy `.doc`
conversion. PDF, DOCX, and OCR extraction are still compiled and bundled
through `offline-bundle`.

Before building, make sure the local LibreOffice app bundle is absent:

```sh
rtk rm -rf src-tauri/resources/libreoffice/LibreOffice.app
```

Then build:

```sh
rtk npm run tauri:build:offline
```

Verify the generated app bundle:

```sh
rtk src-tauri/target/release/bundle/macos/Rustitler.app/Contents/MacOS/rustitler \
  --offline-smoke-test \
  --resource-dir src-tauri/target/release/bundle/macos/Rustitler.app/Contents/Resources \
  --app-data-dir /tmp/rustitler-offline-smoke-data \
  --report-path /tmp/rustitler-offline-smoke-report.json \
  --require-ocr
```

Expected smoke-test checks for this mode:

- `tessdataPresent: true`
- `imageOcr: passed`
- `sofficePresent: false`

Finally verify the DMG:

```sh
rtk hdiutil verify src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg
```

Copy the verified DMG to the stable delivery directory:

```sh
rtk mkdir -p src-tauri/target/release/packages
rtk cp src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg \
  src-tauri/target/release/packages/Rustitler_0.1.0_aarch64_without-libreoffice.dmg
rtk hdiutil verify src-tauri/target/release/packages/Rustitler_0.1.0_aarch64_without-libreoffice.dmg
```

## Package with bundled LibreOffice

Use this when the user asks to ensure all document dependencies are bundled, or
when the package must support offline legacy `.doc` conversion without relying
on a system LibreOffice install.

Copy the local LibreOffice runtime into the configured Tauri resource path:

```sh
rtk ditto /Applications/LibreOffice.app src-tauri/resources/libreoffice/LibreOffice.app
```

Confirm the executable exists:

```sh
rtk ls -la src-tauri/resources/libreoffice/LibreOffice.app/Contents/MacOS/soffice
```

Build with the offline feature bundle:

```sh
rtk npm run tauri:build:offline
```

Because nested LibreOffice signatures can make the outer app fail deep
verification after bundling, re-sign the generated app with a unified ad-hoc
signature:

```sh
rtk codesign --force --deep --sign - src-tauri/target/release/bundle/macos/Rustitler.app
```

The DMG generated before this re-signing is stale. Regenerate it from the
re-signed `.app`:

```sh
rtk rm -f src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg
rtk src-tauri/target/release/bundle/dmg/bundle_dmg.sh \
  --volname Rustitler \
  --volicon src-tauri/target/release/bundle/dmg/icon.icns \
  --icon Rustitler.app 128 128 \
  --hide-extension Rustitler.app \
  --app-drop-link 375 128 \
  --no-internet-enable \
  src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg \
  src-tauri/target/release/bundle/macos
```

Verify the final DMG contents by mounting the DMG, not only by checking the
build directory:

```sh
rtk hdiutil attach -nobrowse -readonly src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg
rtk ls -la /Volumes/Rustitler/Rustitler.app/Contents/Resources/tessdata/chi_sim.traineddata
rtk ls -la /Volumes/Rustitler/Rustitler.app/Contents/Resources/libreoffice/LibreOffice.app/Contents/MacOS/soffice
rtk codesign --verify --deep --strict --verbose=2 /Volumes/Rustitler/Rustitler.app
rtk /Volumes/Rustitler/Rustitler.app/Contents/Resources/libreoffice/LibreOffice.app/Contents/MacOS/soffice --version
rtk /Volumes/Rustitler/Rustitler.app/Contents/MacOS/rustitler \
  --offline-smoke-test \
  --resource-dir /Volumes/Rustitler/Rustitler.app/Contents/Resources \
  --app-data-dir /tmp/rustitler-dmg-smoke-data \
  --report-path /tmp/rustitler-dmg-smoke-report.json \
  --require-ocr
rtk hdiutil detach /Volumes/Rustitler
```

Expected smoke-test checks for this mode:

- `tessdataPresent: true`
- `sofficePresent: true`
- `imageOcr: passed`

Then verify the DMG checksum structure:

```sh
rtk hdiutil verify src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg
```

Copy the verified DMG to the stable delivery directory:

```sh
rtk mkdir -p src-tauri/target/release/packages
rtk cp src-tauri/target/release/bundle/dmg/Rustitler_0.1.0_aarch64.dmg \
  src-tauri/target/release/packages/Rustitler_0.1.0_aarch64_with-libreoffice.dmg
rtk hdiutil verify src-tauri/target/release/packages/Rustitler_0.1.0_aarch64_with-libreoffice.dmg
```

## DMG failure cleanup

If DMG creation fails after mounting a temporary disk image, clean up before
retrying:

```sh
rtk hdiutil info
rtk hdiutil detach /Volumes/Rustitler
```

If the volume name is different, detach the `/dev/diskN` shown by
`rtk hdiutil info`. Remove stale temporary images before retrying:

```sh
rtk rm -f src-tauri/target/release/bundle/macos/rw.*.Rustitler_0.1.0_aarch64.dmg
```

## Local asset hygiene

`src-tauri/resources/libreoffice/LibreOffice.app/` is a large local packaging
asset and must stay ignored by Git. Do not commit it. The tracked placeholder
`src-tauri/resources/libreoffice/.gitkeep` should remain.
