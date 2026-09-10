import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type * as TypeScript from "typescript";
import type { CompilerOptions } from "typescript";
import { describe, expect, it } from "vitest";

type TypeScriptModule = typeof TypeScript;

const requiredTypeScript: unknown = createRequire(import.meta.url)("typescript");
const ts = requiredTypeScript as TypeScriptModule;
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const headlessRoot = resolve(sourceRoot, "headless");
const packageRoot = resolve(sourceRoot, "..");
const repositoryRoot = resolve(packageRoot, "../..");

/** directory 아래 production TypeScript source를 재귀적으로 수집한다. */
const collectSources = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) return collectSources(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });

/** source의 static import/export specifier를 TypeScript parser로 읽는다. */
const readImports = (path: string): readonly string[] =>
  ts
    .preProcessFile(readFileSync(path, "utf8"), true, true)
    .importedFiles.map(({ fileName }) => fileName.replaceAll("\\", "/"));

/** 실제 TypeScript resolution 결과를 반환해 문자열 경로 추측을 피한다. */
const resolveImport = (from: string, specifier: string): string | null =>
  ts.resolveModuleName(
    specifier,
    from,
    {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ESNext,
    },
    ts.sys,
  ).resolvedModule?.resolvedFileName ?? null;

/** 절대 경로가 지정 directory 내부인지 path separator 경계까지 확인한다. */
const isInside = (path: string, directory: string): boolean => {
  const pathFromRoot = relative(directory, path);
  return (
    pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`) && !pathFromRoot.startsWith(sep)
  );
};

/** model·commands·selectors element처럼 canonical pure 역할인지 판별한다. */
const isPureModule = (path: string): boolean =>
  relative(headlessRoot, path)
    .split(sep)
    .some((segment) => ["model", "commands", "selectors"].includes(segment));

/** Operation·Store·provider처럼 비동기 orchestration 역할인지 directory 의미로 판별한다. */
const isAsyncModule = (path: string): boolean =>
  relative(headlessRoot, path)
    .split(sep)
    .some(
      (segment) =>
        segment === "operations" ||
        segment === "provider" ||
        segment === "runtime" ||
        /Store$/.test(segment),
    );

describe("headless architecture", () => {
  const sources = collectSources(headlessRoot);
  const compilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ESNext,
  } satisfies CompilerOptions;
  const imports = new Map(
    sources.map((source) => [
      source,
      readImports(source).map((specifier) => ({
        specifier,
        resolved: resolveImport(source, specifier),
      })),
    ]),
  );
  const program = ts.createProgram(sources, compilerOptions);
  const checker = program.getTypeChecker();

  /** public entry에서 한 export의 실제 선언 symbol을 찾는다. */
  const getPublicExport = (entry: string, name: string): TypeScript.Symbol => {
    const sourceFile = program.getSourceFile(entry);
    const moduleSymbol =
      sourceFile === undefined ? undefined : checker.getSymbolAtLocation(sourceFile);
    const exported =
      moduleSymbol === undefined
        ? undefined
        : checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === name);
    if (exported === undefined)
      throw new Error(`${relative(sourceRoot, entry)}에 ${name} export가 없습니다`);
    return exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  };
  const semanticImports = new Map<string, Set<string>>();
  for (const source of sources) {
    const sourceFile = program.getSourceFile(source);
    const targets = new Set<string>();
    if (sourceFile !== undefined) {
      for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement)) continue;
        const bindings = statement.importClause?.namedBindings;
        if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
        for (const element of bindings.elements) {
          const symbol = checker.getSymbolAtLocation(element.name);
          const target =
            symbol?.flags && symbol.flags & ts.SymbolFlags.Alias
              ? checker.getAliasedSymbol(symbol)
              : symbol;
          for (const declaration of target?.declarations ?? []) {
            const declarationSource = declaration.getSourceFile().fileName;
            if (isInside(declarationSource, headlessRoot)) targets.add(declarationSource);
          }
        }
      }
    }
    semanticImports.set(source, targets);
  }

  it("headless import는 UI·Application·Base UI 경계로 역행하지 않는다", () => {
    const violations: string[] = [];
    for (const [source, dependencies] of imports) {
      for (const dependency of dependencies) {
        const target = dependency.resolved;
        if (dependency.specifier.startsWith("@base-ui/react")) {
          violations.push(`${relative(sourceRoot, source)} -> ${dependency.specifier}`);
        } else if (
          target !== null &&
          isInside(target, sourceRoot) &&
          !isInside(target, headlessRoot)
        ) {
          violations.push(`${relative(sourceRoot, source)} -> ${relative(sourceRoot, target)}`);
        } else if (
          target !== null &&
          isInside(target, repositoryRoot) &&
          !isInside(target, packageRoot) &&
          !target.split(sep).includes("node_modules")
        ) {
          violations.push(`${relative(sourceRoot, source)} -> ${relative(repositoryRoot, target)}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("React import는 controller와 runtime provider 요소에만 머문다", () => {
    const violations = [...imports].flatMap(([source, dependencies]) => {
      const importsReact = dependencies.some(
        ({ specifier }) => specifier === "react" || specifier.startsWith("react/"),
      );
      const parts = relative(headlessRoot, source).split(sep);
      const isReactBoundary = parts.includes("controller") || parts.includes("provider");
      return importsReact && !isReactBoundary ? [relative(sourceRoot, source)] : [];
    });
    expect(violations).toEqual([]);
  });

  it("pure module은 resolved graph에서 React·async orchestration에 의존하지 않는다", () => {
    const violations: string[] = [];

    /** 한 pure source에서 내부 import를 따라가며 금지 역할까지의 첫 경로를 찾는다. */
    const visit = (origin: string, current: string, seen: Set<string>): void => {
      const rawDependencies = imports.get(current) ?? [];
      if (
        rawDependencies.some(
          ({ specifier }) => specifier === "react" || specifier.startsWith("react/"),
        )
      ) {
        violations.push(`${relative(sourceRoot, origin)} -> react`);
      }
      for (const target of semanticImports.get(current) ?? []) {
        if (seen.has(target)) continue;
        if (isAsyncModule(target)) {
          violations.push(`${relative(sourceRoot, origin)} -> ${relative(sourceRoot, target)}`);
          continue;
        }
        seen.add(target);
        visit(origin, target, seen);
      }
    };

    for (const source of sources.filter(isPureModule)) visit(source, source, new Set([source]));
    expect(violations).toEqual([]);
  });

  it("Folder·Workspace·Window의 새 계약을 feature와 headless entry에서 공개한다", () => {
    const entries = [
      {
        path: resolve(headlessRoot, "folders/index.ts"),
        names: [
          "ExplorerNavigationTarget",
          "FileExplorerNavigationValue",
          "FolderViewSettingsStore",
          "FolderViewSettingsStorage",
          "parseFolderViewSettingsLocation",
        ],
      },
      {
        path: resolve(headlessRoot, "workspace/index.ts"),
        names: ["WorkspacePathResolution", "resolveWorkspacePath", "selectWorkspaceSidebarTree"],
      },
      {
        path: resolve(headlessRoot, "windows/index.ts"),
        names: ["ExplorerNavigationTarget", "DEFAULT_FILE_EXPLORER_SIDEBAR_WIDTH", "WindowAction"],
      },
      {
        path: resolve(headlessRoot, "index.ts"),
        names: [
          "ExplorerNavigationTarget",
          "FolderViewSettingsStore",
          "FolderViewSettingsStorage",
          "WorkspacePathResolution",
          "resolveWorkspacePath",
          "toExplorerNavigationTarget",
          "WindowAction",
        ],
      },
    ] as const;

    expect(() => {
      for (const entry of entries) {
        for (const name of entry.names) getPublicExport(entry.path, name);
      }
    }).not.toThrow();
  });

  it("새 public 계약 선언은 DOM·Base UI type을 노출하지 않는다", () => {
    const selected = [
      [resolve(headlessRoot, "folders/index.ts"), "ExplorerNavigationTarget"],
      [resolve(headlessRoot, "folders/index.ts"), "FolderViewSettingsStore"],
      [resolve(headlessRoot, "folders/index.ts"), "FolderViewSettingsStorage"],
      [resolve(headlessRoot, "workspace/index.ts"), "WorkspacePathResolution"],
      [resolve(headlessRoot, "workspace/index.ts"), "resolveWorkspacePath"],
      [resolve(headlessRoot, "windows/index.ts"), "WindowAction"],
      [resolve(headlessRoot, "index.ts"), "toExplorerNavigationTarget"],
    ] as const;
    const violations: string[] = [];

    for (const [entry, name] of selected) {
      const exported = getPublicExport(entry, name);
      for (const declaration of exported.declarations ?? []) {
        const visit = (node: TypeScript.Node): void => {
          if (ts.isTypeReferenceNode(node)) {
            const referenced = checker.getSymbolAtLocation(node.typeName);
            const target =
              referenced?.flags && referenced.flags & ts.SymbolFlags.Alias
                ? checker.getAliasedSymbol(referenced)
                : referenced;
            for (const targetDeclaration of target?.declarations ?? []) {
              const file = targetDeclaration.getSourceFile().fileName.replaceAll("\\", "/");
              if (file.endsWith("/lib.dom.d.ts") || file.includes("/node_modules/@base-ui/")) {
                violations.push(`${name} -> ${target?.name ?? node.typeName.getText()} (${file})`);
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(declaration);
      }
    }

    expect(violations).toEqual([]);
  });
});
