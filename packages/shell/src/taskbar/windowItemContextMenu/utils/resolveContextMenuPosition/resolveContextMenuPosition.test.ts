import { describe, expect, it } from "vitest";

import { resolveContextMenuPosition } from ".";

const baseOptions = {
  anchorX: 100,
  anchorY: 100,
  menuHeight: 160,
  menuWidth: 200,
  viewportHeight: 600,
  viewportWidth: 800,
};

describe("resolveContextMenuPosition", () => {
  it("아래와 오른쪽 공간이 충분하면 커서의 left와 top에 메뉴를 배치한다", () => {
    expect(resolveContextMenuPosition(baseOptions)).toEqual({
      left: 100,
      placement: "bottom",
      top: 100,
    });
  });

  it("아래 공간이 부족하면 커서 위에 메뉴를 배치한다", () => {
    expect(
      resolveContextMenuPosition({
        ...baseOptions,
        anchorY: 590,
      }),
    ).toEqual({
      bottom: 10,
      left: 100,
      placement: "top",
    });
  });

  it("오른쪽 공간이 부족하면 커서의 right 기준으로 메뉴를 배치한다", () => {
    expect(
      resolveContextMenuPosition({
        ...baseOptions,
        anchorX: 790,
      }),
    ).toEqual({
      placement: "bottom",
      right: 10,
      top: 100,
    });
  });

  it("커서가 viewport 경계에 있어도 지정된 최소 여백 안으로 좌표를 보정한다", () => {
    expect(
      resolveContextMenuPosition({
        ...baseOptions,
        anchorX: 800,
        anchorY: 600,
      }),
    ).toEqual({
      bottom: 8,
      placement: "top",
      right: 8,
    });
  });
});
