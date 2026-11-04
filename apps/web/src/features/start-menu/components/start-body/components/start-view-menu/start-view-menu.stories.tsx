import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { StoryStage } from '@seojaewan/design-system/story';

import { menuViewOptions } from '@/features/start-menu/components/start-body/view-menu/story-data';

import { StartViewMenu } from './start-view-menu';

/**
 * 누르면 보기 메뉴가 열리고 닫히는 보기 버튼을 그린다. 열림 상태는 쓰는 곳이 가지므로 이 스토리가 대신 가진다.
 * @returns 위 가운데에 둔 보기 버튼
 */
function ViewMenuStage(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * 메뉴가 열리거나 닫히려 할 때 열림 상태를 맞춘다.
   * @param isNextOpen 바뀔 열림 상태
   */
  function handleOpenChange(isNextOpen: boolean): void {
    setIsOpen(isNextOpen);
  }

  return (
    <StoryStage placement="top-center" isTarget>
      <StartViewMenu
        label="간단히"
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        menuItems={menuViewOptions}
      />
    </StoryStage>
  );
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립은 버튼만 보이는 닫힌 모양 하나라 Figma 스토리도 닫은 채로 그린다.
// 메뉴는 버튼 아래에 열리므로 캔버스 전체를 쓰고 버튼을 위 가운데에 두며, 버튼 자리(피그마 노드)를 캡처 대상으로 표시한다.
const meta = {
  title: 'Patterns/Start/ViewMenu',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <StoryStage placement="top-center" isTarget>
      <StartViewMenu label="간단히" menuItems={menuViewOptions} />
    </StoryStage>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/** 버튼을 누르면 보기 메뉴(범주, 그리드, 간단히)가 열리고, Esc를 누르면 닫힌다 */
export const Open: Story = {
  render: () => <ViewMenuStage />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('처음에는 메뉴가 닫혀 있다', async () => {
      await expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument();
    });

    await step('버튼을 누르면 메뉴가 열려 범주, 그리드, 간단히가 보인다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '보기: 간단히' }));
      await expect(
        await screen.findByRole('menuitemcheckbox', { name: '범주' }),
      ).toBeInTheDocument();
      await expect(screen.getByRole('menuitemcheckbox', { name: '그리드' })).toBeInTheDocument();
      await expect(screen.getByRole('menuitemcheckbox', { name: '간단히' })).toBeInTheDocument();
    });

    await step('Esc를 누르면 메뉴가 닫힌다', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument();
      });
    });
  },
};
