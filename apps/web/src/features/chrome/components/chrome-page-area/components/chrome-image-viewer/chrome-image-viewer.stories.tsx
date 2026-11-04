import imageViewerExport from '@figma/patterns/chrome/image-viewer/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { getImageAsset, ImageAsset, type ImageAssetName } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { ChromeImageViewer } from './chrome-image-viewer';

// 피그마 Chrome/ImageViewer의 변형 속성 값이다(정규화한 이름).
const LAYOUTS = ['wide', 'narrow'] as const;

type FigmaArgs = {
  layout: (typeof LAYOUTS)[number];
};

const IMAGE_CAPTION = 'Bloom 배경화면';

// 동작 스토리가 쓰는 이미지다. 비율이 다른 자산으로 맞춤 규칙을 확인한다.
// 가로로 긴 것(수식, 약 3.9:1), 영역보다 큰 배경화면(3840×2400), 영역보다 작은 것(앱 아이콘 256×256)이다.
const WIDE_IMAGE: ImageAssetName = 'images/equation-quadratic-formula';
const LARGE_IMAGE: ImageAssetName = 'images/wallpaper-bloom';
const SMALL_IMAGE: ImageAssetName = 'images/app-chrome';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 크기는 FigmaFrame이 피그마 루트 크기로 준다.
// 피그마 `@runtime 영역 안에 맞추되 원본보다 키우지 않는다`는 아래 동작 스토리가 비율이 다른 이미지로 확인한다.
const meta = {
  title: 'Patterns/Chrome/ImageViewer',
  parameters: { layout: 'fullscreen' },
  args: { layout: 'wide' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  decorators: [figmaFrame(imageViewerExport)],
  render: (args) => (
    <ChromeImageViewer
      layout={args.layout}
      caption={IMAGE_CAPTION}
      image={<ImageAsset name={LARGE_IMAGE} alt={IMAGE_CAPTION} />}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// @codocs [[Chrome:글 화면]]
/** 가로로 긴 이미지가 영역 너비보다 넓으면 너비에 맞추고 비율을 지킨다(좁은 창) */
export const WideImageFitsWidth: Story = {
  args: { layout: 'narrow' },
  render: (args) => (
    <ChromeImageViewer
      layout={args.layout}
      caption={IMAGE_CAPTION}
      image={<ImageAsset name={WIDE_IMAGE} alt={IMAGE_CAPTION} />}
    />
  ),
  play: async ({ canvasElement }) => {
    const { image, stage } = await getImageAndStage(canvasElement);
    const original = getImageAsset(WIDE_IMAGE);
    await expect(image.width).toBeCloseTo(stage.width, 0);
    await expect(image.width).toBeLessThan(original.width);
    await expect(image.width / image.height).toBeCloseTo(original.width / original.height, 1);
  },
};

// @codocs [[Chrome:글 화면]]
/** 영역보다 큰 이미지가 영역 높이를 넘으면 높이에 맞춘다(넓은 창에서 영역은 가로로 더 길다) */
export const LargeImageFitsHeight: Story = {
  play: async ({ canvasElement }) => {
    const { image, stage } = await getImageAndStage(canvasElement);
    const original = getImageAsset(LARGE_IMAGE);
    await expect(image.height).toBeLessThanOrEqual(stage.height);
    await expect(image.height).toBeLessThan(original.height);
    await expect(image.width).toBeLessThanOrEqual(stage.width);
  },
};

// @codocs [[Chrome:글 화면]]
/** 영역보다 작은 이미지는 원본보다 키우지 않는다 */
export const SmallImageStaysOriginal: Story = {
  render: (args) => (
    <ChromeImageViewer
      layout={args.layout}
      caption={IMAGE_CAPTION}
      image={<ImageAsset name={SMALL_IMAGE} alt={IMAGE_CAPTION} />}
    />
  ),
  play: async ({ canvasElement }) => {
    const { image } = await getImageAndStage(canvasElement);
    const original = getImageAsset(SMALL_IMAGE);
    await expect(image.width).toBe(original.width);
    await expect(image.height).toBe(original.height);
  },
};

/**
 * 크게 보는 이미지와 그 이미지를 맞추는 영역(이미지 칸)의 크기를 잰다.
 * @param canvasElement 스토리 캔버스
 * @returns 이미지와 영역의 크기
 */
async function getImageAndStage(
  canvasElement: HTMLElement,
): Promise<{ image: DOMRect; stage: DOMRect }> {
  const imageElement = await within(canvasElement).findByRole('img', { name: IMAGE_CAPTION });
  const stageElement = imageElement.parentElement;
  if (stageElement === null) {
    throw new Error('이미지 칸이 없다');
  }
  return {
    image: imageElement.getBoundingClientRect(),
    stage: stageElement.getBoundingClientRect(),
  };
}
