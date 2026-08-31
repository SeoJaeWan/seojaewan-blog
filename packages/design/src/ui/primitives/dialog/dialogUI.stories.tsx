import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ButtonUI } from "../button";
import { InputUI } from "../input";
import { DialogUI } from "./index";

const DialogExample = ({
  disablePointerDismissal = false,
}: {
  disablePointerDismissal?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [outsideActionCount, setOutsideActionCount] = useState(0);
  const [outsideActionResult, setOutsideActionResult] = useState("아직 실행되지 않음");

  return (
    <div className="wd-story-stage wd-story-stack">
      <ButtonUI
        onClick={() => {
          setOutsideActionCount((count) => count + 1);
          setOutsideActionResult("Dialog가 닫힌 뒤 외부 action이 실행되고 focus가 남음");
        }}
      >
        Outside action
      </ButtonUI>
      <dl className="wd-story-probe">
        <dt>Outside action 실행 횟수</dt>
        <dd data-testid="dialog-outside-count">{outsideActionCount}</dd>
        <dt>현재 상태</dt>
        <dd data-testid="dialog-isolation-status">
          {isOpen
            ? "Dialog 열림 — 외부 영역과 focus가 격리됨"
            : "Dialog 닫힘 — 외부 action 사용 가능"}
        </dd>
        <dt>마지막 결과</dt>
        <dd data-testid="dialog-outside-result">{outsideActionResult}</dd>
      </dl>
      <DialogUI
        disablePointerDismissal={disablePointerDismissal}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogUI.Trigger>Open settings</DialogUI.Trigger>
        <DialogUI.Portal>
          <DialogUI.Backdrop data-testid="dialog-backdrop" />
          <DialogUI.Content>
            <DialogUI.Title>Settings</DialogUI.Title>
            <DialogUI.Description>Change your preferences.</DialogUI.Description>
            <label className="wd-story-field">
              Display name
              <InputUI aria-label="Display name" defaultValue="Seo Jae-wan" />
            </label>
            <ButtonUI>Save preview</ButtonUI>
            <DialogUI.Close>Done</DialogUI.Close>
          </DialogUI.Content>
        </DialogUI.Portal>
      </DialogUI>
    </div>
  );
};

const meta = {
  component: DialogUI,
  subcomponents: {
    Trigger: DialogUI.Trigger,
    Portal: DialogUI.Portal,
    Backdrop: DialogUI.Backdrop,
    Content: DialogUI.Content,
    Title: DialogUI.Title,
    Description: DialogUI.Description,
    Close: DialogUI.Close,
  },
  parameters: {
    docs: {
      description: {
        component:
          "### 무엇인가요?\nDialogUI는 페이지 위에 modal을 띄우고, 닫을 때까지 배경의 focus와 pointer를 막는 Primitive입니다.\n\n### 제품에서는 어디에 쓰나요?\n제품 기준은 아직 구현 전인 **Planned Notion image lightbox**입니다. `Product Reference — Planned Notion Lightbox` Story에서 문서 이미지 썸네일을 누르면 같은 이미지를 큰 modal로 보는 이유를 확인할 수 있습니다.\n\n### 언제 쓰나요?\n큰 이미지를 살펴보는 동안 배경 문서를 실수로 조작하면 안 되는 lightbox처럼, 사용자를 한 modal 문맥에 머물게 해야 할 때 씁니다.\n\n### 다른 surface는 언제 고르나요?\n기준 대상에 붙고 주변 화면을 계속 쓸 수 있어야 하면 PopoverUI를, 같은 문서 흐름 안의 내용을 펼치고 접으면 CollapsibleUI를 씁니다.\n\n### 꼭 지켜야 할 동작은 무엇인가요?\n열림 상태, 접근 가능한 modal 이름, `aria-modal`, portal·backdrop, focus loop, Escape·backdrop 닫힘과 trigger로 돌아오는 focus가 중요합니다.\n\n### 누가 무엇을 소유하나요?\nPrimitive는 modal isolation, portal, focus loop와 dismissal mechanics를 소유합니다. 이미지 로딩, lightbox 크기, zoom·이전/다음·download와 route는 Notion owner가 소유합니다.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "UI/Primitives/DialogUI",
} satisfies Meta<typeof DialogUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "닫힌 modal의 기본 상태입니다. Outside action과 trigger를 함께 보여 주며, dialog를 열기 전에는 외부 action을 실행할 수 있고 그 횟수와 결과가 Canvas에 남습니다.",
      },
    },
  },
  render: () => <DialogExample />,
};

