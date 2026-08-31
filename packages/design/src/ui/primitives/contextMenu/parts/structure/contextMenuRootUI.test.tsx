import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuItemUI } from "../items/contextMenuItemUI";
import { ContextMenuContentUI } from "./contextMenuContentUI";
import { ContextMenuRootUI } from "./contextMenuRootUI";
import { ContextMenuTriggerUI } from "./contextMenuTriggerUI";

afterEach(cleanupUITest);

const RootFixture = (props: Partial<Parameters<typeof ContextMenuRootUI>[0]>) => (
  <ContextMenuRootUI {...props}>
    <ContextMenuTriggerUI>문서</ContextMenuTriggerUI>
    <ContextMenuContentUI aria-label="문서 메뉴">
      <ContextMenuItemUI>열기</ContextMenuItemUI>
    </ContextMenuContentUI>
  </ContextMenuRootUI>
);

describe("ContextMenuRootUI", () => {
  it("호출로 연 상태와 프로젝트 변경 callback을 제공한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootFixture onOpenChange={onOpenChange} />);

    fireEvent.contextMenu(screen.getByText("문서"), { clientX: 12, clientY: 16 });
    expect(await screen.findByRole("menu", { name: "문서 메뉴" })).toBeTruthy();
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });
  });

  it("disabled 상태에서는 문맥 호출에도 열리지 않는다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootFixture disabled onOpenChange={onOpenChange} />);

    fireEvent.contextMenu(screen.getByText("문서"));
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("controlled 상태에서는 요청을 보고하고 외부 open 값을 유지한다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<RootFixture onOpenChange={onOpenChange} open={false} />);

    fireEvent.contextMenu(screen.getByText("문서"));
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
  });
});
