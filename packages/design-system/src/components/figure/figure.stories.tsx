import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import figureExport from '../../../figma/components/figure/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { ImageAsset } from '../image-asset/image-asset';
import { Figure } from './figure';

// 피그마 Figure State 변형 값이다(정규화한 이름).
const STATES = ['loaded', 'loading', 'failed'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/Figure',
  args: { state: 'loaded' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  // 이미지는 글마다 달라 필수 prop이므로, Figma 스토리가 피그마 기본 인스턴스(wallpaper/Bloom)를 넣는다.
  // 너비는 `@sample-size width` 견본 크기라 FigmaFrame이 export.json 숫자(720)로 감싼다. 이미지 높이는 정하지 않고 자산 원본 비율로 그린다.
  decorators: [figmaFrame(figureExport)],
  render: (args) => (
    <Figure state={args.state} image={<ImageAsset name="images/wallpaper-bloom" />} />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(State)를 args 하나로 고른다.
export const Figma: Story = {};

// 이미지에 대체 글자를 달고 캡션을 바꾼 모습이다.
// @codocs [[Notion 블록:모양]]
export const WithCaption: Story = {
  render: () => (
    <Figure image={<ImageAsset name="images/wallpaper-bloom" alt="그림" />} caption="설명" />
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
  render: () => <Figure hasCaption={false} image={<ImageAsset name="images/wallpaper-bloom" />} />,
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 블록:모양]]
    await step('hasCaption이 false면 캡션을 그리지 않는다', async () => {
      await expect(within(canvasElement).queryByText('캡션')).not.toBeInTheDocument();
    });
  },
};

// 받는 중에는 이미지 대신 회색 칸과 반짝임 칠을 그린다.
// @codocs [[Notion 이미지 제공:로딩 표시]]
export const Loading: Story = {
  render: () => (
    <Figure state="loading" image={<ImageAsset name="images/wallpaper-bloom" alt="그림" />} />
  ),
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 이미지 제공:로딩 표시]]
    await step('이미지를 그리지 않고 받는 중임을 알린다', async () => {
      await expect(within(canvasElement).queryByRole('img')).not.toBeInTheDocument();
      await expect(canvasElement.querySelector('figure')).toHaveAttribute('aria-busy', 'true');
    });
  },
};

// 받지 못하면 반짝임 없는 회색 칸으로 남긴다.
// @codocs [[Notion 이미지 제공:로딩 표시]]
export const Failed: Story = {
  render: () => (
    <Figure state="failed" image={<ImageAsset name="images/wallpaper-bloom" alt="그림" />} />
  ),
  play: async ({ canvasElement, step }) => {
    // @codocs [[Notion 이미지 제공:로딩 표시]]
    await step('깨진 이미지 없이 회색 칸만 그린다', async () => {
      await expect(within(canvasElement).queryByRole('img')).not.toBeInTheDocument();
      await expect(canvasElement.querySelector('figure')).not.toHaveAttribute('aria-busy');
    });
  },
};
