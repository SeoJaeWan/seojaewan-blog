import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const defaultPrimitivesRoot = resolve(dirname(scriptPath), "../src/ui/primitives");
const pascalCaseUISymbolPattern = /^[A-Z][A-Za-z0-9]*UI$/;
const requiredActiveFamilies = new Set([
  "button",
  "collapsible",
  "combobox",
  "contextMenu",
  "iconButton",
  "input",
  "popover",
  "select",
]);

const formatError = (error) => (error instanceof Error ? error.message : String(error));

const parseSourceFile = (filePath, source) => {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  if (sourceFile.parseDiagnostics.length > 0) {
    const diagnostics = sourceFile.parseDiagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("; ");
    throw new Error(`${filePath}: TypeScript 구문을 해석할 수 없습니다: ${diagnostics}`);
  }

  return sourceFile;
};

const hasModifier = (node, kind) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);

const hasExportModifier = (node) => hasModifier(node, ts.SyntaxKind.ExportKeyword);

const collectBindingNames = (name, names) => {
  if (ts.isIdentifier(name)) {
    names.push(name.text);
    return;
  }

  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) {
      collectBindingNames(element.name, names);
    }
  }
};

const collectRuntimeExports = (sourceFile) => {
  const names = [];
  const errors = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) {
        continue;
      }

      if (statement.exportClause === undefined) {
        errors.push("runtime export *는 family runtime symbol 수를 숨기므로 허용되지 않습니다");
        continue;
      }

      if (ts.isNamespaceExport(statement.exportClause)) {
        names.push(statement.exportClause.name.text);
        continue;
      }

      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) {
          names.push(element.name.text);
        }
      }
      continue;
    }

    if (ts.isExportAssignment(statement)) {
      names.push("default");
      continue;
    }

    if (!hasExportModifier(statement)) {
      continue;
    }

    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        collectBindingNames(declaration.name, names);
      }
      continue;
    }

    if (
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      names.push(
        hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
          ? "default"
          : (statement.name?.text ?? "default"),
      );
      continue;
    }

    errors.push(`지원하지 않는 runtime export 구문입니다: ${ts.SyntaxKind[statement.kind]}`);
  }

  return { errors, names };
};

const toFamilyUISymbol = (familyName) => {
  const pascalCaseFamily = familyName
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

  return `${pascalCaseFamily}UI`;
};

const readIndex = async (filePath) => {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`${filePath}: index.ts를 읽을 수 없습니다: ${formatError(error)}`);
  }
};

const discoverFamilies = async (primitivesRoot) => {
  const entries = await readdir(primitivesRoot, { withFileTypes: true });
  const familyNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (familyNames.length === 0) {
    throw new Error(`${primitivesRoot}: primitive family directory를 찾지 못했습니다`);
  }

  return familyNames;
};

const checkFamilyIndexes = async (primitivesRoot, familyNames) => {
  const errors = [];

  for (const familyName of familyNames) {
    const indexPath = join(primitivesRoot, familyName, "index.ts");
    const sourceFile = parseSourceFile(indexPath, await readIndex(indexPath));
    const runtimeExports = collectRuntimeExports(sourceFile);
    const expectedSymbol = toFamilyUISymbol(familyName);

    errors.push(...runtimeExports.errors.map((error) => `${indexPath}: ${error}`));

    if (!pascalCaseUISymbolPattern.test(expectedSymbol)) {
      errors.push(`${indexPath}: ${familyName}에서 PascalCase family UI symbol을 만들 수 없습니다`);
      continue;
    }

    if (runtimeExports.names.length !== 1) {
      errors.push(
        `${indexPath}: runtime export는 ${expectedSymbol} 하나여야 합니다; ` +
          `발견: [${runtimeExports.names.join(", ")}]`,
      );
      continue;
    }

    if (runtimeExports.names[0] !== expectedSymbol) {
      errors.push(
        `${indexPath}: runtime export는 family 이름에서 파생한 ${expectedSymbol}이어야 합니다; ` +
          `발견: ${runtimeExports.names[0]}`,
      );
    }
  }

  return errors;
};

const checkAggregateIndex = async (primitivesRoot, familyNames) => {
  const aggregatePath = join(primitivesRoot, "index.ts");
  const sourceFile = parseSourceFile(aggregatePath, await readIndex(aggregatePath));
  const familySet = new Set(familyNames);
  const reexports = new Map(familyNames.map((familyName) => [familyName, []]));

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }

    const specifier = statement.moduleSpecifier.text;
    const match = /^\.\/([^/]+)$/u.exec(specifier);
    const familyName = match?.[1];

    if (familyName !== undefined && familySet.has(familyName)) {
      reexports.get(familyName).push(statement);
    }
  }

  const errors = [];

  for (const familyName of familyNames) {
    const statements = reexports.get(familyName);

    if (statements.length !== 1) {
      errors.push(
        `${aggregatePath}: ./${familyName} family entry를 정확히 한 번 재노출해야 합니다; ` +
          `발견: ${statements.length}`,
      );
      continue;
    }

    const [statement] = statements;
    if (statement.isTypeOnly || statement.exportClause !== undefined) {
      errors.push(
        `${aggregatePath}: ./${familyName} family entry는 runtime export *로 재노출해야 합니다`,
      );
    }
  }

  return errors;
};

