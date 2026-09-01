import { useState } from "react";

import { Add20Regular, Dismiss16Regular, Folder20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { IconButtonUI } from "./index";

const meta = {
  title: "UI/Primitives/IconButtonUI",
  component: IconButtonUI,
  tags: ["autodocs"],
  args: {
    icon: <Add20Regular />,
    label: "항목 추가",
  },
  parameters: {
    docs: {
      description: {
        component:
          "### 무엇이며 어디에 쓰나요?\nIconButtonUI는 좁은 공간에서 아이콘 하나로 할 일을 보여 주는 버튼입니다. 화면에는 아이콘만 보이지만 `label`로 읽을 수 있는 이름을 꼭 제공합니다. 창 닫기나 작업 표시줄 앱처럼 작은 버튼에 씁니다.\n\n### 제품에서는 어떻게 보이나요?\n기준 제품은 **기존 창의 닫기 버튼**과 **기존 작업 표시줄의 앱 버튼**입니다. `제품 예시 — 기존 창과 작업 표시줄` Story에서 제목 표시줄의 닫기 자리와 작업 표시줄의 앱 자리를 한눈에 비교할 수 있습니다. 글자로 할 일을 보여 줄 수 있으면 ButtonUI를 사용합니다.\n\n### 어떤 상태와 동작을 확인하나요?\n작게·보통·크게 크기와 기본, 마우스 올림, 누름, 키보드 포커스, 비활성, 선택 상태를 확인합니다. 선택 상태는 `aria-pressed`와 화면 모습에 함께 드러납니다. 사용하는 쪽이 넣은 아이콘은 장식으로 처리되고, label과 마우스·키보드 실행, ref, callback은 그대로 전달됩니다.\n\n### 누가 무엇을 맡나요?\nIconButtonUI는 아이콘만 보이는 버튼의 의미, 크기, 보이는 상태와 비활성·선택 규칙을 맡습니다. 사용하는 쪽은 제품 아이콘, 읽을 수 있는 이름과 callback을 제공합니다. Window 담당은 제목 표시줄과 실제 창 닫기를, Taskbar 담당은 앱 실행·선택 표시와 전체 작업 표시줄 배치를 맡습니다.",
      },
    },
  },
} satisfies Meta<typeof IconButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "기본 크기와 상태",
  parameters: {
    docs: {
      description: {
        story:
          "사용하는 쪽이 Fluent 아이콘을 넣은 크기와 상태 표입니다. 작게·보통·크게 크기와 기본·마우스 올림 준비·누름 확인·비활성·선택 상태를 비교할 수 있습니다.",
      },
    },
  },
  render: (args) => (
    <div className="wd-story-stack wd-story-stack--loose">
      <section className="wd-story-stack">
        <h3>크기</h3>
        <div className="wd-story-cluster">
          <span>작게</span>
          <IconButtonUI {...args} label="작게 항목 추가" size="sm" />
          <span>보통</span>
          <IconButtonUI {...args} label="보통 크기로 항목 추가" size="md" />
          <span>크게</span>
          <IconButtonUI {...args} label="크게 항목 추가" size="lg" />
        </div>
      </section>
      <section className="wd-story-stack">
        <h3>상태</h3>
        <div className="wd-story-cluster">
          <span>기본</span>
          <IconButtonUI {...args} label="항목 추가" />
          <span>마우스 올림 준비</span>
          <IconButtonUI {...args} data-testid="icon-button-hover-ready" label="항목 추가" />
          <span>누름 확인</span>
          <IconButtonUI {...args} data-testid="icon-button-pressed-testable" label="항목 추가" />
          <span>비활성</span>
          <IconButtonUI {...args} disabled label="항목 추가" />
          <span>선택됨</span>
          <IconButtonUI {...args} label="항목 추가" selected />
        </div>
      </section>
    </div>
  ),
};

export const Disabled: Story = {
  name: "비활성 버튼",
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "지금은 실행할 수 없는 아이콘 버튼입니다. 화면에 아이콘만 보여도 읽을 수 있는 이름은 유지됩니다.",
      },
    },
  },
};

