import { createRef } from "react";

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import * as taskbarApi from "./index";
import {
  SearchPanelUI,
  TaskbarAppListUI,
  TaskbarClockUI,
  TaskbarContextMenuUI,
  TaskbarItemUI,
  TaskbarPanelContainerUI,
  TaskbarPanelUI,
  TaskbarPreviewUI,
  TaskbarRootUI,
  TaskbarSearchUI,
  TaskbarStartButtonUI,
  TaskbarUI,
  TaskHoverPanelUI,
  WindowPanelUI,
  WindowsPanelAllViewUI,
  WindowsPanelPinnedViewUI,
  WindowsPanelUI,
} from "./index";

afterEach(() => {
  cleanupUITest();
});

describe("TaskbarStartButtonUI", () => {
  it("IconButtonUI control과 30px Windows logo 역할을 함께 제공한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(<TaskbarStartButtonUI ref={ref} selected />);
    const button = view.getByRole("button", { name: "시작" });

    expect(button.className).toContain("wd-icon-button-ui");
    expect(button.className).toContain("wd-taskbar-start-button-ui");
    expect(button.getAttribute("data-size")).toBe("lg");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector(".wd-taskbar-start-button-ui__logo")).not.toBeNull();
    expect(ref.current).toBe(button);
  });

  it("caller가 제공한 장식 icon과 native button props를 전달한다", () => {
    const onClick = vi.fn();
    const view = renderUITest(
      <TaskbarStartButtonUI data-kind="custom" icon={<span>W</span>} onClick={onClick} />,
    );
    const button = view.getByRole("button", { name: "시작" });

    button.click();

    expect(button.getAttribute("data-kind")).toBe("custom");
    expect(button.textContent).toBe("W");
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("TaskbarSearchUI", () => {
  it("InputUI의 free-text search semantic, native props와 ref를 유지한다", () => {
    const ref = createRef<HTMLInputElement>();
    const view = renderUITest(
      <TaskbarSearchUI
        aria-label="앱 검색"
        className="custom-search"
        data-query-source="taskbar"
        defaultValue="문서"
        ref={ref}
      />,
    );
    const input = view.getByRole("searchbox", { name: "앱 검색" });

    expect(input.className).toContain("wd-input-ui");
    expect(input.className).toContain("wd-taskbar-search-ui");
    expect(input.className).toContain("custom-search");
    expect(input.getAttribute("data-query-source")).toBe("taskbar");
    expect(input.getAttribute("type")).toBe("search");
    expect(input).toHaveProperty("value", "문서");
    expect(ref.current).toBe(input);
  });
});

describe("TaskbarAppListUI", () => {
  it("app item slot과 native layout props를 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    const view = renderUITest(
      <TaskbarAppListUI className="custom-list" data-layout="apps" ref={ref}>
        <span>app slot</span>
      </TaskbarAppListUI>,
    );
    const list = view.getByText("app slot").parentElement;

    expect(list?.className).toContain("wd-taskbar-app-list-ui");
    expect(list?.className).toContain("custom-list");
    expect(list?.getAttribute("data-layout")).toBe("apps");
    expect(ref.current).toBe(list);
  });
});

describe("TaskbarRootUI", () => {
  it("native nav props, slot과 ref를 50px surface root에 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <TaskbarRootUI
        aria-label="작업 표시줄"
        className="custom-root"
        data-layout="center"
        ref={ref}
      >
        <span>항목 slot</span>
      </TaskbarRootUI>,
    );
    const root = view.getByRole("navigation", { name: "작업 표시줄" });

    expect(root.tagName).toBe("NAV");
    expect(root.className).toContain("wd-taskbar-root-ui");
    expect(root.className).toContain("custom-root");
    expect(root.getAttribute("data-layout")).toBe("center");
    expect(root.textContent).toBe("항목 slot");
    expect(ref.current).toBe(root);
  });

  it("private scope의 floating layer를 document portal에 한 번만 만든다", async () => {
    const view = renderUITest(
      <TaskbarRootUI aria-label="작업 표시줄">
        <TaskbarPanelUI label="시작 메뉴" trigger={<TaskbarStartButtonUI />}>
          <WindowPanelUI>시작 내용</WindowPanelUI>
        </TaskbarPanelUI>
      </TaskbarRootUI>,
    );

    await waitFor(() =>
      expect(document.querySelectorAll("[data-taskbar-panel-layer]")).toHaveLength(1),
    );
    const layer = document.querySelector("[data-taskbar-panel-layer]");

    expect(layer).not.toBeNull();
    expect(view.container.contains(layer)).toBe(false);
  });
});

