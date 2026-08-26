import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

type TokenLayer = "reference" | "semantic" | "component" | "theme";

type TokenSource = {
  css: string;
  layer: TokenLayer;
  path: string;
};

type TokenDefinition = {
  layer: TokenLayer;
  name: string;
  path: string;
  value: string;
};

const TOKENS_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const TEMPORARY_DIRECTORIES: string[] = [];
const TOKEN_DECLARATION_PATTERN = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
const TOKEN_REFERENCE_PATTERN = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
const REFERENCE_NAME_PATTERN =
  /^--wd-reference-(color|spacing|radius|typography|shadow|duration|easing)-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_NAME_PATTERN =
  /^--wd-(?:color-(?:surface|text|border|accent|danger|focus)-[a-z0-9]+(?:-[a-z0-9]+)*|font-family-[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const COMPONENT_NAME_PATTERN =
  /^--wd-(?:window-frame|taskbar|window-panel)-[a-z0-9]+-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMPONENT_PREFIX_PATTERN = /^--wd-(?:window-frame|taskbar|window-panel)-/;

const readCss = (path: string) => readFileSync(path, "utf8");

const listFiles = (directory: string) =>
  readdirSync(join(TOKENS_DIRECTORY, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

const readLayerSources = (layer: TokenLayer): TokenSource[] =>
  listFiles(layer)
    .filter((fileName) => fileName.endsWith(".css") && fileName !== "index.css")
    .map((fileName) => ({
      css: readCss(join(TOKENS_DIRECTORY, layer, fileName)),
      layer,
      path: `${layer}/${fileName}`,
    }));

const extractDefinitions = (source: TokenSource): TokenDefinition[] =>
  Array.from(source.css.matchAll(TOKEN_DECLARATION_PATTERN), ([, name, value]) => ({
    layer: source.layer,
    name,
    path: source.path,
    value: value.trim(),
  }));

const classifyToken = (name: string): Exclude<TokenLayer, "theme"> | "unknown" => {
  if (name.startsWith("--wd-reference-")) {
    return "reference";
  }

  if (COMPONENT_PREFIX_PATTERN.test(name)) {
    return "component";
  }

  if (name.startsWith("--wd-")) {
    return "semantic";
  }

  return "unknown";
};

const validateTokenSources = (sources: TokenSource[]) => {
  const definitions = sources.flatMap(extractDefinitions);
  const definitionsByName = new Map<string, TokenDefinition[]>();

  for (const definition of definitions) {
    const existingDefinitions = definitionsByName.get(definition.name) ?? [];
    definitionsByName.set(definition.name, [...existingDefinitions, definition]);

    expect(definition.name, `${definition.path}: --wd- namespace만 사용할 수 있다`).toMatch(
      /^--wd-/,
    );
    expect(definition.name, `${definition.path}: underscore와 BEM 문법은 허용되지 않는다`).toMatch(
      /^--[a-z0-9]+(?:-[a-z0-9]+)*$/,
    );

    const expectedPattern = {
      component: COMPONENT_NAME_PATTERN,
      reference: REFERENCE_NAME_PATTERN,
      semantic: SEMANTIC_NAME_PATTERN,
      theme: /^$/,
    }[definition.layer];

    expect(
      definition.name,
      `${definition.path}: ${definition.layer} token naming 계약을 따라야 한다`,
    ).toMatch(expectedPattern);

    const dependencies = Array.from(
      definition.value.matchAll(TOKEN_REFERENCE_PATTERN),
      ([, dependency]) => classifyToken(dependency),
    );
    const allowedDependencies: Record<TokenLayer, string[]> = {
      component: ["reference", "semantic"],
      reference: [],
      semantic: ["reference"],
      theme: [],
    };

    for (const dependency of dependencies) {
      expect(
        allowedDependencies[definition.layer],
        `${definition.path}: ${definition.layer}에서 ${dependency} 방향 참조는 허용되지 않는다`,
      ).toContain(dependency);
    }

    if (definition.layer === "semantic") {
      expect(
        definition.value,
        `${definition.path}: Semantic token은 하나의 Reference token을 직접 alias해야 한다`,
      ).toMatch(/^var\(--wd-reference-[a-z0-9-]+\)$/);
    }
  }

  for (const [name, matchingDefinitions] of definitionsByName) {
    expect(
      matchingDefinitions,
      `${name}: token은 하나의 source에서 한 번만 정의해야 한다`,
    ).toHaveLength(1);
  }

  return definitions;
};

const writeFixture = (files: Record<string, string>): TokenSource[] => {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "wd-token-contract-"));
  TEMPORARY_DIRECTORIES.push(fixtureDirectory);

  return Object.entries(files).map(([fixturePath, css]) => {
    const [layer] = fixturePath.split("/") as [TokenLayer];
    const path = join(fixtureDirectory, fixturePath.replaceAll("/", "-"));
    writeFileSync(path, css);

    return { css: readCss(path), layer, path: fixturePath };
  });
};

afterEach(() => {
  for (const directory of TEMPORARY_DIRECTORIES.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("CSS token 정적 계약", () => {
  it("Reference, Semantic, Component, Theme tree와 import 순서를 고정한다", () => {
    expect(listFiles("reference")).toEqual([
      "color.css",
      "duration.css",
      "easing.css",
      "index.css",
      "radius.css",
      "shadow.css",
      "spacing.css",
      "typography.css",
    ]);
    expect(listFiles("component")).toEqual([
      "index.css",
      "taskbar.css",
      "window-frame.css",
      "window-panel.css",
    ]);
    expect(listFiles("semantic")).toEqual(["color.css", "index.css", "typography.css"]);
    expect(listFiles("theme")).toEqual(["default.css", "index.css"]);
    expect(readCss(join(TOKENS_DIRECTORY, "reference", "index.css"))).toBe(
      [
        '@import "./color.css";',
        '@import "./spacing.css";',
        '@import "./radius.css";',
        '@import "./typography.css";',
        '@import "./shadow.css";',
        '@import "./duration.css";',
        '@import "./easing.css";',
        "",
      ].join("\n"),
    );
    expect(readCss(join(TOKENS_DIRECTORY, "semantic", "index.css"))).toBe(
      ['@import "./color.css";', '@import "./typography.css";', ""].join("\n"),
    );
    expect(readCss(join(TOKENS_DIRECTORY, "component", "index.css"))).toBe(
      [
        '@import "./window-frame.css";',
        '@import "./taskbar.css";',
        '@import "./window-panel.css";',
        "",
      ].join("\n"),
    );
    expect(readCss(join(TOKENS_DIRECTORY, "theme", "index.css"))).toBe(
      ['@import "./default.css";', ""].join("\n"),
    );
    expect(readCss(join(TOKENS_DIRECTORY, "index.css"))).toBe(
      [
        '@import "./reference/index.css";',
        '@import "./semantic/index.css";',
        '@import "./component/index.css";',
        '@import "./theme/index.css";',
        "",
      ].join("\n"),
    );
  });

  it("실제 token tree의 namespace, naming, 중복, 의존 방향을 승인한다", () => {
    const sources = (["reference", "semantic", "component", "theme"] as const).flatMap(
      readLayerSources,
    );
    const definitions = validateTokenSources(sources);
    const names = definitions.map(({ name }) => name);

    expect(names).toEqual(
      expect.arrayContaining([
        "--wd-color-surface-window",
        "--wd-color-text-primary",
        "--wd-color-border-default",
        "--wd-color-accent-default",
        "--wd-color-danger-surface",
        "--wd-color-danger-text",
        "--wd-color-focus-ring",
        "--wd-font-family-sans",
        "--wd-window-frame-root-background-color",
        "--wd-window-frame-titlebar-height",
        "--wd-taskbar-root-height",
        "--wd-window-panel-root-height",
      ]),
    );
    expect(names.some((name) => name.startsWith("--wd-window-frame-"))).toBe(true);
    expect(names.some((name) => name.startsWith("--wd-taskbar-"))).toBe(true);
    expect(names.some((name) => name.startsWith("--wd-window-panel-"))).toBe(true);
  });

  it("단일 default :root 외 Theme selector나 전환 branch를 만들지 않는다", () => {
    const themeCss = readCss(join(TOKENS_DIRECTORY, "theme", "default.css"));
    const allCss = (["reference", "semantic", "component", "theme"] as const)
      .flatMap(readLayerSources)
      .map(({ css }) => css)
      .join("\n");

    expect(themeCss.match(/:root\s*\{/g)).toHaveLength(1);
    expect(themeCss).toMatch(/color-scheme:\s*light/);
    expect(allCss).not.toMatch(
      /prefers-color-scheme|data-theme|theme-(?:dark|light)|\.(?:dark|light)\b|--wb-/,
    );
  });

  it("CSS 밖에 token value map을 두지 않는다", () => {
    const nonCssFiles = readdirSync(TOKENS_DIRECTORY, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:js|json|ts|tsx)$/.test(entry.name))
      .map((entry) => entry.name);

    expect(nonCssFiles).toEqual(["token-contract.test.ts"]);
  });

  it("정상 fixture의 하향 dependency를 승인한다", () => {
    const sources = writeFixture({
      "component/window-frame.css":
        ":root { --wd-window-frame-root-color: var(--wd-color-text-primary); }",
      "reference/color.css": ":root { --wd-reference-color-neutral-950: rgb(32 33 36); }",
      "semantic/color.css":
        ":root { --wd-color-text-primary: var(--wd-reference-color-neutral-950); }",
    });

    expect(() => validateTokenSources(sources)).not.toThrow();
  });

  it("중복 token fixture를 거부한다", () => {
    const sources = writeFixture({
      "reference/color-a.css": ":root { --wd-reference-color-neutral-0: white; }",
      "reference/color-b.css": ":root { --wd-reference-color-neutral-0: #fff; }",
    });

    expect(() => validateTokenSources(sources)).toThrow(/한 번만 정의/);
  });

  it("외부 namespace fixture를 거부한다", () => {
    const sources = writeFixture({
      "reference/color.css": ":root { --foreign-color-neutral-0: white; }",
    });

    expect(() => validateTokenSources(sources)).toThrow(/--wd- namespace/);
  });

  it("underscore와 BEM token fixture를 거부한다", () => {
    const underscoreSources = writeFixture({
      "reference/color.css": ":root { --wd-reference-color_neutral-0: white; }",
    });
    const bemSources = writeFixture({
      "component/taskbar.css": ":root { --wd-taskbar-root__height: 50px; }",
    });

    expect(() => validateTokenSources(underscoreSources)).toThrow(/underscore와 BEM/);
    expect(() => validateTokenSources(bemSources)).toThrow(/underscore와 BEM/);
  });

  it("Semantic에서 Component로 향하는 reverse reference fixture를 거부한다", () => {
    const sources = writeFixture({
      "semantic/color.css":
        ":root { --wd-color-surface-window: var(--wd-window-frame-root-background-color); }",
    });

    expect(() => validateTokenSources(sources)).toThrow(/방향 참조는 허용되지 않는다/);
  });
});
