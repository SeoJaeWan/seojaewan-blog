import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { WindowItem } from "../../../../types/windowItem";
import { TaskSearchResultView } from "./index";

const RESULTS: WindowItem[] = [
  { description: "블로그", id: "server-count", title: "서버 증설 횟수" },
  { id: "resume", title: "서재완 - 이력서" },
];

afterEach(() => {
  cleanup();
});

describe("TaskSearchResultView", () => {
  it("선택한 WindowItem의 description을 상세 제목 아래에 표시한다", () => {
    render(<TaskSearchResultView detailItemId="server-count" results={RESULTS} />);

    expect(screen.getByText("블로그").className).toContain(
      "wb-task-search-result__detail-description",
    );
  });

  it("선택한 WindowItem에 description이 없으면 설명 요소를 렌더링하지 않는다", () => {
    const { container } = render(<TaskSearchResultView detailItemId="resume" results={RESULTS} />);

    expect(container.querySelector(".wb-task-search-result__detail-description")).toBeNull();
  });
});
