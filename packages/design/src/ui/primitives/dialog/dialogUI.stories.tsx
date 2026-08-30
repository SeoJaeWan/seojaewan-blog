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
          "### What is it?\nDialogUI는 Backdrop과 Content를 portal에 렌더링하고 페이지 나머지의 focus·pointer 상호작용을 격리하는 modal Primitive입니다.\n\n### Where is the product reference?\n제품 기준은 **Planned Notion image lightbox**이며 아직 제품에 구현되지 않았습니다. `Product Reference — Planned Notion Lightbox` Story는 Planned state를 명시한 local planning fixture입니다.\n\n### When should I use it?\n큰 이미지를 집중해 살펴보는 동안 배경 문서와 상호작용하면 안 되는 lightbox처럼 하나의 modal context에 사용자를 머물게 해야 할 때 사용합니다.\n\n### When should I choose something else?\ntrigger에 anchor된 보조 panel에서 주변 action을 계속 허용하려면 PopoverUI를, 문서 흐름 안의 영역을 펼치거나 접으려면 CollapsibleUI를 사용합니다.\n\n### What states and interaction contract matter?\nClosed/Open, accessible modal naming, portal·backdrop, initial/final focus, focus loop, Escape·backdrop dismissal과 선택적 pointer-dismissal 보호가 중요합니다. 닫히면 focus가 trigger로 복원됩니다.\n\n### Who owns what?\nPrimitive는 modal isolation, portal, focus loop와 dismissal mechanics를 소유합니다. Consumer는 Title·Description, controls와 open policy를 제공합니다. Notion image loading, lightbox dimensions, zoom·navigation·download workflow와 route는 higher layer가 소유합니다.",
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

const PlannedNotionLightboxProductReference = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-label="Planned Notion lightbox reference"
      className="wd-story-stage wd-story-stack"
      data-product-state="planned"
      data-product-surface="planned-notion-image-lightbox"
    >
      <p>Planned Notion · Planned state — not implemented</p>
      <p>This local fixture documents a modal choice; it is not a product implementation.</p>
      <output aria-label="Planned Notion lightbox 상태">
        {isOpen ? "Planned modal reference 열림" : "Planned modal reference 닫힘"}
      </output>
      <DialogUI open={isOpen} onOpenChange={setIsOpen}>
        <DialogUI.Trigger>Open planned image lightbox</DialogUI.Trigger>
        <DialogUI.Portal>
          <DialogUI.Backdrop data-testid="planned-lightbox-backdrop" />
          <DialogUI.Content>
            <DialogUI.Title>Planned Notion image lightbox</DialogUI.Title>
            <DialogUI.Description>
              Planning reference only; image workflow and route are not implemented here.
            </DialogUI.Description>
            <figure>
              <div aria-label="Local placeholder image preview" role="img">
                Local image placeholder
              </div>
              <figcaption>Docs-only media fixture</figcaption>
            </figure>
            <ButtonUI>Inspect image details</ButtonUI>
            <DialogUI.Close>Close lightbox</DialogUI.Close>
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
          "Surface: Planned Notion image lightbox. Reference state: Planned — not implemented. 이 local fixture는 배경을 격리하는 modal 선택과 focus·dismissal parity만 보여 줍니다. 이미지 로딩, lightbox dimensions, zoom, 이전/다음 탐색, download와 route는 higher layer의 계획 책임입니다.",
      },
    },
  },
  render: () => <PlannedNotionLightboxProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open planned image lightbox" });
    const status = canvas.getByRole("status", { name: "Planned Notion lightbox 상태" });

    await expect(
      canvas.getByText("Planned Notion · Planned state — not implemented"),
    ).toBeVisible();
    await expect(status).toHaveTextContent("Planned modal reference 닫힘");

    await userEvent.click(trigger);
    const dialog = await page.findByRole("dialog", { name: "Planned Notion image lightbox" });
    await expect(canvasElement.contains(dialog)).toBe(false);
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page.getByRole("button", { name: "Inspect image details" })).toHaveFocus();
    await expect(status).toHaveTextContent("Planned modal reference 열림");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await expect(status).toHaveTextContent("Planned modal reference 닫힘");
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
