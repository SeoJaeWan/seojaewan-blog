import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { FOLDER_LOCATION_ICON } from '@/features/file-explorer/components/explorer-window/story-data';

import { ExplorerContent } from './explorer-content';
import { STATUS_BAR_TEXT } from './story-data';

// 피그마 Explorer/Content의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 본문은 크기를 갖지 않고 창이 정하므로 피그마 원본 크기(size/798×458, size/388×716)로 감싸 그린다.
const SIZE_CLASS_NAMES = {
  desktop: 'w-size-explorer-content-width h-size-explorer-content-height',
  mobile: 'w-size-window-mobile-content-width h-size-explorer-mobile-content-height',
} as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 자리(Commands, items, Items)는 비워 둔다.
// 피그마가 빈 슬롯에 남기는 미리보기 크기 중 토큰이 있는 것(NavigationPane items 너비 = NavigationItem 너비)만
// 칠 없는 빈 요소로 채운다. Breadcrumb Items(114×24)와 items 높이(192)는 토큰이 없고, 두 변형 모두 빈 HUG라
// 단독 캡처하지 않는다.
const meta = {
  title: 'Patterns/Explorer/Content',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    <ExplorerContent
      device={args.device}
      className={SIZE_CLASS_NAMES[args.device]}
      locationIcon={<ImageAsset name={FOLDER_LOCATION_ICON} className="size-full object-contain" />}
      navigation={<div className="w-size-navigation-item-width" />}
      itemCount={STATUS_BAR_TEXT.itemCount}
      selection={STATUS_BAR_TEXT.selection}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
