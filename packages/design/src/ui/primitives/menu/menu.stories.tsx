import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { MenuUI } from "./menu";

const StoryFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: 280, padding: 24 }}>{children}</div>
);

const EmptyFixture = () => (
  <StoryFrame>
    <MenuUI.Root>
      <MenuUI.Trigger>Empty menu</MenuUI.Trigger>
      <MenuUI.Content aria-label="Empty menu">
        <MenuUI.Item disabled>No actions available</MenuUI.Item>
      </MenuUI.Content>
    </MenuUI.Root>
  </StoryFrame>
);

const SingleFixture = () => (
  <StoryFrame>
    <MenuUI.Root>
      <MenuUI.Trigger>Single action</MenuUI.Trigger>
      <MenuUI.Content aria-label="Single action menu">
        <MenuUI.Item>Open</MenuUI.Item>
      </MenuUI.Content>
    </MenuUI.Root>
  </StoryFrame>
);

const MultipleStatesFixture = () => {
  const [selected, setSelected] = useState(true);
  const [density, setDensity] = useState("comfortable");

  return (
    <StoryFrame>
      <MenuUI.Root>
        <MenuUI.Trigger>Multiple actions</MenuUI.Trigger>
        <MenuUI.Content aria-label="Multiple action states">
          <MenuUI.Item>Open</MenuUI.Item>
          <MenuUI.Item disabled>Unavailable</MenuUI.Item>
          <MenuUI.CheckboxItem checked={selected} onCheckedChange={setSelected}>
            Selected option
          </MenuUI.CheckboxItem>
          <MenuUI.RadioGroup onValueChange={setDensity} value={density}>
            <MenuUI.RadioItem value="compact">Compact</MenuUI.RadioItem>
            <MenuUI.RadioItem value="comfortable">Comfortable</MenuUI.RadioItem>
          </MenuUI.RadioGroup>
          <MenuUI.Separator />
          <MenuUI.Item variant="danger">Delete</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>
    </StoryFrame>
  );
};

const SubmenuFixture = () => (
  <StoryFrame>
    <MenuUI.Root>
      <MenuUI.Trigger>Share</MenuUI.Trigger>
      <MenuUI.Content aria-label="Share menu">
        <MenuUI.Item>Copy link</MenuUI.Item>
        <MenuUI.Submenu.Root>
          <MenuUI.Submenu.Trigger>Send to</MenuUI.Submenu.Trigger>
          <MenuUI.Submenu.Content aria-label="Send to submenu">
            <MenuUI.Item>Email</MenuUI.Item>
            <MenuUI.Item>Messages</MenuUI.Item>
          </MenuUI.Submenu.Content>
        </MenuUI.Submenu.Root>
      </MenuUI.Content>
    </MenuUI.Root>
  </StoryFrame>
);

const LifecycleFixture = () => {
  const [open, setOpen] = useState(false);

  return (
    <StoryFrame>
      <p>Use the controls to inspect opening and exiting lifecycle styles.</p>
      <button onClick={() => setOpen((value) => !value)} type="button">
        {open ? "Start exit" : "Start opening"}
      </button>
      <MenuUI.Root onOpenChange={setOpen} open={open}>
        <MenuUI.Trigger>Lifecycle menu</MenuUI.Trigger>
        <MenuUI.Content aria-label="Lifecycle menu" keepMounted>
          <MenuUI.Item>Visible action</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>
    </StoryFrame>
  );
};

const meta = {
  title: "UI/Primitives/MenuUI",
  component: MultipleStatesFixture,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof MultipleStatesFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { render: () => <EmptyFixture /> };
export const Single: Story = { render: () => <SingleFixture /> };
export const MultipleSelectedDisabledDanger: Story = { render: () => <MultipleStatesFixture /> };
export const Submenu: Story = { render: () => <SubmenuFixture /> };
export const OpeningAndExiting: Story = { render: () => <LifecycleFixture /> };
export const NarrowViewport: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <MultipleStatesFixture />,
};
