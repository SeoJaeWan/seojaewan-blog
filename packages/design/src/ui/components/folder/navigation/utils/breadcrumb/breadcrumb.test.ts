import { describe, expect, it } from "vitest";

import { createUnresolvedBreadcrumb, splitBreadcrumb } from "./index.js";

describe("folder navigation breadcrumb", () => {
  it("긴 주소의 중간 경로만 생략 목록으로 분리한다", () => {
    const items = createUnresolvedBreadcrumb("/projects/design/src");

    expect(splitBreadcrumb(items)).toEqual({
      leading: [{ location: null, name: "Desktop", path: "/" }],
      hidden: [
        { location: undefined, name: "projects", path: "/projects" },
        { location: undefined, name: "design", path: "/projects/design" },
      ],
      trailing: [{ location: undefined, name: "src", path: "/projects/design/src" }],
    });
  });

  it("해석되지 않은 상대 주소도 원문을 유지한다", () => {
    expect(createUnresolvedBreadcrumb("missing-folder")).toEqual([
      { location: undefined, name: "missing-folder", path: "missing-folder" },
    ]);
  });

  it("세 항목 이하는 생략하지 않고 입력 배열을 변경하지 않는다", () => {
    const items = createUnresolvedBreadcrumb("/projects/design");
    const before = [...items];
    expect(splitBreadcrumb(items)).toEqual({ leading: items, hidden: [], trailing: [] });
    expect(items).toEqual(before);
  });

  it("빈 절대 주소는 root breadcrumb 하나로 표시한다", () => {
    expect(createUnresolvedBreadcrumb("/")).toEqual([
      { location: undefined, name: "/", path: "/" },
    ]);
  });
});