describe("TaskbarPanelUI lifecycle", () => {
  it("private widget Context와 hook을 family public API에 노출하지 않는다", () => {
    expect(taskbarApi).not.toHaveProperty("TaskbarWidgetContext");
    expect(taskbarApi).not.toHaveProperty("useTaskbarWidgetContext");
  });

  it("trigger와 panel을 연결하고 body layer portal, top placement와 initial focus를 제공한다", async () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(
      <TaskbarRootUI aria-label="작업 표시줄">
        <TaskbarPanelUI
          align="start"
          label="시작 메뉴"
          onOpenChange={onOpenChange}
          side="top"
          trigger={<TaskbarStartButtonUI />}
        >
          <WindowPanelUI>
            <TaskbarSearchUI aria-label="시작 메뉴 검색" />
          </WindowPanelUI>
        </TaskbarPanelUI>
      </TaskbarRootUI>,
    );
    const trigger = view.getByRole("button", { name: "시작" });

    fireEvent.click(trigger);

    const panel = await screen.findByRole("dialog", { name: "시작 메뉴" });
    const layer = document.querySelector("[data-taskbar-panel-layer]");
    const positioner = panel.closest(".wd-popover-ui__positioner");

    expect(layer?.contains(panel)).toBe(true);
    expect(view.container.contains(panel)).toBe(false);
    expect(panel.className).toContain("wd-taskbar-panel-ui");
    expect(panel.querySelector(".wd-taskbar-panel-container-ui")).not.toBeNull();
    expect(positioner?.getAttribute("data-side")).toBe("top");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "시작 메뉴 검색" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true, { reason: "trigger-press" });
  });

  it("Escape와 outside press로 닫고 trigger focus를 복원한다", async () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(
      <>
        <button type="button">바깥 control</button>
        <TaskbarRootUI aria-label="작업 표시줄">
          <TaskbarPanelUI
            label="시작 메뉴"
            onOpenChange={onOpenChange}
            trigger={<TaskbarStartButtonUI />}
          >
            <WindowPanelUI>
              <button type="button">panel action</button>
            </WindowPanelUI>
          </TaskbarPanelUI>
        </TaskbarRootUI>
      </>,
    );
    const trigger = view.getByRole("button", { name: "시작" });
    const outside = view.getByRole("button", { name: "바깥 control" });

    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "시작 메뉴" })).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "시작 메뉴" })).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "escape-key" });

    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "시작 메뉴" })).not.toBeNull();
    fireEvent.pointerDown(outside);
    fireEvent.click(outside);

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "시작 메뉴" })).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "outside-press" });
  });

  it("한 root에서 다음 panel을 열면 이전 panel을 제거해 surface 하나만 유지한다", async () => {
    const onFirstOpenChange = vi.fn();
    const view = renderUITest(
      <TaskbarRootUI aria-label="작업 표시줄">
        <TaskbarPanelUI
          label="첫 panel"
          onOpenChange={onFirstOpenChange}
          trigger={<TaskbarStartButtonUI icon="1" />}
        >
          <WindowPanelUI>첫 내용</WindowPanelUI>
        </TaskbarPanelUI>
        <TaskbarPanelUI label="두 번째 panel" trigger={<TaskbarStartButtonUI icon="2" />}>
          <WindowPanelUI>두 번째 내용</WindowPanelUI>
        </TaskbarPanelUI>
      </TaskbarRootUI>,
    );
    const [firstTrigger, secondTrigger] = view.getAllByRole("button", { name: "시작" });

    fireEvent.click(firstTrigger);
    expect(await screen.findByRole("dialog", { name: "첫 panel" })).not.toBeNull();
    fireEvent.click(secondTrigger);

    expect(await screen.findByRole("dialog", { name: "두 번째 panel" })).not.toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "첫 panel" })).toBeNull());
    expect(onFirstOpenChange).toHaveBeenLastCalledWith(false, { reason: "outside-press" });
  });

  it("동시에 요청된 controlled panel은 마지막 widget만 활성화하고 이전 callback에 알린다", async () => {
    const onFirstOpenChange = vi.fn();
    renderUITest(
      <TaskbarRootUI aria-label="작업 표시줄">
        <TaskbarPanelUI
          label="첫 controlled panel"
          onOpenChange={onFirstOpenChange}
          open
          trigger={<TaskbarStartButtonUI icon="1" />}
        >
          <WindowPanelUI>첫 내용</WindowPanelUI>
        </TaskbarPanelUI>
        <TaskbarPanelUI
          label="두 번째 controlled panel"
          open
          trigger={<TaskbarStartButtonUI icon="2" />}
        >
          <WindowPanelUI>두 번째 내용</WindowPanelUI>
        </TaskbarPanelUI>
      </TaskbarRootUI>,
    );

    expect(await screen.findByRole("dialog", { name: "두 번째 controlled panel" })).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "첫 controlled panel" })).toBeNull();
    expect(onFirstOpenChange).toHaveBeenLastCalledWith(false, { reason: "single-active" });
  });

  it("controlled open callback과 deterministic container presentation state를 유지한다", async () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(
      <TaskbarRootUI aria-label="작업 표시줄">
        <TaskbarPanelUI
          label="controlled panel"
          onOpenChange={onOpenChange}
          open
          trigger={<TaskbarStartButtonUI />}
        >
          <TaskbarPanelContainerUI data-testid="presentation" motion="reduced" state="entering">
            presentation
          </TaskbarPanelContainerUI>
        </TaskbarPanelUI>
      </TaskbarRootUI>,
    );

    expect(await screen.findByRole("dialog", { name: "controlled panel" })).not.toBeNull();
    const presentation = screen.getByTestId("presentation");
    expect(presentation.getAttribute("data-state")).toBe("entering");
    expect(presentation.getAttribute("data-motion")).toBe("reduced");

    fireEvent.click(view.getByRole("button", { name: "시작" }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "trigger-press" });
    expect(screen.getByRole("dialog", { name: "controlled panel" })).not.toBeNull();
  });
});

