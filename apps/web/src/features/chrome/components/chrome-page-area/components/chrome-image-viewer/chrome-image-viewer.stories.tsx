import imageViewerExport from '@figma/patterns/chrome/image-viewer/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { ChromeImageViewer } from './chrome-image-viewer';

// 피그마 Chrome/ImageViewer의 변형 속성 값이다(정규화한 이름).
const LAYOUTS = ['wide', 'narrow'] as const;

type FigmaArgs = {
  layout: (typeof LAYOUTS)[number];
};

const IMAGE_CAPTION = 'Bloom 배경화면';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 덮는 페이지 영역은 크기를 갖지 않고 Chrome 창이 정하므로
// FigmaFrame이 피그마 원본 크기(size/chrome-page/*)로 감싼다.
// 이미지는 피그마처럼 배경화면 Bloom이고, 크기는 제품처럼 크게 보기가 정한다(영역 안에 맞추되 원본보다 키우지 않음).
const meta = {
  title: 'Patterns/Chrome/ImageViewer',
  args: { layout: 'wide' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  decorators: [figmaFrame(imageViewerExport)],
  render: (args) => (
    <ChromeImageViewer
      layout={args.layout}
      caption={IMAGE_CAPTION}
      image={<ImageAsset name="images/wallpaper-bloom" alt={IMAGE_CAPTION} />}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
