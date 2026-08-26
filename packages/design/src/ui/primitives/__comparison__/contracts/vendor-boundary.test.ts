import { ESLint } from "eslint";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DESIGN_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

const lintVendorImport = async (filePath: string) => {
  const eslint = new ESLint({ cwd: DESIGN_DIRECTORY });
  const [result] = await eslint.lintText('import "@base-ui/react";\n', { filePath });

  return result.messages.map(({ message }) => message);
};

describe("Primitive vendor import 경계", () => {
  it("src/ui/primitives 밖의 vendor import를 lint 오류로 거부한다", async () => {
    const messages = await lintVendorImport(
      join(DESIGN_DIRECTORY, "src/ui/components/vendor-boundary-negative.js"),
    );

    expect(messages.join("\n")).toContain(
      "Primitive vendors may only be imported from src/ui/primitives.",
    );
  });

  it("교체 가능한 adapter를 만들 수 있도록 src/ui/primitives 내부의 vendor import는 허용한다", async () => {
    const messages = await lintVendorImport(
      join(DESIGN_DIRECTORY, "src/ui/primitives/vendor-boundary-positive.js"),
    );

    expect(messages).toEqual([]);
  });
});
