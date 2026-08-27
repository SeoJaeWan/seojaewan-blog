import { existsSync, readdirSync,readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PRIMITIVES_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const PRIMITIVE_FAMILIES = [
  "button",
  "context-menu",
  "dialog",
  "drawer",
  "icon-button",
  "menu",
  "popover",
  "sheet",
  "tooltip",
] as const;

const REQUIRED_FILE_SUFFIXES = [
  "-ui.tsx",
  "-ui.types.ts",
  "-ui.css",
  "-ui.stories.tsx",
  "-ui.test.tsx",
  "-ui.browser.test.tsx",
] as const;

describe("UI primitive 구조 계약", () => {
  it("모든 primitive family가 동일한 *-ui 파일 구성을 사용한다", () => {
    const missingFiles = PRIMITIVE_FAMILIES.flatMap((family) => {
      const familyDirectory = join(PRIMITIVES_DIRECTORY, family);
      const requiredFiles = [
        "index.ts",
        ...REQUIRED_FILE_SUFFIXES.map((suffix) => `${family}${suffix}`),
      ];

      return requiredFiles
        .filter((file) => !existsSync(join(familyDirectory, file)))
        .map((file) => `${family}/${file}`);
    });

    expect(missingFiles).toEqual([]);
  });

  it("generic types 파일과 별도 adapter 파일을 두지 않는다", () => {
    const forbiddenFiles = PRIMITIVE_FAMILIES.flatMap((family) =>
      readdirSync(join(PRIMITIVES_DIRECTORY, family))
        .filter((file) => file === "types.ts" || file.endsWith("-adapter.tsx"))
        .map((file) => `${family}/${file}`),
    );

    expect(forbiddenFiles).toEqual([]);
  });

  it("모든 공개 type module에서 Base UI 타입을 노출하지 않는다", () => {
    const vendorTypeLeaks = PRIMITIVE_FAMILIES.filter((family) => {
      const typesFile = join(PRIMITIVES_DIRECTORY, family, `${family}-ui.types.ts`);

      return readFileSync(typesFile, "utf8").includes("@base-ui/react");
    });

    expect(vendorTypeLeaks).toEqual([]);
  });
});
