#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isMainModule } from "./module-entry.mjs";

const TARGETS = [
  {
    platform: "macos",
    extension: ".dmg",
    matcher: (filePath) =>
      path.extname(filePath).toLowerCase() === ".dmg" &&
      filePath.includes(`rustitler-macos-offline-package${path.sep}`),
  },
  {
    platform: "windows",
    extension: ".exe",
    matcher: (filePath) =>
      path.extname(filePath).toLowerCase() === ".exe" &&
      filePath.includes(`rustitler-windows-offline-package${path.sep}`),
  },
];

export function collectReleaseAssets({
  inputDir,
  outputDir,
  productName = "Rustitler",
  tag,
} = {}) {
  if (!inputDir) {
    throw new Error("inputDir is required");
  }
  if (!outputDir) {
    throw new Error("outputDir is required");
  }
  if (!tag) {
    throw new Error("tag is required");
  }

  const version = tag.replace(/^v/, "");
  const files = listFiles(inputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  return TARGETS.map((target) => {
    const source = files.find(target.matcher);
    if (!source) {
      throw new Error(`No ${target.platform} ${target.extension} installer found in ${inputDir}`);
    }

    const destination = path.join(
      outputDir,
      `${productName}-${version}-${target.platform}${target.extension}`,
    );
    fs.copyFileSync(source, destination);
    return destination;
  });
}

function listFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(filePath);
    }
    return entry.isFile() ? [filePath] : [];
  });
}

function parseArgs(argv) {
  const options = {
    inputDir: undefined,
    outputDir: undefined,
    productName: "Rustitler",
    tag: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      options.inputDir = path.resolve(argv[++index]);
    } else if (arg === "--output") {
      options.outputDir = path.resolve(argv[++index]);
    } else if (arg === "--product-name") {
      options.productName = argv[++index];
    } else if (arg === "--tag") {
      options.tag = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function main() {
  const assets = collectReleaseAssets(parseArgs(process.argv.slice(2)));
  for (const asset of assets) {
    console.log(asset);
  }
}

if (isMainModule(import.meta.url, process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
