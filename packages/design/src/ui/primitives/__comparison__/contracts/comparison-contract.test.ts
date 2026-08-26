import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PRIMITIVE_COMPARISON_SCENARIOS } from "../fixtures";
import { PRIMITIVE_CAPABILITY_ROWS } from "./capability-contract";

const COMPARISON_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN_DIRECTORY = join(COMPARISON_DIRECTORY, "../../../..");
const REPOSITORY_DIRECTORY = join(DESIGN_DIRECTORY, "../..");
const PINNED_DEPENDENCIES = {
  "@base-ui/react": "1.7.0",
  "@radix-ui/react-context-menu": "2.3.7",
  "@radix-ui/react-dialog": "1.1.23",
  "@radix-ui/react-slot": "1.3.3",
} as const;

const readTypescriptSources = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return readTypescriptSources(path);
    }

    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
      ? [readFileSync(path, "utf8")]
      : [];
  });

describe("Primitive 비교 계약", () => {
  it("비교 결과를 재현할 수 있도록 manifest와 lockfile에 후보 버전을 정확히 고정한다", () => {
    const manifest = JSON.parse(readFileSync(join(DESIGN_DIRECTORY, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const lockfile = readFileSync(join(REPOSITORY_DIRECTORY, "pnpm-lock.yaml"), "utf8");

    expect(manifest.dependencies).toMatchObject(PINNED_DEPENDENCIES);

    for (const [dependency, version] of Object.entries(PINNED_DEPENDENCIES)) {
      expect(lockfile).toMatch(
        new RegExp(
          `'${dependency.replaceAll("/", "\\/")}':\\n\\s+specifier: ${version.replaceAll(".", "\\.")}`,
        ),
      );
    }
  });

  it("두 후보가 같은 fixture identifier와 interaction 순서를 사용하도록 시나리오를 하나의 원천으로 제공한다", () => {
    const scenarioIds = PRIMITIVE_COMPARISON_SCENARIOS.map(({ id }) => id);

    expect(new Set(scenarioIds).size).toBe(scenarioIds.length);
    expect(scenarioIds).toEqual([
      "button-activation",
      "context-menu-replacement",
      "drawer-controlled-exit",
    ]);
  });

  it("gesture, snap point와 virtual keyboard를 기능 hard gate와 분리한다", () => {
    const capabilityOnly = PRIMITIVE_CAPABILITY_ROWS.filter(
      ({ requirement }) => requirement === "capability-only",
    ).map(({ capability }) => capability);

    expect(capabilityOnly).toEqual([
      "drawer-gesture",
      "drawer-snap-points",
      "drawer-virtual-keyboard",
    ]);
  });

  it("neutral contract와 fixture가 vendor 이름, raw event, DOM selector, data attribute, CSS 변수에 의존하지 않는다", () => {
    const source = readTypescriptSources(COMPARISON_DIRECTORY).join("\n");

    expect(source).not.toMatch(/@base-ui|@radix-ui/);
    expect(source).not.toMatch(/\b(?:Event|SyntheticEvent|PointerEvent|KeyboardEvent)\b/);
    expect(source).not.toMatch(/querySelector|closest\(|matches\(/);
    expect(source).not.toMatch(/data-[a-z]|--[a-z]/);
  });
});
