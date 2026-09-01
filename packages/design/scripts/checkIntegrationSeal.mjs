import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const designRoot = resolve(dirname(scriptPath), "..");
const repositoryRoot = resolve(designRoot, "../..");
const uiRoot = join(designRoot, "src/ui");
const storiesRoot = uiRoot;
const retiredCompositionDirectory = join(uiRoot, ["pat", "terns"].join(""));
const retiredCompositionSpecifier = ["ui", "/pat", "terns"].join("");
const retiredSheetName = ["Bottom", " Sheet"].join("");
const retiredRoleCount = ["21", " public roles"].join("");

const toPosix = (value) => value.split(sep).join("/");

const listFiles = async (root) => {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
};

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const checkRetiredSurfaces = async () => {
  const errors = [];
  if (await exists(retiredCompositionDirectory)) {
    errors.push("src/ui 아래에 폐기된 composition namespace가 남아 있습니다");
  }

  const activeFiles = [
    join(repositoryRoot, "AGENTS.md"),
    join(repositoryRoot, ".github/workplans/HDJG-26.md"),
    join(designRoot, "package.json"),
    join(designRoot, "eslint.config.mjs"),
    join(designRoot, "vitest.config.ts"),
    ...(await listFiles(join(designRoot, "src"))).filter((path) =>
      [".ts", ".tsx"].includes(extname(path)),
    ),
  ];

  for (const path of activeFiles) {
    const source = await readFile(path, "utf8");
    for (const retiredTerm of [retiredCompositionSpecifier, retiredSheetName, retiredRoleCount]) {
      if (source.includes(retiredTerm)) {
        errors.push(
          `${toPosix(relative(repositoryRoot, path))}: active source/document에 폐기된 계약 ${retiredTerm}이 남아 있습니다`,
        );
      }
    }
  }
  return errors;
};

const checkProductReferences = async () => {
  const errors = [];
  const storyFiles = (await listFiles(storiesRoot)).filter((path) =>
    path.endsWith(".stories.tsx"),
  );

  for (const path of storyFiles) {
    const source = await readFile(path, "utf8");
    if (!source.includes("Product Reference —")) continue;

    const isComponentStory = toPosix(path).includes("/src/ui/components/");
    const importsProductionComponent = /from\s+["'](?:\.\.\/)+components\//u.test(source);
    if (!isComponentStory && !importsProductionComponent) {
      errors.push(
        `${toPosix(relative(designRoot, path))}: Product Reference가 production Component 없이 raw Story composition을 사용합니다`,
      );
    }

    if (
      source.includes('data-product-state="planned"') ||
      source.includes("Reference state: Planned") ||
      source.includes("구현 예정")
    ) {
      errors.push(
        `${toPosix(relative(designRoot, path))}: 구현 전 surrogate를 Product Reference로 주장합니다`,
      );
    }
  }
  return errors;
};

const errors = [...(await checkRetiredSurfaces()), ...(await checkProductReferences())];
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Integration seal이 유효합니다 (retired namespace/계약 0, production-only Product Reference).\n",
  );
}