export const FixedGeometryContract: Story = {
  name: "폭 계약 — 고정 정사각형",
  parameters: {
    docs: {
      description: {
        story:
          "IconButtonUI의 sm·md·lg 크기가 좁은 flex parent에서도 줄어들지 않고 각자 고정된 정사각형을 유지하는지 확인합니다.",
      },
    },
  },
  render: () => (
    <div
      className="wd-story-stage"
      data-testid="icon-button-fixed-parent"
      style={{ display: "flex", width: "6rem" }}
    >
      <IconButtonUI
        data-testid="icon-button-fixed-sm"
        icon={<Add20Regular />}
        label="작은 고정 버튼"
        size="sm"
      />
      <IconButtonUI
        data-testid="icon-button-fixed-md"
        icon={<Add20Regular />}
        label="중간 고정 버튼"
      />
      <IconButtonUI
        data-testid="icon-button-fixed-lg"
        icon={<Add20Regular />}
        label="큰 고정 버튼"
        size="lg"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = [
      canvas.getByTestId("icon-button-fixed-sm"),
      canvas.getByTestId("icon-button-fixed-md"),
      canvas.getByTestId("icon-button-fixed-lg"),
    ];

    for (const button of buttons) {
      const rectangle = button.getBoundingClientRect();

      await expect(rectangle.width).toBeCloseTo(rectangle.height, 0);
      await expect(getComputedStyle(button).flexShrink).toBe("0");
      await expect(getComputedStyle(button).minWidth).toBe(`${rectangle.width}px`);
    }

    await expect(buttons[0].getBoundingClientRect().width).toBeLessThan(
      buttons[1].getBoundingClientRect().width,
    );
    await expect(buttons[1].getBoundingClientRect().width).toBeLessThan(
      buttons[2].getBoundingClientRect().width,
    );
  },
};

const ExistingWindowTaskbarProductReference = () => {
  const [lastAction, setLastAction] = useState<"idle" | "taskbar-app" | "window-close">("idle");
  const [taskbarSelected, setTaskbarSelected] = useState(false);

  const actionLabel = {
    idle: "아직 실행한 작업이 없습니다.",
    "taskbar-app": "작업 표시줄 앱 버튼을 눌렀습니다.",
    "window-close": "창 닫기 버튼을 눌렀습니다.",
  }[lastAction];

  return (
    <div className="wd-story-stage">
      <article className="wd-story-reference">
        <p className="wd-story-reference__badge">제품 예시 · 기존 창과 작업 표시줄</p>
        <div className="wd-story-reference__layout">
          <section
            aria-labelledby="existing-window-control-title"
            className="wd-story-reference__frame"
            data-product-state="existing"
            data-product-surface="existing-window-control"
          >
            <h2 className="wd-story-reference__heading" id="existing-window-control-title">
              창 제목 표시줄
            </h2>
            <div
              aria-label="블로그 창 제목 표시줄"
              className="wd-story-cluster"
              style={{
                background: "var(--wd-color-surface-muted)",
                border: "1px solid var(--wd-color-border-default)",
                justifyContent: "space-between",
                padding: "0.5rem 0.625rem",
                width: "100%",
              }}
            >
              <strong>블로그</strong>
              <IconButtonUI
                data-testid="window-close-action"
                icon={<Dismiss16Regular />}
                label="창 닫기"
                onClick={() => setLastAction("window-close")}
                size="sm"
              />
            </div>
            <dl className="wd-story-reference__probe">
              <dt>제품 상태</dt>
              <dd>기존</dd>
              <dt>버튼 자리</dt>
              <dd>Window 담당 제목 표시줄의 닫기 자리</dd>
            </dl>
          </section>

          <section
            aria-labelledby="existing-taskbar-control-title"
            className="wd-story-reference__frame"
            data-product-state="existing"
            data-product-surface="existing-taskbar-control"
          >
            <h2 className="wd-story-reference__heading" id="existing-taskbar-control-title">
              작업 표시줄 앱
            </h2>
            <nav
              aria-label="작업 표시줄"
              className="wd-story-cluster"
              style={{
                background: "var(--wd-color-surface-muted)",
                border: "1px solid var(--wd-color-border-default)",
                justifyContent: "center",
                minHeight: "4rem",
                padding: "0.5rem",
                width: "100%",
              }}
            >
              <IconButtonUI
                data-testid="taskbar-app-action"
                icon={<Folder20Regular />}
                label="블로그 앱 열기"
                onClick={() => {
                  setTaskbarSelected((selected) => !selected);
                  setLastAction("taskbar-app");
                }}
                selected={taskbarSelected}
                size="lg"
              />
            </nav>
            <dl className="wd-story-reference__probe">
              <dt>제품 상태</dt>
              <dd>기존</dd>
              <dt>버튼 자리</dt>
              <dd>Taskbar 담당 앱 자리</dd>
              <dt>선택 상태</dt>
              <dd>{taskbarSelected ? "선택됨" : "선택 안 됨"}</dd>
            </dl>
          </section>

          <output
            aria-label="창과 작업 표시줄 버튼 실행 상태"
            className="wd-story-reference__note"
            data-last-action={lastAction}
            data-testid="icon-button-action-probe"
          >
            {actionLabel}
          </output>
          <p className="wd-story-reference__note">
            IconButtonUI는 아이콘 버튼만 맡습니다. Window와 Taskbar 담당이 버튼 자리, 실제 창 닫기,
            앱 실행과 선택 표시를 맡습니다.
          </p>
        </div>
      </article>
    </div>
  );
};

