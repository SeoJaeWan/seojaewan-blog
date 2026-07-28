import { describe, expect, it } from "vitest";

import { resolveWindowItemContextEntries } from ".";

describe("resolveWindowItemContextEntries", () => {
  it("WindowItem action을 UI 순서와 visual이 결합된 범용 action entry로 변환한다", () => {
    const entries = resolveWindowItemContextEntries([
      { id: "pinToTaskbar" },
      { id: "moveLeft" },
      { id: "openLocation" },
    ]);

    expect(entries.map((entry) => entry.type)).toEqual(["action", "action", "action"]);
    expect(
      entries.flatMap((entry) =>
        entry.type === "action"
          ? [
              {
                id: entry.id,
                label: entry.label,
                restoreFocus: entry.restoreFocus,
                type: entry.type,
              },
            ]
          : [],
      ),
    ).toEqual([
      {
        id: "moveLeft",
        label: "왼쪽으로 이동",
        restoreFocus: true,
        type: "action",
      },
      {
        id: "openLocation",
        label: "파일 위치 열기",
        restoreFocus: false,
        type: "action",
      },
      {
        id: "pinToTaskbar",
        label: "작업 표시줄에 고정",
        restoreFocus: true,
        type: "action",
      },
    ]);
    expect(entries.every((entry) => entry.type !== "action" || entry.icon !== null)).toBe(true);
  });
});
