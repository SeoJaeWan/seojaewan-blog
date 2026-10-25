import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerContent } from './explorer-content';

// 피그마 Breadcrumb `Location icon` 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.png', import.meta.url).href;

// 피그마 ExplorerContent의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 컴포넌트는 크기를 갖지 않고 쓰는 곳(창)이 정한다. 피그마 원본의 미리보기 크기를 기기별로 준다.
const previewSizeClassNames = {
  desktop: 'w-798 h-458',
  mobile: 'w-388 h-716',
} as const satisfies Record<(typeof DEVICES)[number], string>;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

const meta = {
  title: 'Components/ExplorerContent',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  // 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯의 미리보기 크기만 칠 없는 빈 요소로 채운다.
  // 상태 줄 글자는 넘기지 않아 안쪽 ExplorerStatusBar의 피그마 기본값(항목 개수, 선택 정보)을 쓴다.
  render: (args) => (
    <ExplorerContent
      device={args.device}
      className={previewSizeClassNames[args.device]}
      locationIcon={<img src={folderIcon} alt="" className="size-full object-contain" />}
      path={<div className="shrink-0" style={{ width: 100, height: 100 }} />}
      commands={<div className="w-full" style={{ height: 32 }} />}
      navigation={<div className="shrink-0" style={{ width: 240, height: 192 }} />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
