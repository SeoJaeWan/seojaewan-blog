import { useMemo, useState } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  PrimaryPanelOperationHandle,
  StartControllerActions,
  StartScreenAction,
  StartScreenControllerActions,
  StartScreenOperationResult,
  StartScreenSnapshot,
} from "../../../../../headless/index.js";
import { createResourceRef } from "../../../../../headless/index.js";
import type { TaskbarStartConnection } from "../../panels/connection/index.js";
import { TaskbarStart } from "./index.js";

const operationHandle = Object.freeze({}) as PrimaryPanelOperationHandle;
const content = createResourceRef("content", "20000000-0000-4000-8000-000000000001");

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
  const [startScreen, setStartScreen] = useState<StartScreenSnapshot>({
    view: "pinned",
    indexOpen: false,
  });
  const screenActions = useMemo(
    () =>
      ({
        execute: (action: StartScreenAction) => {
          setStartScreen((current) => {
            if (action.type === "set-view")
              return { view: action.view, indexOpen: action.view === "pinned" ? false : current.indexOpen };
            if (action.type === "set-index-open")
              return { ...current, indexOpen: action.open && current.view === "all" };
            return { view: "pinned", indexOpen: false };
          });
          return {} as StartScreenOperationResult;
        },
      }) satisfies StartScreenControllerActions,
    [],
  );

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
    ready: true,
    screen: {
      snapshot: startScreen,
      actions: screenActions,
    },
    pins: {
      items: [{ resource: content, label: "Alpha", reorderActions: [] }],
      actions: {} as StartControllerActions,
    },
    all: { groups: [{ key: "A", items: [{ resource: content, label: "Alpha" }] }] },
    resource: {
      open: () =>
        Promise.resolve({ status: "ignored", reason: "request-not-tracked" } as const),
    },
  } satisfies TaskbarStartConnection;

  return (
    <TaskbarStart
      connection={connection}
      renderSearchBody={(value) => <p>Search 경계: {value}</p>}
    />
  );
};

afterEach(() => cleanup());

describe("TaskbarStart", () => {
  it("connection의 open 상태를 leaf button과 dialog 관계에 반영한다", () => {
    render(<StartFixture initialOpen />);
    const button = screen.getByRole("button", { name: "시작" });

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("dialog", { name: "시작" })).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "앱 및 문서 검색" });
    expect(input.classList.contains("taskbar-search")).toBe(true);
    expect(input.parentElement?.querySelector(".taskbar-search__icon")).not.toBeNull();
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

  it("query가 browse body만 Search 경계로 교체하고 삭제하면 현재 browse view를 복원한다", () => {
    render(<StartFixture initialOpen />);
    expect(screen.getByRole("heading", { name: "고정됨" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "모두" }));
    expect(screen.getByRole("heading", { name: "모두" })).not.toBeNull();

    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "앱 및 문서 검색",
    });
    fireEvent.change(input, { target: { value: "Alpha" } });
    expect(screen.queryByRole("heading", { name: "모두" })).toBeNull();
    expect(screen.getByText("Search 경계: Alpha")).not.toBeNull();
    expect(screen.getByRole("dialog", { name: "시작" })).not.toBeNull();

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("heading", { name: "모두" })).not.toBeNull();
    expect(screen.queryByText("Search 경계: Alpha")).toBeNull();
  });
});
