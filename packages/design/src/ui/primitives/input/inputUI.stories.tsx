import { useState } from "react";

import { Search20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { InputUI } from "./index";

const meta = {
  title: "UI/Primitives/InputUI",
  component: InputUI,
  tags: ["autodocs"],
  args: {
    "aria-label": "파일 검색",
    placeholder: "검색",
  },
  parameters: {
    docs: {
      description: {
        component:
          "### 무엇이며 어디에 쓰나요?\nInputUI는 사용자가 글자를 직접 입력하고 고칠 수 있는 native text input입니다. 작업 표시줄에서 찾을 말을 입력하는 것처럼 정해지지 않은 문자열을 받을 때 씁니다.\n\n### 제품에서는 어떻게 보이나요?\n기준 제품은 **기존 작업 표시줄의 검색 칸**입니다. `제품 예시 — 기존 작업 표시줄 검색` Story에서 검색 아이콘, 입력 칸과 현재 검색어를 작은 작업 표시줄 프레임 안에서 확인할 수 있습니다. 미리 정한 후보를 입력으로 줄여 고를 때는 ComboboxUI를, 글자 입력 없이 목록에서 고를 때는 SelectUI를 사용합니다.\n\n### 어떤 상태와 동작을 확인하나요?\n기본값, 입력값, 안내 문구, 키보드 포커스와 비활성 상태를 확인합니다. native 글자 입력과 수정, controlled·uncontrolled 값 규칙, native props와 ref를 사용하는 쪽에 그대로 전달합니다. 사용하는 쪽은 화면에 보이는 label이나 그와 같은 읽을 수 있는 이름을 제공합니다.\n\n### 누가 무엇을 맡나요?\nInputUI는 글자 입력 한 칸의 의미, 보이는 상태, 포커스와 비활성 규칙을 맡습니다. 사용하는 쪽은 label, 값 검사, 현재 검색어와 변경 규칙을 제공합니다. Taskbar 담당은 검색 아이콘과 전체 배치를 맡고, search 담당은 검색 실행, 추천·결과 조회와 결과 화면을 맡습니다.",
      },
    },
  },
} satisfies Meta<typeof InputUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "기본 입력",
  parameters: {
    docs: {
      description: {
        story:
          "아직 글자를 입력하지 않은 기본 상태입니다. 검색 안내 문구가 보이는 입력 칸에 자유롭게 글자를 입력할 수 있습니다.",
      },
    },
  },
};

export const Disabled: Story = {
  name: "비활성 입력",
  args: {
    defaultValue: "검색할 수 없음",
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "기존 글자를 보여 주지만 고칠 수 없는 상태입니다. 입력해도 값은 바뀌지 않고 ‘검색할 수 없음’이 유지됩니다.",
      },
    },
  },
};

const longInputValue =
  "https://example.com/this-is-a-deliberately-long-unbroken-input-value-for-width-contracts";

export const WidthAllocationContract: Story = {
  name: "폭 계약 — 명시 폭과 parent allocation",
  parameters: {
    docs: {
      description: {
        story:
          "InputUI가 작은 폭과 큰 폭, flex·grid parent allocation을 따르면서 긴 native 값은 입력 안에서 스크롤하고 바깥 rectangle이나 문서 폭을 늘리지 않는지 확인합니다.",
      },
    },
  },
  render: () => (
    <div className="wd-story-stage wd-story-stack" data-testid="input-width-stage">
      <InputUI
        aria-label="작은 폭 입력"
        data-testid="input-width-small"
        defaultValue={longInputValue}
        style={{ width: "11rem" }}
      />
      <InputUI
        aria-label="큰 폭 입력"
        data-testid="input-width-large"
        defaultValue={longInputValue}
        style={{ width: "24rem" }}
      />
      <div
        data-testid="input-width-flex-parent"
        style={{ display: "flex", gap: "1rem", width: "22rem" }}
      >
        <InputUI
          aria-label="flex allocation 입력"
          data-testid="input-width-flex"
          defaultValue={longInputValue}
          style={{ flex: "1 1 auto", minWidth: 0 }}
        />
        <span aria-hidden="true" style={{ flex: "0 0 2rem" }} />
      </div>
      <div
        data-testid="input-width-grid-parent"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 2rem", width: "20rem" }}
      >
        <InputUI
          aria-label="grid allocation 입력"
          data-testid="input-width-grid"
          defaultValue={longInputValue}
          style={{ maxWidth: "100%", width: "100%" }}
        />
        <span aria-hidden="true" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const small = canvas.getByTestId("input-width-small");
    const large = canvas.getByTestId("input-width-large");
    const flex = canvas.getByTestId("input-width-flex");
    const flexParent = canvas.getByTestId("input-width-flex-parent");
    const grid = canvas.getByTestId("input-width-grid");
    const gridParent = canvas.getByTestId("input-width-grid-parent");

    await expect(small.getBoundingClientRect().width).toBeCloseTo(176, 0);
    await expect(large.getBoundingClientRect().width).toBeCloseTo(384, 0);
    await expect(flex.getBoundingClientRect().width).toBeCloseTo(
      flexParent.getBoundingClientRect().width - 48,
      0,
    );
    await expect(grid.getBoundingClientRect().width).toBeCloseTo(
      gridParent.getBoundingClientRect().width - 32,
      0,
    );

    await userEvent.click(small);
    await userEvent.keyboard("{End}");
    await waitFor(() => expect(small.scrollLeft).toBeGreaterThan(0));
    await expect(small.getBoundingClientRect().width).toBeCloseTo(176, 0);
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientWidth,
    );
  },
};

