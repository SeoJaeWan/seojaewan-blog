import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ImageAsset } from '../image-asset/image-asset';
import { Figure } from './figure';

const meta = {
  title: 'Components/Figure',
  // 이미지는 글마다 달라 필수 prop이므로, Figma 스토리가 피그마 기본 인스턴스(wallpaper/Bloom)를 넣는다.
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다. 피그마의 이미지 칸은 720x420 고정이고
  // 코드는 이미지 높이를 따르므로 같은 높이를 인라인으로 준다(토큰에 없는 값).
  render: () => (
    <div className="w-720">
      <Figure image={<ImageAsset name="images/wallpaper-bloom" style={{ height: 420 }} />} />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나뿐이다.
export const Figma: Story = {};

// 이미지에 대체 글자를 달고 캡션을 바꾼 모습이다.
// @codocs [[Notion 블록:모양]]
export const WithCaption: Story = {
  render: () => (
    <div className="w-720">
      <Figure
        image={<ImageAsset name="images/wallpaper-bloom" alt="그림" style={{ height: 420 }} />}
        caption="설명"
      />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[Notion 블록:모양]]
    await step('image와 caption으로 받은 글을 그린다', async () => {
      await expect(canvas.getByRole('img', { name: '그림' })).toBeInTheDocument();
      await expect(canvas.getByText('설명')).toBeInTheDocument();
    });
  },
};

// 캡션을 숨긴 모습이다.
// @codocs [[Notion 블록:모양]]
export const WithoutCaption: Story = {
  render: () => (
    <div className="w-720">
      <Figure
        showCaption={false}
        image={<ImageAsset name="images/wallpaper-bloom" style={{ height: 420 }} />}
      />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 블록:모양]]
    await step('showCaption이 false면 캡션을 그리지 않는다', async () => {
      await expect(within(canvasElement).queryByText('캡션')).not.toBeInTheDocument();
    });
  },
};
