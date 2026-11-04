import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { StoryStage } from '@seojaewan/design-system/story';

import { menuPower } from '@/features/start-menu/power-menu/story-data';

import { StartPowerButton } from './start-power-button';

/**
 * 누르면 전원 메뉴가 열리고 닫히는 전원 버튼을 그린다. 열림 상태는 쓰는 곳이 가지므로 이 스토리가 대신 가진다.
 * @returns 오른쪽 아래에 둔 전원 버튼
 */
function PowerButtonStage(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * 메뉴가 열리거나 닫히려 할 때 열림 상태를 맞춘다.
   * @param isNextOpen 바뀔 열림 상태
   */
  function handleOpenChange(isNextOpen: boolean): void {
    setIsOpen(isNextOpen);
  }

  return (
    <StoryStage placement="bottom-end" isTarget>
      <StartPowerButton isOpen={isOpen} onOpenChange={handleOpenChange} menuItems={menuPower} />
    </StoryStage>
  );
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립은 버튼만 보이는 닫힌 모양 하나라 Figma 스토리도 닫은 채로 그린다.
// 메뉴는 버튼 위에 열리므로 캔버스 전체를 쓰고 버튼을 오른쪽 아래에 두며, 버튼 자리(피그마 노드)를 캡처 대상으로 표시한다.
const meta = {
  title: 'Patterns/Start/PowerButton',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <StoryStage placement="bottom-end" isTarget>
      <StartPowerButton menuItems={menuPower} />
    </StoryStage>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/** 버튼을 누르면 전원 메뉴(다시 시작)가 열리고, Esc를 누르면 닫힌다 */
export const Open: Story = {
  render: () => <PowerButtonStage />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('처음에는 메뉴가 닫혀 있다', async () => {
      await expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    await step('버튼을 누르면 메뉴가 열려 다시 시작이 보인다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '전원' }));
      await expect(await screen.findByRole('menuitem', { name: '다시 시작' })).toBeInTheDocument();
    });

    await step('Esc를 누르면 메뉴가 닫힌다', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
      });
    });
  },
};
