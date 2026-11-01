import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SnapPreview } from './snap-preview';

const meta = {
  title: 'Components/SnapPreview',
  // 부모가 크기를 정하는 컴포넌트라 코드에 크기가 없다. 피그마 원본 크기(952x1016)를 className으로 준다.
  render: () => <SnapPreview className="h-size-snap-preview-height w-size-snap-preview-width" />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형이 하나뿐이라 args 없이 그린다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 역할과 접근성 이름 같은 div 속성을 그대로 넘긴다 */
export const Default: Story = {
  render: () => (
    <SnapPreview
      role="img"
      aria-label="스냅 미리보기"
      className="h-size-story-md w-size-story-xl"
    />
  ),
  play: async ({ canvasElement, step }) => {
    await step('역할과 접근성 이름을 그대로 넘긴다', async () => {
      await expect(
        within(canvasElement).getByRole('img', { name: '스냅 미리보기' }),
      ).toBeInTheDocument();
    });
  },
};