const checkPrimitivePublicApi = async (primitivesRoot, { requireActiveFamilies = false } = {}) => {
  const familyNames = await discoverFamilies(primitivesRoot);
  const errors = [
    ...(await checkFamilyIndexes(primitivesRoot, familyNames)),
    ...(await checkAggregateIndex(primitivesRoot, familyNames)),
  ];

  if (requireActiveFamilies) {
    for (const familyName of requiredActiveFamilies) {
      if (!familyNames.includes(familyName)) {
        errors.push(`${primitivesRoot}: active Primitive family ${familyName}이 없습니다`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return familyNames;
};

const makeSyntheticFamilyName = (purpose) => `fixture${purpose}${randomUUID().replaceAll("-", "")}`;

const writeFixture = async (fixtureRoot, { aggregate, extraRuntimeExport, purpose }) => {
  const familyName = makeSyntheticFamilyName(purpose);
  const familySymbol = toFamilyUISymbol(familyName);
  const familyRoot = join(fixtureRoot, familyName);
  const runtimeExports = [familySymbol, ...(extraRuntimeExport ? [`${familySymbol}Part`] : [])];

  await mkdir(familyRoot, { recursive: true });
  await writeFile(
    join(familyRoot, "index.ts"),
    `export { ${runtimeExports.join(", ")} } from "./${familyName}UI";\n` +
      `export type { ${familySymbol}Props } from "./${familyName}UI.types";\n`,
    "utf8",
  );
  await writeFile(
    join(fixtureRoot, "index.ts"),
    aggregate ? `export * from "./${familyName}";\n` : "export {};\n",
    "utf8",
  );
};

const runFixtureProbe = (fixtureRoot) =>
  spawnSync(process.execPath, [scriptPath, "--primitives-root", fixtureRoot], {
    encoding: "utf8",
  });

const describeProbeFailure = (probe) =>
  [probe.stdout, probe.stderr, probe.error === undefined ? "" : formatError(probe.error)]
    .filter(Boolean)
    .join("\n");

const verifyGeneratedFixtures = async () => {
  const fixtureParent = await mkdtemp(join(dirname(scriptPath), ".primitive-public-api-fixture-"));

  try {
    const positiveRoot = join(fixtureParent, "positive");
    await mkdir(positiveRoot);
    await writeFixture(positiveRoot, {
      aggregate: true,
      extraRuntimeExport: false,
      purpose: "Discovery",
    });
    const positiveProbe = runFixtureProbe(positiveRoot);
    if (positiveProbe.status !== 0) {
      throw new Error(
        `synthetic family 자동 발견 fixture가 실패했습니다:\n${describeProbeFailure(positiveProbe)}`,
      );
    }

    const namedPartRoot = join(fixtureParent, "named-part");
    await mkdir(namedPartRoot);
    await writeFixture(namedPartRoot, {
      aggregate: true,
      extraRuntimeExport: true,
      purpose: "NamedPart",
    });
    const namedPartProbe = runFixtureProbe(namedPartRoot);
    if (namedPartProbe.status === 0 || !namedPartProbe.stderr.includes("runtime export는")) {
      throw new Error(
        `named runtime part fixture가 non-zero로 거부되지 않았습니다:\n${describeProbeFailure(namedPartProbe)}`,
      );
    }

    const missingAggregateRoot = join(fixtureParent, "missing-aggregate");
    await mkdir(missingAggregateRoot);
    await writeFixture(missingAggregateRoot, {
      aggregate: false,
      extraRuntimeExport: false,
      purpose: "MissingAggregate",
    });
    const missingAggregateProbe = runFixtureProbe(missingAggregateRoot);
    if (
      missingAggregateProbe.status === 0 ||
      !missingAggregateProbe.stderr.includes("정확히 한 번 재노출")
    ) {
      throw new Error(
        `aggregate 누락 fixture가 non-zero로 거부되지 않았습니다:\n${describeProbeFailure(missingAggregateProbe)}`,
      );
    }
  } finally {
    await rm(fixtureParent, { force: true, recursive: true });
  }
};

const parseArguments = (arguments_) => {
  let primitivesRoot = defaultPrimitivesRoot;
  let verifyFixtures = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--verify-fixtures") {
      verifyFixtures = true;
      continue;
    }

    if (argument === "--primitives-root") {
      const root = arguments_[index + 1];
      if (root === undefined) {
        throw new Error("--primitives-root에는 경로가 필요합니다");
      }
      primitivesRoot = resolve(root);
      index += 1;
      continue;
    }

    throw new Error(`알 수 없는 인자입니다: ${argument}`);
  }

  return { primitivesRoot, verifyFixtures };
};

try {
  const { primitivesRoot, verifyFixtures } = parseArguments(process.argv.slice(2));
  const familyNames = await checkPrimitivePublicApi(primitivesRoot, {
    requireActiveFamilies: primitivesRoot === defaultPrimitivesRoot,
  });

  if (verifyFixtures) {
    await verifyGeneratedFixtures();
  }

  process.stdout.write(
    `Primitive public API architecture가 유효합니다 (discovered: ${familyNames.join(", ")}${
      verifyFixtures ? ", generated fixtures 포함" : ""
    }).\n`,
  );
} catch (error) {
  process.stderr.write(`${formatError(error)}\n`);
  process.exitCode = 1;
}