describe("TaskbarItemUI", () => {
  it("IconButtonUI 안에서 icon을 장식으로 유지하고 필수 label을 이름으로 사용한다", () => {
    const view = renderUITest(<TaskbarItemUI icon={<span>앱</span>} label="블로그 열기" />);
    const button = view.getByRole("button", { name: "블로그 열기" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("wd-icon-button-ui");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("data-state")).toBe("idle");
    expect(button.querySelector("[aria-hidden='true']")?.textContent).toBe("앱");
  });

  it("idle, running, active를 finite data state와 indicator로 표현한다", () => {
    const view = renderUITest(
      <>
        <TaskbarItemUI icon="I" label="대기" />
        <TaskbarItemUI icon="R" label="실행 중" state="running" />
        <TaskbarItemUI icon="A" label="활성" state="active" />
      </>,
    );
    const idle = view.getByRole("button", { name: "대기" });
    const running = view.getByRole("button", { name: "실행 중" });
    const active = view.getByRole("button", { name: "활성" });

    expect(idle.querySelector(".wd-taskbar-item-ui__indicator")).toBeNull();
    expect(running.querySelector(".wd-taskbar-item-ui__indicator")).not.toBeNull();
    expect(active.querySelector(".wd-taskbar-item-ui__indicator")).not.toBeNull();
    expect(running.hasAttribute("aria-pressed")).toBe(false);
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });

  it("native click 뒤 ID 없는 단일 activate action을 전달한다", () => {
    const onAction = vi.fn();
    const onClick = vi.fn();
    const view = renderUITest(
      <TaskbarItemUI
        data-presentation="taskbar-item"
        icon="A"
        label="앱 활성화"
        onAction={onAction}
        onClick={onClick}
      />,
    );
    const button = view.getByRole("button", { name: "앱 활성화" });

    button.click();

    expect(button.getAttribute("data-presentation")).toBe("taskbar-item");
    expect(onClick).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: "activate" });
  });

  it("native click이 취소되면 표현 action도 실행하지 않는다", () => {
    const onAction = vi.fn();
    const view = renderUITest(
      <TaskbarItemUI
        icon="A"
        label="취소 가능한 활성화"
        onAction={onAction}
        onClick={(event) => event.preventDefault()}
      />,
    );

    view.getByRole("button", { name: "취소 가능한 활성화" }).click();

    expect(onAction).not.toHaveBeenCalled();
  });

  it("disabled item은 native click과 표현 action을 모두 실행하지 않는다", () => {
    const onAction = vi.fn();
    const onClick = vi.fn();
    const view = renderUITest(
      <TaskbarItemUI
        disabled
        icon="D"
        label="사용할 수 없는 앱"
        onAction={onAction}
        onClick={onClick}
      />,
    );
    const button = view.getByRole("button", { name: "사용할 수 없는 앱" });

    button.click();

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("className, 명시한 type과 ref를 native button에 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(
      <TaskbarItemUI
        className="custom-item"
        icon="S"
        label="제출"
        name="intent"
        ref={ref}
        type="submit"
      />,
    );
    const button = view.getByRole("button", { name: "제출" });

    expect(button.className).toContain("custom-item");
    expect(button.getAttribute("name")).toBe("intent");
    expect(button.getAttribute("type")).toBe("submit");
    expect(ref.current).toBe(button);
  });
});

