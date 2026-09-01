import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const designRoot = resolve(dirname(scriptPath), "..");
const repositoryRoot = resolve(designRoot, "../..");
const defaultComponentsRoot = join(designRoot, "src/ui/components");
const inventoryPath = join(repositoryRoot, ".github/workplans/HDJG-26.md");
const componentNamePattern = /^[A-Z][A-Za-z0-9]*UI$/u;
const ignoredProductionPattern = /(?:\.stories|\.test)\.tsx?$/u;
const forbiddenBareSpecifierPattern =
  /^(?:@base-ui\/|@window\/(?:app|shell|ui|web)(?:\/|$)|apps?(?:\/|$)|application(?:\/|$))/iu;
const forbiddenResolvedPathPattern =
  /\/(?:apps?|application|packages\/(?:ui|shell)|packages\/design\/src\/(?:core|headless|shell))(?:\/|$)/iu;

const formatError = (error) => (error instanceof Error ? error.message : String(error));
const toPosix = (value) => value.split(sep).join("/");

const parseSource = (filePath, source) => {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    extname(filePath) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    const diagnostics = sourceFile.parseDiagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("; ");
    throw new Error(`${filePath}: TypeScript 구문을 해석할 수 없습니다: ${diagnostics}`);
  }
  return sourceFile;
};

const readSource = async (filePath) => parseSource(filePath, await readFile(filePath, "utf8"));

const listFiles = async (root) => {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
};

const hasExportModifier = (node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

const collectConcreteComponents = (sourceFile) => {
  const names = [];
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name !== undefined &&
      componentNamePattern.test(statement.name.text)
    )
      names.push(statement.name.text);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && componentNamePattern.test(declaration.name.text)) {
          names.push(declaration.name.text);
        }
      }
    }
  }
  return names;
};

const collectRuntimeReexports = (sourceFile) => {
  const exports = [];
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.isTypeOnly ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause)
    )
      continue;
    for (const element of statement.exportClause.elements) {
      if (!element.isTypeOnly) {
        exports.push({ name: element.name.text, specifier: statement.moduleSpecifier.text });
      }
    }
  }
  return exports;
};

const collectImports = (sourceFile) =>
  sourceFile.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier),
    )
    .map((statement) => statement.moduleSpecifier.text);

const moduleBase = (filePath) => filePath.replace(/\.(?:js|ts|tsx)$/u, "");

