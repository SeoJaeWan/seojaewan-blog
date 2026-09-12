import type { ReactNode } from "react";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HeadlessRuntimeProvider,
  usePrimaryPanelController,
} from "../../../../../../headless/index.js";
import type { TaskbarPanelConnection } from "../../../panels/connection/index.js";
import { createSearchFixture } from "../../body/taskbarSearchFixture.js";
import { useTaskbarSearchOwner } from "./index.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** 실제 runtime raw revision과 UI timer를 연결하고 각 검사마다 독립 수명을 제공한다. */
const setup = async () => {
  const { runtime } = createSearchFixture();
  await runtime.search.initialize();
  vi.useFakeTimers();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <HeadlessRuntimeProvider runtime={runtime}>{children}</HeadlessRuntimeProvider>
  );
  const hook = renderHook(
    ({ open }: { open: boolean }) => {
      const primary = usePrimaryPanelController();
      return useTaskbarSearchOwner({
        panel: "search",
        query: primary.viewModel.snapshot?.searchQuery ?? "",
        widget: { open },
        actions: {},
      } as TaskbarPanelConnection);
    },
    { wrapper, initialProps: { open: true } },
  );
  return {
    runtime,
    hook,
    update: async (query: string) => {
      await act(async () => {
        await runtime.primaryPanel.execute({ type: "update-query", panel: "search", query })
          .settled;
      });
    },
    advance: async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    },
  };
};

describe("Search 입력 수명", () => {
  it("raw는 그대로 보존하고 마지막 입력의 150ms 뒤에만 정규화 query를 적용한다", async () => {
    const test = await setup();
    await test.update(" React  상태 ");
    expect(test.runtime.primaryPanel.getSnapshot().snapshot?.searchQuery).toBe(" React  상태 ");
    await test.advance(149);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("");
    expect(test.runtime.search.getSnapshot().panels.search.pending).toBe(true);
    await test.advance(1);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("react 상태");
    await test.update(" 검색 ");
    await test.advance(100);
    await test.update(" 검색 문서 ");
    await test.advance(149);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("react 상태");
    await test.advance(1);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("검색 문서");
    await test.update(" \t ");
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("");
    expect(test.runtime.search.getSnapshot().panels.search.pending).toBe(false);
  });
  it("조합 중에는 확정하지 않고 compositionEnd 뒤 150ms를 기다리며 종료 timer는 폐기한다", async () => {
    const test = await setup();
    act(() => test.hook.result.current.inputProps.onCompositionStart());
    await test.update("검색");
    await test.advance(500);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("");
    act(() => test.hook.result.current.inputProps.onCompositionEnd());
    await test.advance(149);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("");
    await test.advance(1);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("검색");
    await test.update("React");
    test.hook.rerender({ open: false });
    await test.advance(500);
    expect(test.runtime.search.getSnapshot().panels.search.query).toBe("검색");
    test.hook.unmount();
  });
});