describe("TaskbarClockUI", () => {
  it("고정 Date를 caller가 선택한 time zone의 시간과 날짜로 표시한다", () => {
    const value = new Date("2026-09-01T06:24:00.000Z");
    const view = renderUITest(<TaskbarClockUI timeZone="Asia/Seoul" value={value} />);
    const clock = view.getByLabelText("날짜 및 시간");
    const expectedTime = new Intl.DateTimeFormat("ko-KR", {
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    }).format(value);
    const expectedDate = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(value);

    expect(clock.getAttribute("data-ready")).toBe("true");
    expect(clock.textContent).toContain(expectedTime);
    expect(clock.textContent).toContain(expectedDate);
    expect(clock.querySelector("time")?.getAttribute("datetime")).toBe(value.toISOString());
  });

  it("시각이 없으면 tick을 만들지 않고 장식 skeleton만 표시한다", () => {
    const view = renderUITest(<TaskbarClockUI data-testid="clock-skeleton" />);
    const clock = view.getByTestId("clock-skeleton");

    expect(clock.getAttribute("data-ready")).toBe("false");
    expect(clock.querySelector("time")).toBeNull();
    expect(clock.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});

describe("TaskbarPreviewUI", () => {
  it("Window family 없이 generic preview slot과 native section props를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <TaskbarPreviewUI
        aria-label="블로그 미리 보기"
        className="custom-preview"
        data-kind="generic"
        preview={<article>generic preview</article>}
        ref={ref}
        title="블로그"
      />,
    );
    const preview = view.getByRole("region", { name: "블로그 미리 보기" });

    expect(preview.getAttribute("data-state")).toBe("visible");
    expect(preview.getAttribute("data-motion")).toBe("full");
    expect(preview.getAttribute("data-kind")).toBe("generic");
    expect(preview.textContent).toContain("generic preview");
    expect(ref.current).toBe(preview);
  });

  it("hidden 표시 상태는 native hidden semantic을 파생한다", () => {
    const view = renderUITest(
      <TaskbarPreviewUI
        data-testid="hidden-preview"
        preview="미리 보기"
        state="hidden"
        title="숨은 preview"
      />,
    );
    const preview = view.getByTestId("hidden-preview");

    expect(preview.getAttribute("data-state")).toBe("hidden");
    expect(preview.hasAttribute("hidden")).toBe(true);
  });
});

describe("Taskbar product views", () => {
  const entries = [
    { icon: <span>F</span>, label: "파일", value: "file" },
    { icon: <span>N</span>, label: "노트", value: "note" },
  ];

  it("Pinned/All view가 opaque value만 callback으로 되돌린다", async () => {
    const onItemSelect = vi.fn();
    const onShowAll = vi.fn();
    const pinned = renderUITest(
      <WindowsPanelPinnedViewUI
        items={entries}
        onItemSelect={onItemSelect}
        onShowAll={onShowAll}
      />,
    );

    pinned.getByRole("button", { name: "파일" }).click();
    pinned.getByRole("button", { name: "모두" }).click();
    expect(onItemSelect).toHaveBeenCalledExactlyOnceWith("file");
    expect(onShowAll).toHaveBeenCalledOnce();
    cleanupUITest();

    const all = renderUITest(
      <WindowsPanelAllViewUI onItemSelect={onItemSelect} sections={[{ category: "F", entries }]} />,
    );
    fireEvent.click(
      within(all.getByRole("group", { name: "모든 항목" })).getByRole("button", { name: "F" }),
    );
    await waitFor(() =>
      expect(all.getByRole("group", { name: "카테고리 이동" }).getAttribute("data-open")).toBe(
        "true",
      ),
    );
    within(all.getByRole("group", { name: "카테고리 이동" }))
      .getByRole("button", { name: "F" })
      .click();
    all.getByRole("button", { name: "노트" }).click();
    expect(onItemSelect).toHaveBeenLastCalledWith("note");
  });

  it("WindowsPanelUI가 browse/search와 pinned/all을 production view로 전환한다", async () => {
    const view = renderUITest(
      <WindowsPanelUI
        allSections={[{ category: "F", entries }]}
        pinnedItems={entries}
        results={entries}
      />,
    );
    const search = view.getByRole("searchbox", { name: "시작 메뉴 검색" });

    expect(view.getByRole("heading", { name: "고정됨" })).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "모두" }));
    await waitFor(() => expect(view.getByRole("heading", { name: "모두" })).not.toBeNull());
    fireEvent.change(search, { target: { value: "파" } });
    expect(view.getByRole("heading", { name: "최적의 일치" })).not.toBeNull();
  });

  it("Search recommendation/results/detail과 action callback을 제공한다", () => {
    const onDetailAction = vi.fn();
    const onDetailValueChange = vi.fn();
    const onSearchValueChange = vi.fn();
    const view = renderUITest(
      <SearchPanelUI
        detailActions={[{ label: "열기", value: "open" }]}
        detailValue="file"
        onDetailAction={onDetailAction}
        onDetailValueChange={onDetailValueChange}
        onSearchValueChange={onSearchValueChange}
        results={entries}
        searchValue="파"
      />,
    );

    fireEvent.change(view.getByRole("searchbox", { name: "작업 표시줄 검색" }), {
      target: { value: "파일" },
    });
    view.getByRole("button", { name: "노트 자세히" }).click();
    view.getByRole("button", { name: "열기" }).click();
    expect(onSearchValueChange).toHaveBeenCalledWith("파일");
    expect(onDetailValueChange).toHaveBeenCalledWith("note");
    expect(onDetailAction).toHaveBeenCalledWith("open", "file");
  });

  it("hover preview가 scaled content와 select/close controls를 생산한다", () => {
    const onCloseItem = vi.fn();
    const onSelectItem = vi.fn();
    const view = renderUITest(
      <TaskHoverPanelUI
        items={[{ ...entries[0], preview: <article>window preview</article> }]}
        onCloseItem={onCloseItem}
        onSelectItem={onSelectItem}
      />,
    );

    view.getByRole("button", { name: "파일" }).click();
    view.getByRole("button", { name: "파일 닫기" }).click();
    expect(view.getByText("window preview").closest(".wd-scaled-preview-ui")).not.toBeNull();
    expect(onSelectItem).toHaveBeenCalledWith("file");
    expect(onCloseItem).toHaveBeenCalledWith("file");
  });

  it("Taskbar context menu가 production Primitive와 action entries를 조합한다", async () => {
    const onAction = vi.fn();
    const view = renderUITest(
      <TaskbarContextMenuUI
        actions={[{ label: "새 창", value: "new" }]}
        label="파일 작업"
        onAction={onAction}
        trigger={<button type="button">파일 target</button>}
      />,
    );

    fireEvent.contextMenu(view.getByRole("button", { name: "파일 target" }));
    const menu = await screen.findByRole("menu", { name: "파일 작업" });
    within(menu).getByRole("menuitem", { name: "새 창" }).click();
    expect(onAction).toHaveBeenCalledExactlyOnceWith("new");
  });

  it("TaskbarUI complete aggregate가 Start/Search/group/clock controls를 직접 생산한다", () => {
    const view = renderUITest(
      <TaskbarUI
        clockValue={new Date("2026-09-01T06:24:00.000Z")}
        groups={[{ icon: "A", label: "앱", value: "app" }]}
        pinnedItems={entries}
      />,
    );

    expect(view.getByRole("navigation", { name: "작업 표시줄" })).not.toBeNull();
    expect(view.getByRole("button", { name: "시작" })).not.toBeNull();
    expect(view.getByRole("button", { name: "검색" })).not.toBeNull();
    expect(view.getByRole("button", { name: "앱" })).not.toBeNull();
    expect(view.getByLabelText("날짜 및 시간")).not.toBeNull();
  });
});

describe("WindowPanelUI", () => {
  it("content slot, native props와 caller-owned transition state를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <WindowPanelUI
        aria-label="시작"
        className="custom-panel"
        data-view="pinned"
        ref={ref}
        role="dialog"
        state="entering"
      >
        <div>고정된 항목 slot</div>
      </WindowPanelUI>,
    );
    const panel = view.getByRole("dialog", { name: "시작" });

    expect(panel.getAttribute("data-state")).toBe("entering");
    expect(panel.getAttribute("data-motion")).toBe("full");
    expect(panel.getAttribute("data-view")).toBe("pinned");
    expect(panel.textContent).toBe("고정된 항목 slot");
    expect(ref.current).toBe(panel);
  });

  it("hidden 표시 상태는 native hidden semantic을 파생한다", () => {
    const view = renderUITest(
      <WindowPanelUI data-testid="hidden-panel" state="hidden">
        숨은 panel
      </WindowPanelUI>,
    );
    const panel = view.getByTestId("hidden-panel");

    expect(panel.getAttribute("data-state")).toBe("hidden");
    expect(panel.hasAttribute("hidden")).toBe(true);
  });
});
