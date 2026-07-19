import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTaskbarPins } from "./index";

describe("useTaskbarPins", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useTaskbarPins())).toThrow(
      "useTaskbarPins는 Windows 안에서 사용해야 합니다.",
    );
  });
});