const ExistingTaskbarSearchProductReference = () => {
  const [query, setQuery] = useState("");

  return (
    <div className="wd-story-stage">
      <article
        className="wd-story-reference"
        data-product-state="existing"
        data-product-surface="existing-taskbar-search"
      >
        <p className="wd-story-reference__badge">제품 예시 · 기존 작업 표시줄 검색</p>
        <div className="wd-story-reference__layout">
          <section
            aria-labelledby="existing-taskbar-search-title"
            className="wd-story-reference__frame"
          >
            <h2 className="wd-story-reference__heading" id="existing-taskbar-search-title">
              작업 표시줄 검색
            </h2>
            <label htmlFor="existing-taskbar-search-query">찾을 내용</label>
            <div
              aria-label="작업 표시줄 검색 칸"
              className="wd-story-cluster"
              style={{
                background: "var(--wd-color-surface-muted)",
                border: "1px solid var(--wd-color-border-default)",
                borderRadius: "999px",
                flexWrap: "nowrap",
                padding: "0.375rem 0.625rem",
                width: "min(100%, 24rem)",
              }}
            >
              <span aria-hidden="true" style={{ display: "inline-flex", flex: "0 0 auto" }}>
                <Search20Regular />
              </span>
              <InputUI
                aria-describedby="existing-taskbar-search-query-status"
                data-testid="taskbar-search-query"
                id="existing-taskbar-search-query"
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="앱, 설정, 문서 검색"
                style={{ flex: "1 1 auto", minWidth: 0 }}
                value={query}
              />
            </div>
            <dl className="wd-story-reference__probe">
              <dt>제품 상태</dt>
              <dd>기존</dd>
              <dt>입력 자리</dt>
              <dd>Taskbar 담당 검색 칸</dd>
              <dt>현재 검색어</dt>
              <dd>
                <output
                  aria-label="작업 표시줄 현재 검색어"
                  data-query={query}
                  data-testid="taskbar-search-query-probe"
                  id="existing-taskbar-search-query-status"
                >
                  {query || "비어 있음"}
                </output>
              </dd>
            </dl>
          </section>
          <p className="wd-story-reference__note">
            InputUI는 글자를 입력하고 고치는 한 칸만 맡습니다. Taskbar 담당은 검색 칸 배치를, search
            담당은 검색 실행과 추천·결과 화면을 맡습니다.
          </p>
        </div>
      </article>
    </div>
  );
};

export const ProductReference: Story = {
  name: "제품 예시 — 기존 작업 표시줄 검색",
  parameters: {
    docs: {
      description: {
        story:
          "기존 작업 표시줄의 검색 칸입니다. InputUI는 글자 입력·수정과 읽을 수 있는 이름의 연결을 맡고, 사용하는 쪽은 현재 검색어를 관리합니다. Taskbar와 search 담당은 검색 아이콘, 검색 실행, 추천·결과 조회와 결과 화면을 맡습니다.",
      },
    },
  },
  render: () => <ExistingTaskbarSearchProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId("taskbar-search-query");
    const queryProbe = canvas.getByTestId("taskbar-search-query-probe");

    await expect(queryProbe).toHaveAttribute("data-query", "");
    await userEvent.type(input, "design");
    await expect(input).toHaveValue("design");
    await expect(queryProbe).toHaveAttribute("data-query", "design");
  },
};

export const TextEntry: Story = {
  name: "동작 — 글자 입력",
  parameters: {
    docs: {
      description: {
        story:
          "빈 입력 칸에 ‘documents’를 입력하는 사용자 흐름입니다. 입력 뒤 native 값이 바뀌는지 확인합니다.",
      },
    },
  },
  render: (args) => <InputUI {...args} data-testid="input-text-entry" />,
  play: async ({ canvas }) => {
    const input = canvas.getByTestId("input-text-entry");

    await userEvent.type(input, "documents");

    await expect(input).toHaveValue("documents");
  },
};
