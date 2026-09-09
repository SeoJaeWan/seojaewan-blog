import { useState } from "react";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type PrimaryPanelOperationHandle,
  type WindowState,
} from "../../../../headless/index.js";
import type { TaskbarPanelConnection } from "../panels/connection/index.js";
import { useTaskbarPanelsConnection } from "../panels/connection/index.js";
import { TaskbarStart } from "./taskbarStart.js";

const operationHandle = Object.freeze({}) as PrimaryPanelOperationHandle;

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

/** production Provider와 실제 Start connection을 함께 렌더링한다. */
const RuntimeStartFixture = () => {
  const start = useTaskbarPanelsConnection().start;
  return <TaskbarStart connection={start} />;
};

/** 실제 widget callback과 controlled query를 연결하는 Start 전용 test connection을 만든다. */
const StartFixture = ({
  initialOpen = false,
  onQueryChange = () => undefined,
}: {
  initialOpen?: boolean;
  onQueryChange?: (query: string) => void;
}) => {
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState("");

  const connection = {
    panel: "start",
    query,
    widget: {
      open,
      onOpenChange: (nextOpen) => setOpen(nextOpen),
      onTransitionComplete: (completedOpen) => {
        if (!completedOpen) setQuery("");
      },
    },
    actions: {
      trigger: () => {
        setOpen((current) => !current);
        return operationHandle;
      },
      updateQuery: (nextQuery) => {
        setQuery(nextQuery);
        onQueryChange(nextQuery);
        return operationHandle;
      },
      dismiss: () => operationHandle,
    },
  } satisfies TaskbarPanelConnection;

  return <TaskbarStart connection={connection}>후속 Start 본문</TaskbarStart>;
};

afterEach(() => cleanup());

describe("TaskbarStart", () => {
  it("실제 connection으로 leaf button의 toggle과 selected·ARIA 관계를 연결한다", async () => {
    render(
      <HeadlessRuntimeProvider runtime={createRuntime()}>
        <RuntimeStartFixture />
      </HeadlessRuntimeProvider>,
    );
    const button = screen.getByRole("button", { name: "시작" });

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.focus();
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("dialog", { name: "시작" })).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "앱 및 문서 검색" });
    expect(input).not.toBeNull();
    expect(document.activeElement).not.toBe(input);
    expect(document.activeElement).toBe(button);
  });

  it("한글 composition과 공백·삭제를 Start query에 그대로 전달한다", () => {
    const changed = vi.fn();
    render(<StartFixture onQueryChange={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "시작" }));
    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "앱 및 문서 검색",
    });

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "ㅎ" } });
    fireEvent.change(input, { target: { value: "한" } });
    fireEvent.compositionEnd(input, { data: "한" });
    fireEvent.change(input, { target: { value: "한 글  " } });
    expect(input.value).toBe("한 글  ");
    expect(changed).toHaveBeenLastCalledWith("한 글  ");

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(changed).toHaveBeenLastCalledWith("");
  });
});
