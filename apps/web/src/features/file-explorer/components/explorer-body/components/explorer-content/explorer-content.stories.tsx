import contentExport from '@figma/patterns/explorer/content/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { FOLDER_LOCATION_ICON } from '@/features/file-explorer/components/explorer-window/story-data';
import { getExplorerWindowParts } from '@/features/file-explorer/components/explorer-window/story-explorer-window-parts';

import { ExplorerContent } from './explorer-content';
import { ADDRESS_EDIT_PATH, STATUS_BAR_TEXT } from './story-data';

// 피그마 Explorer/Content의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const ADDRESSES = ['rest', 'editing'] as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
  address: (typeof ADDRESSES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 본문은 크기를 갖지 않고 창이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다.
// 본문 바탕(LayerSurface) 안 탐색 창에는 실제 NavigationItem(탐색기 창 스토리와 같은 Blog 폴더 트리)을 넣는다.
// 위치 칸·명령·항목 자리는 피그마 조립처럼 비워 둔다(내용은 Window/Explorer가 채운다).
// Address=Editing은 주소 줄 경로가 경로 글자 입력칸으로 바뀐 모습이다. 입력칸에는 피그마 조립과 같은 경로 글자를 넣는다.
const meta = {
  title: 'Patterns/Explorer/Content',
  args: { device: 'desktop', address: 'rest' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    address: { control: 'inline-radio', options: ADDRESSES },
  },
  decorators: [figmaFrame(contentExport)],
  render: (args) => (
    <ExplorerContent
      device={args.device}
      locationIcon={<ImageAsset name={FOLDER_LOCATION_ICON} />}
      isBreadcrumbEditing={args.address === 'editing'}
      breadcrumbEditFieldProps={{ defaultValue: ADDRESS_EDIT_PATH, 'aria-label': '주소' }}
      navigation={
        getExplorerWindowParts({ device: args.device, folder: 'blog', selection: 'none' })
          .navigation
      }
      itemCount={STATUS_BAR_TEXT.itemCount}
      selection={STATUS_BAR_TEXT.selection}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
