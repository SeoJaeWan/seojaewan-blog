import { describe, expect, it, vi } from "vitest";

import { isResourceId } from "../../resources/index.js";
import { IdGenerator } from "./index.js";

describe("IdGenerator.generateId", () => {
  it("외부 설정 없이 runtime에서 유효한 ResourceId를 발급한다", () => {
    expect(isResourceId(IdGenerator.generateId())).toBe(true);
  });

  it("UUID 발급기가 없으면 명시적인 오류를 던진다", () => {
    vi.stubGlobal("crypto", {});
    try {
      expect(() => IdGenerator.generateId()).toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
