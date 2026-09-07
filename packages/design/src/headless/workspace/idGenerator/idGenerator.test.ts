import { describe, expect, it } from "vitest";

import { isResourceId } from "../../resources/index.js";
import { IdGenerator } from "./index.js";

describe("IdGenerator", () => {
  it("외부 설정 없이 runtime에서 유효한 ResourceId를 발급한다", () => {
    expect(isResourceId(IdGenerator.generateId())).toBe(true);
  });
});