export const ProductReference: Story = {
  name: "제품 예시 — 기존 창과 작업 표시줄",
  parameters: {
    docs: {
      description: {
        story:
          "기존 창 제목 표시줄의 닫기 자리와 기존 작업 표시줄의 앱 자리를 비교합니다. IconButtonUI는 사용하는 쪽이 넣은 아이콘, 읽을 수 있는 이름과 버튼 실행을 맡습니다. Window와 Taskbar 담당은 실제 창 닫기, 앱 실행·선택 표시와 전체 배치를 맡습니다.",
      },
    },
  },
  render: () => <ExistingWindowTaskbarProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByTestId("window-close-action");
    const taskbarButton = canvas.getByTestId("taskbar-app-action");
    const actionProbe = canvas.getByTestId("icon-button-action-probe");

    await expect(actionProbe).toHaveAttribute("data-last-action", "idle");
    await userEvent.click(closeButton);
    await expect(actionProbe).toHaveAttribute("data-last-action", "window-close");
    await userEvent.click(taskbarButton);
    await expect(taskbarButton).toHaveAttribute("aria-pressed", "true");
    await expect(actionProbe).toHaveAttribute("data-last-action", "taskbar-app");
  },
};

const onIconButtonClick = fn();

const IconButtonInteractionFixture = (args: React.ComponentProps<typeof IconButtonUI>) => {
  const [activationCount, setActivationCount] = useState(0);

  return (
    <div>
      <IconButtonUI
        {...args}
        data-testid="icon-button-interaction-action"
        onClick={(event) => {
          args.onClick?.(event);
          setActivationCount((count) => count + 1);
        }}
      />
      <output
        aria-label="아이콘 버튼 실행 횟수"
        data-activation-count={activationCount}
        data-testid="icon-button-interaction-probe"
      >
        실행 횟수: {activationCount}
      </output>
    </div>
  );
};

export const Interaction: Story = {
  name: "동작 — 키보드 실행",
  args: {
    onClick: onIconButtonClick,
  },
  parameters: {
    docs: {
      description: {
        story:
          "키보드로 아이콘 버튼을 실행하는 예시입니다. Space를 한 번 누르면 callback이 한 번 호출되고 실행 횟수가 1로 바뀝니다.",
      },
    },
  },
  render: (args) => <IconButtonInteractionFixture {...args} />,
  play: async ({ canvasElement }) => {
    onIconButtonClick.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByTestId("icon-button-interaction-action");
    const actionProbe = canvas.getByTestId("icon-button-interaction-probe");

    button.focus();
    await userEvent.keyboard(" ");
    await expect(onIconButtonClick).toHaveBeenCalledOnce();
    await expect(actionProbe).toHaveAttribute("data-activation-count", "1");
  },
};

const IconButtonFocusFixture = (args: React.ComponentProps<typeof IconButtonUI>) => {
  const [focusedTarget, setFocusedTarget] = useState<"action" | "none" | "start">("none");

  const focusedTargetLabel = {
    action: "항목 추가 버튼",
    none: "없음",
    start: "키보드 탐색 시작점",
  }[focusedTarget];

  return (
    <div>
      <a
        data-testid="icon-button-focus-start"
        href="#icon-button-focus-target"
        onFocus={() => setFocusedTarget("start")}
      >
        아이콘 버튼 포커스 확인 시작
      </a>
      <IconButtonUI
        {...args}
        data-testid="icon-button-focus-action"
        id="icon-button-focus-target"
        onFocus={(event) => {
          args.onFocus?.(event);
          setFocusedTarget("action");
        }}
      />
      <output
        aria-label="아이콘 버튼 현재 포커스"
        data-focus-target={focusedTarget}
        data-testid="icon-button-focus-probe"
      >
        현재 포커스: {focusedTargetLabel}
      </output>
    </div>
  );
};

export const FocusVisible: Story = {
  name: "상태 — 키보드 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "키보드 탐색 시작점에서 Tab으로 실제 이동합니다. Canvas에서 아이콘 버튼의 focus-visible 테두리와 현재 포커스 표시를 함께 확인합니다.",
      },
    },
  },
  render: (args) => <IconButtonFocusFixture {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByTestId("icon-button-focus-start");
    const button = canvas.getByTestId("icon-button-focus-action");
    const focusProbe = canvas.getByTestId("icon-button-focus-probe");

    start.focus();
    await expect(start).toHaveFocus();
    await expect(focusProbe).toHaveAttribute("data-focus-target", "start");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(focusProbe).toHaveAttribute("data-focus-target", "action");
  },
};
