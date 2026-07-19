import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWindowsPins } from "./index";

describe("useWindowsPins", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowsPins())).toThrow(
      "useWindowsPins는 Windows 안에서 사용해야 합니다.",
    );
  });
});
