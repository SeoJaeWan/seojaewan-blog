import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type WindowState,
} from "../../../../headless/index.js";
import {
  type TaskbarPanelsConnection,
  useTaskbarPanelsConnection,
} from "../panels/connection/index.js";
import { TaskbarSearchPanel } from "./taskbarSearchPanel.js";

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

/** 실제 primary panel runtime을 desktop mode와 조합한다. */
const createRuntime = () => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  return createHeadlessRuntime({ adapters: { windows } });
};

type MountedSearch = ReturnType<typeof render> &
  Readonly<{
    get connection(): TaskbarPanelsConnection;
  }>;

/** 실제 Provider, connection과 Search 제품 Component를 함께 렌더링한다. */
const renderSearch = (): MountedSearch => {
  const runtime = createRuntime();
  let current: TaskbarPanelsConnection | undefined;

  /** 최신 connection을 제품 Component에 전달하고 test에서 관찰 가능하게 유지한다. */
  const SearchFixture = () => {
    const connection = useTaskbarPanelsConnection();
    current = connection;

    return (
      <>
        <button type="button">패널 밖</button>
        <TaskbarSearchPanel connection={connection.search}>
          <p>검색 본문은 후속 제품 view가 제공합니다.</p>
        </TaskbarSearchPanel>
      </>
    );
  };

  const mounted = render(
    <HeadlessRuntimeProvider runtime={runtime}>
      <SearchFixture />
    </HeadlessRuntimeProvider>,
  );

  return Object.defineProperty(mounted, "connection", {
    get: () => current!,
  }) as MountedSearch;
};

afterEach(() => cleanup());

describe("TaskbarSearchPanel", () => {
  it("실제 Taskbar input 하나로 열고 한글·공백·삭제와 재클릭 focus를 유지한다", async () => {
    const mounted = renderSearch();
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });

    expect(screen.getAllByRole("textbox", { name: "검색" })).toHaveLength(1);
    fireEvent.focus(input);
    await waitFor(() => expect(mounted.connection.search.widget.open).toBe(true));
    expect(document.activeElement).toBe(input);

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "ㅎ" } });
    fireEvent.change(input, { target: { value: "한" } });
    fireEvent.compositionEnd(input, { data: "한" });
    fireEvent.change(input, { target: { value: "한 글  검색 " } });
    await waitFor(() => expect(input.value).toBe("한 글  검색 "));
    expect(mounted.connection.search.query).toBe("한 글  검색 ");

    fireEvent.click(input);
    expect(document.activeElement).toBe(input);
    expect(mounted.connection.search.widget.open).toBe(true);

    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() => expect(input.value).toBe(""));
    expect(mounted.connection.search.query).toBe("");
  });

  it("Escape는 input을 blur하고 focus를 복원하지 않으며 close 완료 뒤 query를 비운다", async () => {
    const mounted = renderSearch();
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });

    fireEvent.focus(input);
    await waitFor(() => expect(mounted.connection.search.widget.open).toBe(true));
    fireEvent.change(input, { target: { value: "닫은 뒤 초기화" } });
    await waitFor(() => expect(mounted.connection.search.query).toBe("닫은 뒤 초기화"));

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).not.toBe(input));
    await waitFor(() => expect(mounted.connection.search.widget.open).toBe(false));
    await waitFor(() => expect(mounted.connection.search.query).toBe(""));
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe("");
  });

  it("실제 외부 pointer interaction은 닫고 panel 내부 interaction은 유지한다", async () => {
    const mounted = renderSearch();
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });

    fireEvent.focus(input);
    await waitFor(() => expect(mounted.connection.search.widget.open).toBe(true));
    const panel = await screen.findByRole("dialog", { name: "검색" });
    fireEvent.pointerDown(panel);
    fireEvent.click(panel);
    expect(mounted.connection.search.widget.open).toBe(true);

    const outside = screen.getByRole("button", { name: "패널 밖" });
    fireEvent.pointerDown(outside);
    fireEvent.click(outside);
    await waitFor(() => expect(mounted.connection.search.widget.open).toBe(false));
  });

  it("현재 Resource open 실패는 query를 보존하고 성공만 close 완료에 연결한다", async () => {
    const mounted = renderSearch();
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });

    fireEvent.focus(input);
    await waitFor(() => expect(mounted.connection.search.widget.open).toBe(true));
    await act(async () => {
      mounted.connection.search.widget.onTransitionComplete?.(true);
      await mounted.connection.search.actions.updateQuery("보존할 값").settled;
      await mounted.connection.search.resource.track("failed-request").settled;
      await mounted.connection.search.resource.settle("failed-request", "failed").settled;
    });
    expect(mounted.connection.search.widget.open).toBe(true);
    expect(input.value).toBe("보존할 값");

    await act(async () => {
      await mounted.connection.search.resource.track("successful-request").settled;
    });
    let succeeded: ReturnType<TaskbarPanelsConnection["search"]["resource"]["settle"]>;
    await act(async () => {
      succeeded = mounted.connection.search.resource.settle("successful-request", "succeeded");
      await Promise.resolve();
    });
    expect(mounted.connection.search.widget.open).toBe(false);

    await act(async () => {
      mounted.connection.search.widget.onTransitionComplete?.(false);
      await succeeded!.settled;
    });
    expect(mounted.connection.search.query).toBe("");
  });
});