export const WidthAndViewportContract: Story = {
  name: "폭 계약 — override와 viewport 경계",
  parameters: {
    docs: {
      description: {
        story:
          "Dialog surface가 소비자가 명시한 폭 override를 받아들이고, 긴 내용과 함께도 padded viewport 안에 머무는지 확인합니다.",
      },
    },
  },
  render: () => (
    <div className="wd-story-stage">
      <DialogUI defaultOpen>
        <DialogUI.Trigger>폭 경계 dialog 열기</DialogUI.Trigger>
        <DialogUI.Portal>
          <DialogUI.Backdrop />
          <DialogUI.Content
            data-testid="dialog-width-content"
            initialFocus={false}
            style={{ width: "18rem" }}
          >
            <DialogUI.Title>Dialog width contract</DialogUI.Title>
            <DialogUI.Description data-testid="dialog-width-long-content">
              https://example.com/a-deliberately-long-unbroken-dialog-value-that-must-not-grow-the-surface
            </DialogUI.Description>
            <DialogUI.Close>닫기</DialogUI.Close>
          </DialogUI.Content>
        </DialogUI.Portal>
      </DialogUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const content = await page.findByTestId("dialog-width-content");
    const rectangle = content.getBoundingClientRect();
    const viewportWidth = canvasElement.ownerDocument.documentElement.clientWidth;

    await expect(rectangle.width).toBeCloseTo(288, 0);
    await expect(rectangle.left).toBeGreaterThan(0);
    await expect(rectangle.right).toBeLessThan(viewportWidth);
    await expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
      viewportWidth,
    );
  },
};

export const FocusTrapAndDismissal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "trigger로 modal을 열면 초기 focus가 입력으로 이동하고 focus loop가 Content 안에 머뭅니다. 열림 중 Outside action은 격리되며, Escape로 닫힌 뒤에는 실제 외부 action을 실행할 수 있습니다. 다시 연 dialog는 backdrop으로 닫히고 각 상태와 마지막 실행 결과가 Canvas에 남습니다.",
      },
    },
  },
  render: () => <DialogExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const outside = canvas.getByRole("button", { name: "Outside action" });
    const outsideCount = canvas.getByTestId("dialog-outside-count");
    const isolationStatus = canvas.getByTestId("dialog-isolation-status");
    const outsideResult = canvas.getByTestId("dialog-outside-result");
    const trigger = canvas.getByRole("button", { name: "Open settings" });

    await userEvent.click(trigger);

    const dialog = await page.findByRole("dialog", { name: "Settings" });
    const firstField = page.getByRole("textbox", { name: "Display name" });
    const close = page.getByRole("button", { name: "Done" });
    await expect(canvasElement.contains(dialog)).toBe(false);
    await expect(firstField).toHaveFocus();
    await expect(outside).not.toHaveFocus();
    await expect(outsideCount).toHaveTextContent("0");
    await expect(isolationStatus).toHaveTextContent("외부 영역과 focus가 격리됨");

    close.focus();
    await userEvent.tab();
    await waitFor(() => expect(firstField).toHaveFocus());
    await expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
    await expect(isolationStatus).toHaveTextContent("외부 action 사용 가능");

    await userEvent.click(outside);
    await expect(outside).toHaveFocus();
    await expect(outsideCount).toHaveTextContent("1");
    await expect(outsideResult).toHaveTextContent(
      "Dialog가 닫힌 뒤 외부 action이 실행되고 focus가 남음",
    );

    await userEvent.click(trigger);
    await page.findByRole("dialog", { name: "Settings" });
    await expect(isolationStatus).toHaveTextContent("외부 영역과 focus가 격리됨");
    await userEvent.click(page.getByTestId("dialog-backdrop"));
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
    await expect(isolationStatus).toHaveTextContent("외부 action 사용 가능");
    await expect(outsideCount).toHaveTextContent("1");
    await expect(outsideResult).toHaveTextContent("외부 action이 실행되고 focus가 남음");
  },
};

const NotionDocumentImage = ({ expanded = false }: { expanded?: boolean }) => (
  <svg
    aria-label={expanded ? "확대된 산과 호수 문서 이미지" : "산과 호수 문서 이미지 썸네일"}
    role="img"
    style={{
      borderRadius: "0.5rem",
      display: "block",
      height: expanded ? "18.75rem" : "7.5rem",
      maxWidth: "100%",
      width: expanded ? "30rem" : "12rem",
    }}
    viewBox="0 0 480 300"
  >
    <rect fill="#dbeafe" height="300" width="480" />
    <circle cx="382" cy="70" fill="#fbbf24" r="34" />
    <path d="M0 214 112 104l88 92 76-72 128 110 76-46v112H0Z" fill="#64748b" />
    <path d="m72 214 40-110 88 92 76-72 55 48-83 78Z" fill="#f8fafc" opacity="0.9" />
    <path d="M0 226c104-20 181 28 274 9 86-18 142-15 206 4v61H0Z" fill="#38bdf8" />
    <path d="M0 262c114-20 210 18 312 1 68-11 120-9 168 3v34H0Z" fill="#0ea5e9" />
  </svg>
);

