import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ButtonUI } from "./index";

const meta = {
  title: "UI/Primitives/ButtonUI",
  component: ButtonUI,
  tags: ["autodocs"],
  args: {
    children: "창 열기",
  },
  parameters: {
    docs: {
      description: {
        component:
          '### 무엇이며 어디에 쓰나요?\nButtonUI는 글자로 할 일을 분명하게 알려 주는 버튼입니다. 파일 경로 복사처럼 사용자가 바로 실행하고 결과를 확인하는 작업에 씁니다. 기본 구성은 native `button` 하나입니다.\n\n### 제품에서는 어떻게 보이나요?\n기준 제품은 **기존 폴더 카드의 코드 복사 작업**입니다. `제품 예시 — 기존 폴더` Story에서 Folder가 보여 주는 경로, 복사 버튼, 완료 상태를 한 프레임 안에서 확인할 수 있습니다. 아이콘만 필요한 작은 작업에는 읽을 수 있는 이름을 제공하는 IconButtonUI를 사용합니다. 다른 곳으로 이동하는 작업에는 `render="anchor"`와 `href`를 사용합니다.\n\n### 어떤 상태와 동작을 확인하나요?\n기본, 마우스 올림, 누름, 키보드 포커스, 비활성 상태를 확인합니다. 버튼과 링크 구성은 각각 의미가 맞는 요소 하나만 만들며, 마우스와 키보드의 기본 동작, native props, ref, callback을 그대로 전달합니다.\n\n### 누가 무엇을 맡나요?\nButtonUI는 의미에 맞는 요소, 보이는 상태, 비활성일 때 실행되지 않는 규칙을 맡습니다. 사용하는 쪽은 알아보기 쉬운 작업 이름과 목적지 또는 callback을 제공합니다. Folder 담당은 카드 구조를 맡고, content 담당은 표시할 경로, 복사 실행, 권한 확인과 완료 알림을 맡습니다.',
      },
    },
  },
} satisfies Meta<typeof ButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "기본 버튼",
  parameters: {
    docs: {
      description: {
        story:
          "글자로 할 일을 알려 주는 기본 버튼입니다. Canvas에서 사용할 수 있는 native button을 확인합니다.",
      },
    },
  },
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
          "지금은 실행할 수 없는 버튼입니다. Canvas에서 native disabled 속성이 적용된 상태를 확인합니다.",
      },
    },
  },
};

const onContractButtonActivation = fn();
const onContractAnchorActivation = fn();

export const CompositionContract: Story = {
  name: "구성 — 버튼과 링크",
  parameters: {
    docs: {
      description: {
        story:
          "실행할 일은 native button 하나로, 이동할 곳은 href가 있는 native anchor 하나로 만듭니다. 두 구성 모두 읽을 수 있는 이름, ref 대상과 키보드 기본 동작을 의미에 맞는 요소에 보존합니다.",
      },
    },
  },
  render: () => (
    <div className="wd-story-stage wd-story-cluster">
      <ButtonUI onClick={onContractButtonActivation}>작업 실행</ButtonUI>
      <ButtonUI
        href="#button-anchor-contract"
        onClick={(event) => {
          event.preventDefault();
          onContractAnchorActivation();
        }}
        render="anchor"
      >
        목적지 열기
      </ButtonUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    onContractButtonActivation.mockClear();
    onContractAnchorActivation.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "작업 실행" });
    const link = canvas.getByRole("link", { name: "목적지 열기" });

    await expect(canvas.getAllByRole("button")).toHaveLength(1);
    await expect(canvas.getAllByRole("link")).toHaveLength(1);
    await expect(button.tagName).toBe("BUTTON");
    await expect(link.tagName).toBe("A");

    button.focus();
    await userEvent.keyboard("{Enter}");
    link.focus();
    await userEvent.keyboard("{Enter}");

    await expect(onContractButtonActivation).toHaveBeenCalledOnce();
    await expect(onContractAnchorActivation).toHaveBeenCalledOnce();
  },
};

