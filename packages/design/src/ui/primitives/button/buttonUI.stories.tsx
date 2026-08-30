import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ButtonUI } from "./index";

const meta = {
  title: "UI/Primitives/ButtonUI",
  component: ButtonUI,
  tags: ["autodocs"],
  args: {
    children: "Open window",
  },
  parameters: {
    docs: {
      description: {
        component:
          '### What is it?\nButtonUI는 텍스트나 콘텐츠로 목적을 드러내는 action Primitive이며 기본적으로 단일 native `button`을 렌더링합니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Folder file-card의 code-copy action**입니다. `Product Reference — Existing Folder` Story가 surface와 Existing state를 작은 fixture로 보여 줍니다.\n\n### When should I use it?\n파일 경로 복사처럼 사용자가 즉시 실행하고 결과를 확인하는 명시적 content action에 사용합니다.\n\n### When should I choose something else?\n아이콘만 보이는 compact action에는 필수 accessible label을 제공하는 IconButtonUI를 사용합니다. 목적지가 있는 탐색은 `render="anchor"`와 `href`를 사용하고, 전체 file-card layout·workflow는 더 높은 product layer가 맡습니다.\n\n### What states and interaction contract matter?\nDefault, hover, active, focus-visible, disabled 상태를 제공하며 native pointer/keyboard activation을 보존합니다. 기본 button과 anchor 구성은 각각 정확히 하나의 semantic interactive element를 만들고 native props, ref와 callback을 전달합니다.\n\n### Who owns what?\nPrimitive는 semantic element composition, visual state와 disabled activation 계약을 소유합니다. Consumer는 읽을 수 있는 action 이름, 목적지 또는 callback을 제공합니다. 권한 확인, clipboard 실행, 성공 알림과 file-card 구조는 higher layer가 소유합니다.',
      },
    },
  },
} satisfies Meta<typeof ButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "기본 content action 상태입니다. Canvas에서 텍스트가 작업의 목적을 드러내는 활성 native button을 확인합니다.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "비활성 content action 상태입니다. Canvas에서 native disabled 속성과 실행할 수 없음을 확인합니다.",
      },
    },
  },
};

const onContractButtonActivation = fn();
const onContractAnchorActivation = fn();

export const CompositionContract: Story = {
  name: "Contract — Button and Anchor Composition",
  parameters: {
    docs: {
      description: {
        story:
          "동작은 native button 하나, 탐색은 href를 가진 native anchor 하나로 구성합니다. 두 구성 모두 accessible name, ref 대상과 native keyboard activation을 semantic element 자체에 보존하며 wrapper를 interactive element로 추가하지 않습니다.",
      },
    },
  },
  render: () => (
    <div className="wd-story-stage wd-story-cluster">
      <ButtonUI onClick={onContractButtonActivation}>Run action</ButtonUI>
      <ButtonUI
        href="#button-anchor-contract"
        onClick={(event) => {
          event.preventDefault();
          onContractAnchorActivation();
        }}
        render="anchor"
      >
        Open destination
      </ButtonUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    onContractButtonActivation.mockClear();
    onContractAnchorActivation.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Run action" });
    const link = canvas.getByRole("link", { name: "Open destination" });

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
        className="wd-button-product-reference"
        data-product-state="existing"
        data-product-surface="existing-folder-file-card"
      >
        <p className="wd-button-product-reference__state">Existing Folder · Existing state</p>
        <h2 className="wd-button-product-reference__heading">design</h2>
        <code className="wd-button-product-reference__path">packages/design</code>
        <ButtonUI onClick={() => setCopyState("복사됨")}>Copy code</ButtonUI>
        <output
          aria-label="Existing Folder code copy 상태"
          className="wd-button-product-reference__status"
        >
          {copyState}
        </output>
      </article>
    </div>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Folder",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Folder file-card. Reference state: Existing. Primitive 범위는 단일 Copy code button의 semantic·visual·disabled 계약까지이며 clipboard 처리, 완료 알림과 card layout은 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingFolderProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Copy code" });
    const status = canvas.getByRole("status", { name: "Existing Folder code copy 상태" });

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
      <output aria-label="Button 실행 횟수">활성화 횟수: {activationCount}</output>
    </div>
  );
};

export const Interaction: Story = {
  args: {
    onClick: onButtonClick,
  },
  parameters: {
    docs: {
      description: {
        story:
          "키보드로 content action을 실행하는 상태입니다. Enter를 한 번 누르면 callback이 한 번 호출되고 Canvas의 활성화 횟수가 1로 바뀝니다.",
      },
    },
  },
  render: (args) => <ButtonInteractionFixture {...args} />,
  play: async ({ canvasElement }) => {
    onButtonClick.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Open window" });
    const status = canvas.getByRole("status", { name: "Button 실행 횟수" });

    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(onButtonClick).toHaveBeenCalledOnce();
    await expect(status).toHaveTextContent("활성화 횟수: 1");
  },
};

const ButtonFocusFixture = (args: React.ComponentProps<typeof ButtonUI>) => {
  const [focusedTarget, setFocusedTarget] = useState("없음");

  return (
    <div>
      <a href="#button-focus-target" onFocus={() => setFocusedTarget("키보드 탐색 시작점")}>
        Button 포커스 확인 시작
      </a>
      <ButtonUI
        {...args}
        id="button-focus-target"
        onFocus={(event) => {
          args.onFocus?.(event);
          setFocusedTarget("Open window");
        }}
      />
      <output aria-label="Button 현재 포커스">현재 포커스: {focusedTarget}</output>
    </div>
  );
};

export const FocusVisible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "fixture가 소유한 키보드 탐색 시작점에서 실제 Tab 이동을 수행합니다. Canvas에서 Button focus, focus-visible outline과 현재 포커스 표시를 함께 확인합니다.",
      },
    },
  },
  render: (args) => <ButtonFocusFixture {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByRole("link", { name: "Button 포커스 확인 시작" });
    const button = canvas.getByRole("button", { name: "Open window" });
    const status = canvas.getByRole("status", { name: "Button 현재 포커스" });

    start.focus();
    await expect(start).toHaveFocus();
    await expect(status).toHaveTextContent("현재 포커스: 키보드 탐색 시작점");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(status).toHaveTextContent("현재 포커스: Open window");
  },
};
