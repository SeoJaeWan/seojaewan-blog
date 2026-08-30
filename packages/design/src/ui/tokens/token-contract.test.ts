import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
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

const componentNamePattern = (path: string) => {
  const family = basename(path, ".css").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(`^--wd-${family}-[a-z0-9]+-[a-z0-9]+(?:-[a-z0-9]+)*$`);
};

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

const readRepositoryTokenSources = () =>
  (["reference", "semantic", "component", "theme"] as const).flatMap(readLayerSources);

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

  if (SEMANTIC_NAME_PATTERN.test(name)) {
    return "semantic";
  }

  if (name.startsWith("--wd-")) {
    return "component";
  }

  return "unknown";
};

const validateTokenSources = (sources: TokenSource[]) => {
  const definitions = sources.flatMap(extractDefinitions);
  const definitionsByName = new Map<string, TokenDefinition[]>();

  for (const definition of definitions) {
    const existingDefinitions = definitionsByName.get(definition.name) ?? [];
    definitionsByName.set(definition.name, [...existingDefinitions, definition]);

    const expectedPattern = {
      component: componentNamePattern(definition.path),
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
        `${definition.path}: ${definition.layer} 계층은 ${dependency} 계층을 참조할 수 없다`,
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

describe("CSS 토큰 계약", () => {
  it("저장소의 모든 토큰이 계층별 이름, 선언 유일성, 참조 방향 계약을 만족한다", () => {
    expect(() => validateTokenSources(readRepositoryTokenSources())).not.toThrow();
  });

  it("Windows UI의 기본 표면과 주요 Shell 컴포넌트에 필요한 공개 토큰을 제공한다", () => {
    const names = readRepositoryTokenSources()
      .flatMap(extractDefinitions)
      .map(({ name }) => name);

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
  });

  it("새 Component family는 allowlist 변경 없이 파일 namespace로 확장할 수 있다", () => {
    const sources = writeFixture({
      "component/future-widget.css":
        ":root { --wd-future-widget-root-min-height: var(--wd-reference-spacing-6); }",
    });

    expect(() => validateTokenSources(sources)).not.toThrow();
  });

  it("명시적인 테마 전환 정책을 도입하기 전에는 단일 Light Theme만 사용한다", () => {
    const themeCss = readCss(join(TOKENS_DIRECTORY, "theme", "default.css"));
    const allCss = readRepositoryTokenSources()
      .map(({ css }) => css)
      .join("\n");

    expect(themeCss.match(/:root\s*\{/g)).toHaveLength(1);
    expect(themeCss).toMatch(/color-scheme:\s*light/);
    expect(allCss).not.toMatch(
      /prefers-color-scheme|data-theme|theme-(?:dark|light)|\.(?:dark|light)\b|--wb-/,
    );
  });

  describe("토큰 계층 간 참조 정책", () => {
    it("Component는 Semantic을, Semantic은 Reference를 참조할 수 있다", () => {
      const sources = writeFixture({
        "component/window-frame.css":
          ":root { --wd-window-frame-root-color: var(--wd-color-text-primary); }",
        "reference/color.css": ":root { --wd-reference-color-neutral-950: rgb(32 33 36); }",
        "semantic/color.css":
          ":root { --wd-color-text-primary: var(--wd-reference-color-neutral-950); }",
      });

      expect(() => validateTokenSources(sources)).not.toThrow();
    });

    it("Semantic이 특정 Component 구현에 의존하지 않도록 Component 참조를 거부한다", () => {
      const sources = writeFixture({
        "semantic/color.css":
          ":root { --wd-color-surface-window: var(--wd-window-frame-root-background-color); }",
      });

      expect(() => validateTokenSources(sources)).toThrow(/component 계층을 참조할 수 없다/);
    });
  });

  it("토큰 값의 출처를 하나로 유지하기 위해 같은 이름의 중복 선언을 거부한다", () => {
    const sources = writeFixture({
      "reference/color-a.css": ":root { --wd-reference-color-neutral-0: white; }",
      "reference/color-b.css": ":root { --wd-reference-color-neutral-0: #fff; }",
    });

    expect(() => validateTokenSources(sources)).toThrow(/한 번만 정의/);
  });

  it("Component token도 소문자 component-element-property-state 이름만 허용한다", () => {
    const sources = writeFixture({
      "component/button.css": ":root { --wd-button-MinHeight: var(--wd-reference-spacing-6); }",
    });

    expect(() => validateTokenSources(sources)).toThrow(/component token naming/);
  });
});
