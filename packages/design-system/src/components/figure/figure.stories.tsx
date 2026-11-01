import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ImageAsset } from '../image-asset/image-asset';
import { Figure } from './figure';

const meta = {
  title: 'Components/Figure',
  // 이미지는 글마다 달라 필수 prop이므로, Figma 스토리가 피그마 기본 인스턴스(wallpaper/Bloom)를 넣는다.
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다. 이미지 높이는 정하지 않고 자산 원본 비율로 그린다.
  render: () => (
    <div className="w-size-post-width">
      <Figure image={<ImageAsset name="images/wallpaper-bloom" />} />
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
    <div className="w-size-post-width">
      <Figure image={<ImageAsset name="images/wallpaper-bloom" alt="그림" />} caption="설명" />
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
    <div className="w-size-post-width">
      <Figure showCaption={false} image={<ImageAsset name="images/wallpaper-bloom" />} />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 블록:모양]]
    await step('showCaption이 false면 캡션을 그리지 않는다', async () => {
      await expect(within(canvasElement).queryByText('캡션')).not.toBeInTheDocument();
    });
  },
};