const PlannedNotionLightboxProductReference = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastResult, setLastResult] = useState("라이트박스 닫힘");

  return (
    <section
      aria-label="Planned Notion lightbox reference"
      className="wd-story-stage wd-story-stack"
      data-product-state="planned"
      data-product-surface="planned-notion-image-lightbox"
    >
      <p>Planned Notion · 구현 예정</p>
      <output aria-label="Planned Notion lightbox 상태">
        {isOpen ? "라이트박스 열림" : lastResult}
      </output>
      <DialogUI
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);
          setLastResult(nextOpen ? "라이트박스 열림" : "라이트박스 닫힘");
        }}
      >
        <DialogUI.Trigger aria-label="Notion 문서 이미지 크게 보기">
          <span>
            <NotionDocumentImage />
            <span>이미지 크게 보기</span>
          </span>
        </DialogUI.Trigger>
        <DialogUI.Portal>
          <DialogUI.Backdrop data-testid="planned-lightbox-backdrop" />
          <DialogUI.Content>
            <DialogUI.Title>Notion 문서 이미지</DialogUI.Title>
            <DialogUI.Description>
              문서 본문을 벗어나지 않고 이미지를 크게 살펴봅니다. 이 lightbox는 구현 예정입니다.
            </DialogUI.Description>
            <figure>
              <NotionDocumentImage expanded />
              <figcaption>산과 호수</figcaption>
            </figure>
            <DialogUI.Close>라이트박스 닫기</DialogUI.Close>
          </DialogUI.Content>
        </DialogUI.Portal>
      </DialogUI>
    </section>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Planned Notion Lightbox",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Planned Notion image lightbox. Reference state: Planned — 아직 구현 전. 문서 이미지 썸네일을 크게 보려면 배경 문서 조작을 잠시 막아야 하므로 Dialog를 선택합니다. 이미지 로딩, lightbox 크기, zoom, 이전/다음, download와 route는 Notion owner가 소유합니다.",
      },
    },
  },
  render: () => <PlannedNotionLightboxProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const reference = canvas.getByRole("region", {
      name: "Planned Notion lightbox reference",
    });
    const trigger = canvas.getByRole("button", { name: "Notion 문서 이미지 크게 보기" });
    const status = canvas.getByRole("status", { name: "Planned Notion lightbox 상태" });

    await expect(reference).toHaveAttribute("data-product-state", "planned");
    await expect(canvas.getByRole("img", { name: "산과 호수 문서 이미지 썸네일" })).toBeVisible();
    await expect(status).toHaveTextContent("라이트박스 닫힘");

    await userEvent.click(trigger);
    const dialog = await page.findByRole("dialog", { name: "Notion 문서 이미지" });
    const close = page.getByRole("button", { name: "라이트박스 닫기" });
    await expect(canvasElement.contains(dialog)).toBe(false);
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() =>
      expect(page.getByRole("img", { name: "확대된 산과 호수 문서 이미지" })).toBeVisible(),
    );
    await expect(close).toHaveFocus();
    await expect(status).toHaveTextContent("라이트박스 열림");

    await userEvent.click(close);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await expect(status).toHaveTextContent("라이트박스 닫힘");
  },
};

export const ProtectedPointerDismissal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "pointer dismissal을 막은 modal 상태입니다. backdrop을 눌러도 Content와 외부 격리가 유지되고 Outside action은 실행되지 않습니다. Escape는 여전히 dialog를 닫고 trigger로 focus를 복원하며 Canvas 상태는 외부 action이 다시 가능함을 보여 줍니다.",
      },
    },
  },
  render: () => <DialogExample disablePointerDismissal />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const outsideCount = canvas.getByTestId("dialog-outside-count");
    const isolationStatus = canvas.getByTestId("dialog-isolation-status");
    const trigger = canvas.getByRole("button", { name: "Open settings" });

    await userEvent.click(trigger);
    const dialog = await page.findByRole("dialog", { name: "Settings" });
    await userEvent.click(page.getByTestId("dialog-backdrop"));
    await expect(dialog).toBeInTheDocument();
    await expect(outsideCount).toHaveTextContent("0");
    await expect(isolationStatus).toHaveTextContent("외부 영역과 focus가 격리됨");

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
    await expect(isolationStatus).toHaveTextContent("외부 action 사용 가능");
  },
};
