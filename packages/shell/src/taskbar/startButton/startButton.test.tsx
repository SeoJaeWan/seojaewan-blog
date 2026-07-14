import type { WindowItem } from "@window/ui";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarPanelHost } from "../panelHost";
import { TaskbarStartButton } from "./index";

const RESULTS: WindowItem[] = [{ id: "react", title: "React" }];

afterEach(cleanup);

describe("TaskbarStartButton", () => {
  it("명시적인 panel data와 itemInteractions를 내부 panel에 연결한다", async () => {
    const onAction = vi.fn();

    render(
      <TaskbarPanelHost portalContainer={document.body}>
        <TaskbarStartButton
          itemInteractions={{ onAction }}
          results={RESULTS}
          searchInputProps={{ readOnly: true, value: "re" }}
        />
      </TaskbarPanelHost>,
    );

    fireEvent.click(screen.getByRole("button", { name: "시작" }));
    await screen.findByRole("dialog", { name: "시작" });
    fireEvent.click(screen.getByRole("button", { name: "React" }));

    expect(onAction).toHaveBeenCalledWith("open", RESULTS[0]);
  });
});
