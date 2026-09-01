import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const designRoot = resolve(scriptDirectory, "..");
const componentsRoot = join(designRoot, "src/ui/components");

const familyRoles = {
  folder: [
    "FolderCategoryItemUI",
    "FolderFileCardUI",
    "FolderFileGridUI",
    "FolderFrameUI",
    "FolderSidebarUI",
    "FolderViewerUI",
  ],
  taskbar: [
    "TaskbarAppListUI",
    "TaskbarClockUI",
    "TaskbarItemUI",
    "TaskbarPreviewUI",
    "TaskbarRootUI",
    "TaskbarSearchUI",
    "TaskbarStartButtonUI",
    "WindowPanelUI",
  ],
  window: [
    "RouteInputUI",
    "TagInputUI",
    "WindowControlsUI",
    "WindowFrameUI",
    "WindowRouteBarUI",
    "WindowTabUI",
    "WindowTitleBarUI",
  ],
};

const primitiveConsumers = {
  FolderCategoryItemUI: "CollapsibleUI",
  FolderFileCardUI: "ButtonUI",
  RouteInputUI: "ComboboxUI",
  TagInputUI: "SelectUI",
  TaskbarItemUI: "IconButtonUI",
  TaskbarSearchUI: "InputUI",
  TaskbarStartButtonUI: "IconButtonUI",
  WindowControlsUI: "IconButtonUI",
  WindowRouteBarUI: "IconButtonUI",
};

const privateRoles = ["WindowResizeHandlesUI"];
const ignoredSourcePattern = /(?:\.stories|\.test)\.tsx?$/u;
const forbiddenSpecifierPattern =
  /(?:^|\/)(?:apps?|application|core|shell)(?:\/|$)|(?:^|\/)packages\/(?:ui|shell)(?:\/|$)|^@base-ui\//iu;

const formatError = (error) => (error instanceof Error ? error.message : String(error));
const toPosix = (value) => value.split(sep).join("/");
const roleFileName = (role) => `${role.charAt(0).toLowerCase()}${role.slice(1)}.tsx`;

const parseSource = (filePath, source) => {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
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

const collectRuntimeReexports = (sourceFile) => {
  const exports = new Map();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.isTypeOnly ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      continue;
    }

    for (const element of statement.exportClause.elements) {
      if (!element.isTypeOnly) {
        exports.set(element.name.text, statement.moduleSpecifier.text);
      }
    }
  }

  return exports;
};

const collectStarReexports = (sourceFile) =>
  sourceFile.statements
    .filter(
      (statement) =>
        ts.isExportDeclaration(statement) &&
        !statement.isTypeOnly &&
        statement.exportClause === undefined &&
        statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier),
    )
    .map((statement) => statement.moduleSpecifier.text);

const hasConcreteDeclaration = (sourceFile, role) =>
  sourceFile.statements.some((statement) => {
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
      return statement.name?.text === role && statement.body !== undefined;
    }

    if (!ts.isVariableStatement(statement)) {
      return false;
    }

    return statement.declarationList.declarations.some(
      (declaration) =>
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === role &&
        declaration.initializer !== undefined,
    );
  });

const collectImports = (sourceFile) =>
  sourceFile.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier),
    )
    .map((statement) => ({
      clause: statement.importClause,
      specifier: statement.moduleSpecifier.text,
    }));

const importsNamedSymbol = (imports, symbol) =>
  imports.some(
    ({ clause, specifier }) =>
      specifier.includes("/primitives") &&
      clause?.namedBindings !== undefined &&
      ts.isNamedImports(clause.namedBindings) &&
      clause.namedBindings.elements.some(
        (element) => (element.propertyName?.text ?? element.name.text) === symbol,
      ),
  );

const listProductionSources = async (root) => {
  const files = [];

  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listProductionSources(path)));
    } else if (/\.tsx?$/u.test(entry.name) && !ignoredSourcePattern.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
};

