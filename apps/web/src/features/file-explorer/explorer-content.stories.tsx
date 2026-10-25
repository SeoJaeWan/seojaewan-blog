import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { ExplorerContent } from './explorer-content';
import { EMPTY_SLOT_SIZE, FOLDER_LOCATION_ICON, STATUS_BAR_TEXT } from './story-data';

// 피그마 Explorer/Content의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 본문은 크기를 갖지 않고 창이 정하므로 피그마 원본 크기(size/798×458, size/388×716)로 감싸 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-798 h-458', mobile: 'w-388 h-716' } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 자리(Commands, items, Items)는 비워 두고,
// 피그마가 빈 슬롯에 남기는 미리보기 크기만 칠 없는 빈 요소로 채운다.
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
      path={<div className="shrink-0" style={EMPTY_SLOT_SIZE.breadcrumbItems} />}
      navigation={<div style={EMPTY_SLOT_SIZE.navigationItems} />}
      itemCount={STATUS_BAR_TEXT.itemCount}
      selection={STATUS_BAR_TEXT.selection}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
