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
          "DialogUI는 페이지 나머지와 focus·pointer 상호작용을 격리해야 하는 modal 흐름에 사용합니다. trigger에 연결된 보조 surface에서 주변 action을 계속 허용해야 하면 PopoverUI를 선택합니다. public Root인 DialogUI에 Trigger와 Portal(Backdrop·Content)을 두고 Content 안에 Title, Description, controls와 Close를 조합합니다. accessible dialog naming, initial/final focus, focus loop, Escape·backdrop dismissal과 선택적 pointer-dismissal 보호를 family가 제공합니다. consumer는 form controls, submit 결과와 open policy를 제공해야 하고, DialogUI는 저장, 확인 결과, 라우팅이나 제품 workflow를 소유하지 않습니다.",
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