const checkPublicRoles = async () => {
  const errors = [];
  const publicRoles = Object.values(familyRoles).flat();

  for (const [family, roles] of Object.entries(familyRoles)) {
    const indexPath = join(componentsRoot, family, "index.ts");
    const runtimeExports = collectRuntimeReexports(await readSource(indexPath));

    for (const role of roles) {
      const expectedModule = `./${roleFileName(role).replace(/\.tsx$/u, "")}`;
      const actualModule = runtimeExports.get(role);
      if (actualModule !== expectedModule) {
        errors.push(
          `${toPosix(relative(designRoot, indexPath))}: ${role}은 ${expectedModule}의 concrete export여야 합니다; 발견: ${actualModule ?? "누락"}`,
        );
        continue;
      }

      const rolePath = join(componentsRoot, family, roleFileName(role));
      if (!hasConcreteDeclaration(await readSource(rolePath), role)) {
        errors.push(`${toPosix(relative(designRoot, rolePath))}: ${role} concrete 선언이 없습니다`);
      }
    }

    const unexpected = [...runtimeExports.keys()].filter((role) => !roles.includes(role));
    if (unexpected.length > 0) {
      errors.push(
        `${toPosix(relative(designRoot, indexPath))}: 승인되지 않은 public runtime role: ${unexpected.join(", ")}`,
      );
    }
  }

  const componentAggregatePath = join(componentsRoot, "index.ts");
  const componentFamilies = collectStarReexports(await readSource(componentAggregatePath));
  for (const family of Object.keys(familyRoles)) {
    if (componentFamilies.filter((specifier) => specifier === `./${family}`).length !== 1) {
      errors.push(
        `src/ui/components/index.ts: ./${family} family를 정확히 한 번 재노출해야 합니다`,
      );
    }
  }

  const uiAggregatePath = join(designRoot, "src/ui/index.ts");
  const uiExports = collectStarReexports(await readSource(uiAggregatePath));
  if (!uiExports.includes("./components/index.js")) {
    errors.push("src/ui/index.ts: project-owned component aggregate를 재노출해야 합니다");
  }

  for (const privateRole of privateRoles) {
    if (publicRoles.includes(privateRole)) {
      errors.push(
        `${privateRole}은 family-local role이며 public role inventory에 포함할 수 없습니다`,
      );
    }
    for (const family of Object.keys(familyRoles)) {
      const exports = collectRuntimeReexports(
        await readSource(join(componentsRoot, family, "index.ts")),
      );
      if (exports.has(privateRole)) {
        errors.push(`${privateRole}은 ${family} public entry에서 export할 수 없습니다`);
      }
    }
  }

  if (publicRoles.length !== 21 || new Set(publicRoles).size !== 21) {
    errors.push(
      `HDJG-26 public role inventory는 정확히 21개여야 합니다; 발견: ${publicRoles.length}`,
    );
  }

  return errors;
};

const checkBoundariesAndPrimitiveConsumers = async () => {
  const errors = [];

  for (const filePath of await listProductionSources(componentsRoot)) {
    const sourceFile = await readSource(filePath);
    for (const { specifier } of collectImports(sourceFile)) {
      const resolvedSpecifier = specifier.startsWith(".")
        ? toPosix(resolve(dirname(filePath), specifier))
        : specifier;
      if (
        forbiddenSpecifierPattern.test(toPosix(specifier)) ||
        forbiddenSpecifierPattern.test(resolvedSpecifier)
      ) {
        errors.push(
          `${toPosix(relative(designRoot, filePath))}: forbidden component-layer import ${specifier}`,
        );
      }
    }
  }

  for (const [role, primitive] of Object.entries(primitiveConsumers)) {
    const family = Object.entries(familyRoles).find(([, roles]) => roles.includes(role))?.[0];
    const rolePath = join(componentsRoot, family, roleFileName(role));
    const imports = collectImports(await readSource(rolePath));
    if (!importsNamedSymbol(imports, primitive)) {
      errors.push(
        `${toPosix(relative(designRoot, rolePath))}: required project-owned ${primitive} consumer contract가 없습니다`,
      );
    }
  }

  return errors;
};

try {
  const errors = [...(await checkPublicRoles()), ...(await checkBoundariesAndPrimitiveConsumers())];
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  process.stdout.write(
    "Component architecture가 유효합니다 (21 public roles, 1 family-local role, 9 Primitive consumers).\n",
  );
} catch (error) {
  process.stderr.write(`${formatError(error)}\n`);
  process.exitCode = 1;
}
