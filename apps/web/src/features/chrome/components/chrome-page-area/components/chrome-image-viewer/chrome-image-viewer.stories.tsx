import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { ChromeImageViewer } from './chrome-image-viewer';

// 피그마 Chrome/ImageViewer의 변형 속성 값이다(정규화한 이름).
const LAYOUTS = ['wide', 'narrow'] as const;

type FigmaArgs = {
  layout: (typeof LAYOUTS)[number];
};

// 덮는 페이지 영역은 크기를 갖지 않고 Chrome 창이 정하므로 피그마 원본 크기(1278×712, 388×720)로 그린다.
const SIZE_CLASS_NAMES = {
  wide: 'w-size-chrome-page-wide-width h-size-chrome-page-wide-height',
  narrow: 'w-size-chrome-page-narrow-width h-size-chrome-page-narrow-height',
} as const;

// 피그마 조립의 이미지 칸 크기다. wide는 800×500, narrow는 남은 너비 × 220이다.
const IMAGE_CLASS_NAMES = {
  wide: 'h-size-image-viewer-image-height w-size-image-viewer-image-width',
  narrow: 'h-size-image-viewer-narrow-image-height w-full',
} as const;

const IMAGE_CAPTION = 'Bloom 배경화면';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 이미지는 피그마처럼 배경화면 Bloom을 이미지 칸에 채워 넣는다.
const meta = {
  title: 'Patterns/Chrome/ImageViewer',
  args: { layout: 'wide' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  render: (args) => (
    <ChromeImageViewer
      layout={args.layout}
      className={SIZE_CLASS_NAMES[args.layout]}
      caption={IMAGE_CAPTION}
      image={
        <ImageAsset
          name="images/wallpaper-bloom"
          alt={IMAGE_CAPTION}
          className={`object-cover ${IMAGE_CLASS_NAMES[args.layout]}`}
        />
      }
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
