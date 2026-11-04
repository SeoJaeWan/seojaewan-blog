import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { StoryStage } from '@seojaewan/design-system/story';

import { SnapLayoutMenu } from './snap-layout-menu';

// 동작 스토리가 칸을 골랐는지 보는 함수
const handleStoryZoneSelect = fn();

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립은 선택지를 닫은 모습이라 Figma 스토리도 닫은 채로 그린다.
// 선택지는 버튼 아래 가운데로 버튼보다 넓게 열리므로 캔버스 전체를 쓰고, 버튼 자리(피그마 노드)를 캡처 대상으로 표시한다.
const meta = {
  title: 'Patterns/Window/SnapLayoutMenu',
  parameters: { layout: 'fullscreen' },
  args: { onSelectZone: handleStoryZoneSelect },
  render: (args) => (
    <StoryStage placement="top-center" target>
      <SnapLayoutMenu {...args} />
    </StoryStage>
  ),
} satisfies Meta<typeof SnapLayoutMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/** 최대화 버튼에 마우스를 올리면 선택지(Half, Two thirds, Half quarter, Quad)가 열리고, 칸을 고르면 알리고 닫는다 */
export const Hover: Story = {
  beforeEach: () => {
    handleStoryZoneSelect.mockClear();
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('처음에는 선택지가 닫혀 있다', async () => {
      await expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    await step('마우스를 올리면 레이아웃 넷이 열린다', async () => {
      await userEvent.hover(canvas.getByRole('button', { name: '최대화' }));
      await waitFor(async () => {
        await expect(screen.getByRole('group', { name: '반반' })).toBeVisible();
      });
      await expect(screen.getByRole('group', { name: '3분의 2와 3분의 1' })).toBeVisible();
      await expect(screen.getByRole('group', { name: '절반과 4분의 1 두 칸' })).toBeVisible();
      await expect(screen.getByRole('group', { name: '4분할' })).toBeVisible();
    });

    await step('칸을 고르면 레이아웃과 칸 번호를 알리고 닫는다', async () => {
      const quad = screen.getByRole('group', { name: '4분할' });
      await userEvent.click(within(quad).getByRole('button', { name: '오른쪽 아래 4분의 1' }));
      await expect(handleStoryZoneSelect).toHaveBeenCalledWith('quad', 3);
      await waitFor(async () => {
        await expect(screen.queryByRole('group')).not.toBeInTheDocument();
      });
    });
  },
};