const ExistingFolderProductReference = () => {
  const [copyState, setCopyState] = useState("복사 전");

  return (
    <div className="wd-story-stage">
      <article
        className="wd-story-reference"
        data-product-state="existing"
        data-product-surface="existing-folder-file-card"
      >
        <p className="wd-story-reference__badge">제품 예시 · 기존 폴더</p>
        <div className="wd-story-reference__layout">
          <section aria-labelledby="existing-folder-title" className="wd-story-reference__frame">
            <h2 className="wd-story-reference__heading" id="existing-folder-title">
              design 폴더
            </h2>
            <dl className="wd-story-reference__probe">
              <dt>폴더 상태</dt>
              <dd>기존</dd>
              <dt>경로</dt>
              <dd>
                <code>packages/design</code>
              </dd>
              <dt>복사 상태</dt>
              <dd>
                <output aria-label="기존 폴더 코드 복사 상태">{copyState}</output>
              </dd>
            </dl>
            <ButtonUI onClick={() => setCopyState("복사됨")}>코드 복사</ButtonUI>
          </section>
          <p className="wd-story-reference__note">
            Folder 담당은 폴더 카드 구조를 맡습니다. content 담당은 경로와 복사 결과를 맡고,
            ButtonUI는 코드 복사 작업을 실행하는 버튼을 맡습니다.
          </p>
        </div>
      </article>
    </div>
  );
};

export const ProductReference: Story = {
  name: "제품 예시 — 기존 폴더",
  parameters: {
    docs: {
      description: {
        story:
          "기존 폴더 카드에서 코드 경로를 복사하는 상태입니다. ButtonUI는 코드 복사 버튼의 의미, 보이는 상태와 비활성 규칙을 맡습니다. Folder 담당은 카드 구조를, content 담당은 경로·clipboard 실행·완료 알림을 맡습니다.",
      },
    },
  },
  render: () => <ExistingFolderProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "코드 복사" });
    const status = canvas.getByRole("status", { name: "기존 폴더 코드 복사 상태" });

    await expect(status).toHaveTextContent("복사 전");
    await userEvent.click(button);
    await expect(status).toHaveTextContent("복사됨");
  },
};

const onButtonClick = fn();

const ButtonInteractionFixture = (args: React.ComponentProps<typeof ButtonUI>) => {
  const [activationCount, setActivationCount] = useState(0);

  return (
    <div>
      <ButtonUI
        {...args}
        onClick={(event) => {
          args.onClick?.(event);
          setActivationCount((count) => count + 1);
        }}
      />
      <output aria-label="버튼 실행 횟수">실행 횟수: {activationCount}</output>
    </div>
  );
};

export const Interaction: Story = {
  name: "동작 — 키보드 실행",
  args: {
    onClick: onButtonClick,
  },
  parameters: {
    docs: {
      description: {
        story:
          "키보드로 버튼을 실행하는 예시입니다. Enter를 한 번 누르면 callback이 한 번 호출되고 Canvas의 실행 횟수가 1로 바뀝니다.",
      },
    },
  },
  render: (args) => <ButtonInteractionFixture {...args} />,
  play: async ({ canvasElement }) => {
    onButtonClick.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "창 열기" });
    const status = canvas.getByRole("status", { name: "버튼 실행 횟수" });

    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(onButtonClick).toHaveBeenCalledOnce();
    await expect(status).toHaveTextContent("실행 횟수: 1");
  },
};

const ButtonFocusFixture = (args: React.ComponentProps<typeof ButtonUI>) => {
  const [focusedTarget, setFocusedTarget] = useState("없음");

  return (
    <div>
      <a href="#button-focus-target" onFocus={() => setFocusedTarget("키보드 탐색 시작점")}>
        버튼 포커스 확인 시작
      </a>
      <ButtonUI
        {...args}
        id="button-focus-target"
        onFocus={(event) => {
          args.onFocus?.(event);
          setFocusedTarget("창 열기");
        }}
      />
      <output aria-label="버튼 현재 포커스">현재 포커스: {focusedTarget}</output>
    </div>
  );
};

export const FocusVisible: Story = {
  name: "상태 — 키보드 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "키보드 탐색 시작점에서 Tab으로 실제 이동합니다. Canvas에서 버튼의 focus-visible 테두리와 현재 포커스 표시를 함께 확인합니다.",
      },
    },
  },
  render: (args) => <ButtonFocusFixture {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByRole("link", { name: "버튼 포커스 확인 시작" });
    const button = canvas.getByRole("button", { name: "창 열기" });
    const status = canvas.getByRole("status", { name: "버튼 현재 포커스" });

    start.focus();
    await expect(start).toHaveFocus();
    await expect(status).toHaveTextContent("현재 포커스: 키보드 탐색 시작점");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(status).toHaveTextContent("현재 포커스: 창 열기");
  },
};
