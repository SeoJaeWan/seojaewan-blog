import { useState } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrimaryPanelOperationHandle } from "../../../../../headless/index.js";
import type { TaskbarPanelConnection } from "../../panels/connection/index.js";
import { TaskbarStart } from "./index.js";

const operationHandle = Object.freeze({}) as PrimaryPanelOperationHandle;

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
  it("connection의 open 상태를 leaf button과 dialog 관계에 반영한다", () => {
    render(<StartFixture initialOpen />);
    const button = screen.getByRole("button", { name: "시작" });

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("dialog", { name: "시작" })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "앱 및 문서 검색" })).not.toBeNull();
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
