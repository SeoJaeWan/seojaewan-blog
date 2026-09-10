import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrimaryPanelOperationHandle } from "../../../../../headless/index.js";
import type { TaskbarPanelsConnection } from "../../panels/connection/index.js";
import { TaskbarSearchPanel } from "./index.js";

const operationHandle = Object.freeze({}) as PrimaryPanelOperationHandle;

/** Search panel의 public connection을 관찰 가능한 callback으로 만든다. */
const createConnection = ({
  open = true,
  query = "초기 검색어",
}: {
  open?: boolean;
  query?: string;
} = {}) => {
  const onOpenChange = vi.fn();
  const updateQuery = vi.fn(() => operationHandle);

  const connection = {
    panel: "search",
    query,
    widget: {
      open,
      onOpenChange,
    },
    actions: {
      trigger: () => operationHandle,
      updateQuery,
      dismiss: () => operationHandle,
    },
    resource: {
      track: () => operationHandle,
      settle: () => operationHandle,
    },
  } satisfies TaskbarPanelsConnection["search"];

  return {
    connection,
    onOpenChange,
    updateQuery,
  };
};

afterEach(() => cleanup());

describe("TaskbarSearchPanel", () => {
  it("실제 input 하나에 query와 panel 관계를 연결하고 입력 callback을 전달한다", () => {
    const { connection, onOpenChange, updateQuery } = createConnection();

    render(
      <TaskbarSearchPanel connection={connection}>
        <p>검색 결과</p>
      </TaskbarSearchPanel>,
    );

    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    expect(screen.getAllByRole("textbox", { name: "검색" })).toHaveLength(1);
    expect(input.value).toBe("초기 검색어");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "검색" }).textContent).toContain("검색 결과");

    fireEvent.change(input, { target: { value: "바뀐 검색어" } });
    expect(updateQuery).toHaveBeenCalledWith("바뀐 검색어");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