const discoverFamilies = async (componentsRoot) =>
  (await readdir(componentsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

const checkFamily = async (componentsRoot, family) => {
  const errors = [];
  const familyRoot = join(componentsRoot, family);
  const allFiles = await listFiles(familyRoot);
  const productionFiles = allFiles.filter(
    (path) => /\.tsx?$/u.test(path) && !ignoredProductionPattern.test(path),
  );
  const componentFiles = productionFiles.filter((path) => path.endsWith(".tsx"));
  const storyFiles = allFiles.filter((path) => path.endsWith(".stories.tsx"));
  const indexPath = join(familyRoot, "index.ts");
  const publicExports = collectRuntimeReexports(await readSource(indexPath));
  const publicNames = new Set(publicExports.map(({ name }) => name));

  if (storyFiles.length === 0) {
    errors.push(`${toPosix(relative(designRoot, familyRoot))}: production family Story가 없습니다`);
  }

  for (const { name, specifier } of publicExports) {
    if (!componentNamePattern.test(name)) {
      errors.push(
        `${toPosix(relative(designRoot, indexPath))}: runtime export ${name}은 Component UI 이름이 아닙니다`,
      );
      continue;
    }
    const sourcePath = resolve(familyRoot, `${specifier.replace(/\.js$/u, "")}.tsx`);
    try {
      if (!collectConcreteComponents(await readSource(sourcePath)).includes(name)) {
        errors.push(
          `${toPosix(relative(designRoot, sourcePath))}: public ${name} concrete 선언이 없습니다`,
        );
      }
    } catch (error) {
      errors.push(`${name}: ${formatError(error)}`);
    }
  }

  const importedModuleBases = new Set();
  for (const filePath of productionFiles) {
    const sourceFile = await readSource(filePath);
    for (const specifier of collectImports(sourceFile)) {
      const resolvedSpecifier = specifier.startsWith(".")
        ? toPosix(resolve(dirname(filePath), specifier))
        : specifier;
      if (
        forbiddenBareSpecifierPattern.test(specifier) ||
        forbiddenResolvedPathPattern.test(resolvedSpecifier)
      )
        errors.push(`${toPosix(relative(designRoot, filePath))}: forbidden UI import ${specifier}`);
      if (specifier.startsWith(".")) {
        importedModuleBases.add(moduleBase(resolve(dirname(filePath), specifier)));
      }
    }
  }

  for (const filePath of componentFiles) {
    for (const component of collectConcreteComponents(await readSource(filePath))) {
      if (!publicNames.has(component) && !importedModuleBases.has(moduleBase(filePath))) {
        errors.push(
          `${toPosix(relative(designRoot, filePath))}: ${component}은 public export도 family-local consumer도 없는 orphan source입니다`,
        );
      }
    }
  }

  for (const storyPath of storyFiles) {
    const storyOnlyComponents = collectConcreteComponents(await readSource(storyPath));
    if (storyOnlyComponents.length > 0) {
      errors.push(
        `${toPosix(relative(designRoot, storyPath))}: Story-only product Component ${storyOnlyComponents.join(", ")}`,
      );
    }
  }
  return errors;
};

const checkAggregate = async (componentsRoot, families) => {
  const sourceFile = await readSource(join(componentsRoot, "index.ts"));
  const reexports = sourceFile.statements
    .filter(
      (statement) =>
        ts.isExportDeclaration(statement) &&
        !statement.isTypeOnly &&
        statement.exportClause === undefined &&
        statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier),
    )
    .map((statement) =>
      statement.moduleSpecifier.text.replace(/\/index\.js$/u, "").replace(/\.js$/u, ""),
    );
  return families
    .filter((family) => reexports.filter((specifier) => specifier === `./${family}`).length !== 1)
    .map(
      (family) => `src/ui/components/index.ts: ./${family} family를 정확히 한 번 재노출해야 합니다`,
    );
};

const checkLegacyInventory = async () => {
  const workplan = await readFile(inventoryPath, "utf8");
  const roots = [
    join(repositoryRoot, "packages/ui/src/components/window"),
    join(repositoryRoot, "packages/ui/src/components/taskbar"),
    join(repositoryRoot, "packages/ui/src/components/base/panel"),
  ];
  const observed = (await Promise.all(roots.map(listFiles)))
    .flat()
    .filter((path) => path.endsWith("/index.tsx"));
  return observed
    .map((path) => toPosix(relative(repositoryRoot, path)))
    .filter((path) => !workplan.includes(`\`${path}\``))
    .map((path) => `${path}: Workplan legacy owner matrix에 분류되지 않았습니다`);
};

const checkRetiredBoundaries = async () => {
  const packageManifest = await readFile(join(designRoot, "package.json"), "utf8");
  const rootEntry = await readFile(join(designRoot, "src/index.ts"), "utf8");
  const vitestConfig = await readFile(join(designRoot, "vitest.config.ts"), "utf8");
  const errors = [];
  if (/\/(?:core|shell)\/index/u.test(rootEntry)) {
    errors.push("src/index.ts: retired Core/Shell export가 남아 있습니다");
  }
  if (!rootEntry.includes("./headless/index.js")) {
    errors.push("src/index.ts: headless sibling export가 없습니다");
  }
  if (/--project\s+(?:core|shell)\b/u.test(packageManifest)) {
    errors.push("package.json: retired Core/Shell test project가 남아 있습니다");
  }
  if (/src\/(?:core|shell)\/|name:\s*["'](?:core|shell)["']/u.test(vitestConfig)) {
    errors.push("vitest.config.ts: retired Core/Shell test project가 남아 있습니다");
  }
  return errors;
};

const checkComponentContracts = async (componentsRoot, { includeInventory }) => {
  const families = await discoverFamilies(componentsRoot);
  if (families.length === 0)
    throw new Error(`${componentsRoot}: Component family를 찾지 못했습니다`);
  const errors = [
    ...(await Promise.all(families.map((family) => checkFamily(componentsRoot, family)))).flat(),
    ...(await checkAggregate(componentsRoot, families)),
    ...(includeInventory ? await checkLegacyInventory() : []),
    ...(includeInventory ? await checkRetiredBoundaries() : []),
  ];
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return families;
};

const writeFixtureFamily = async (root, { illegalImport = false }) => {
  const family = `fixture${randomUUID().replaceAll("-", "")}`;
  const symbol = `${family.charAt(0).toUpperCase()}${family.slice(1)}UI`;
  const familyRoot = join(root, family);
  await mkdir(familyRoot, { recursive: true });
  await writeFile(join(root, "index.ts"), `export * from "./${family}";\n`, "utf8");
  await writeFile(
    join(familyRoot, "index.ts"),
    `export { ${symbol} } from "./${family}UI";\n`,
    "utf8",
  );
  await writeFile(
    join(familyRoot, `${family}UI.tsx`),
    `${illegalImport ? 'import { LegacyUI } from "@window/ui";\nvoid LegacyUI;\n' : ""}export const ${symbol} = () => null;\n`,
    "utf8",
  );
  await writeFile(join(familyRoot, `${family}UI.stories.tsx`), "export default {};\n", "utf8");
};

const probeFixture = (root) =>
  spawnSync(process.execPath, [scriptPath, "--components-root", root], { encoding: "utf8" });

const verifyFixtures = async () => {
  const fixtureParent = await mkdtemp(join(dirname(scriptPath), ".component-contract-fixture-"));
  try {
    const additiveRoot = join(fixtureParent, "additive");
    await mkdir(additiveRoot);
    await writeFixtureFamily(additiveRoot, {});
    const additive = probeFixture(additiveRoot);
    if (additive.status !== 0) {
      throw new Error(
        `additive Component discovery fixture 실패:\n${additive.stderr || additive.stdout}`,
      );
    }
    const illegalRoot = join(fixtureParent, "illegal-import");
    await mkdir(illegalRoot);
    await writeFixtureFamily(illegalRoot, { illegalImport: true });
    const illegal = probeFixture(illegalRoot);
    if (illegal.status === 0 || !illegal.stderr.includes("forbidden UI import")) {
      throw new Error(
        `illegal import fixture가 거부되지 않았습니다:\n${illegal.stderr || illegal.stdout}`,
      );
    }
  } finally {
    await rm(fixtureParent, { force: true, recursive: true });
  }
};

const parseArguments = (arguments_) => {
  let componentsRoot = defaultComponentsRoot;
  let verifyGeneratedFixtures = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--verify-fixtures") verifyGeneratedFixtures = true;
    else if (argument === "--components-root") {
      componentsRoot = resolve(arguments_[index + 1] ?? "");
      index += 1;
    } else throw new Error(`알 수 없는 인자입니다: ${argument}`);
  }
  return { componentsRoot, verifyGeneratedFixtures };
};

try {
  const { componentsRoot, verifyGeneratedFixtures } = parseArguments(process.argv.slice(2));
  const families = await checkComponentContracts(componentsRoot, {
    includeInventory: componentsRoot === defaultComponentsRoot,
  });
  if (verifyGeneratedFixtures) await verifyFixtures();
  process.stdout.write(
    `Component discovery architecture가 유효합니다 (${families.join(", ")}${verifyGeneratedFixtures ? ", generated fixtures 포함" : ""}).\n`,
  );
} catch (error) {
  process.stderr.write(`${formatError(error)}\n`);
  process.exitCode = 1;
}
