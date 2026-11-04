import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';
import { StoryStage } from '@seojaewan/design-system/story';

import { ChromeImageViewer } from './chrome-image-viewer';

// 피그마 Chrome/ImageViewer의 변형 속성 값이다(정규화한 이름).
const LAYOUTS = ['wide', 'narrow'] as const;

type FigmaArgs = {
  layout: (typeof LAYOUTS)[number];
};

const IMAGE_CAPTION = 'Bloom 배경화면';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 조립 스토리는 피그마와 크기를 맞추지 않으므로, 앱의 페이지 영역처럼
// 화면 전체 무대(StoryStage fill)를 덮고, 이미지는 앱과 같이 영역 안에 맞추되 원본보다 키우지 않는다.
const meta = {
  title: 'Patterns/Chrome/ImageViewer',
  parameters: { layout: 'fullscreen' },
  args: { layout: 'wide' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  render: (args) => (
    <StoryStage placement="fill">
      <ChromeImageViewer
        layout={args.layout}
        className="absolute inset-spacing-none"
        caption={IMAGE_CAPTION}
        image={
          <ImageAsset
            name="images/wallpaper-bloom"
            alt={IMAGE_CAPTION}
            className="max-h-full min-h-size-none max-w-full object-contain"
          />
        }
      />
    </StoryStage>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
