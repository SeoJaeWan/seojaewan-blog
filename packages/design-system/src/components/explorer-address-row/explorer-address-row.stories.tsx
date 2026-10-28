import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerAddressRow } from './explorer-address-row';

// 피그마 Breadcrumb `Location icon` 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 ExplorerAddressRow의 변형 속성 값이다(정규화한 이름). desktop에는 search=open 변형이 없다.
const DEVICES = ['desktop', 'mobile'] as const;
const SEARCHES = ['closed', 'open'] as const;

// 컴포넌트는 너비를 갖지 않으므로 피그마 원본 너비로 감싸 그린다.
const WIDTHS = { desktop: 798, mobile: 388 } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
  search: (typeof SEARCHES)[number];
};

const meta = {
  title: 'Components/ExplorerAddressRow',
  parameters: { layout: 'padded' },
  args: { device: 'desktop', search: 'closed' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    search: { control: 'inline-radio', options: SEARCHES },
  },
  render: (args) => (
    <div style={{ width: WIDTHS[args.device] }}>
      <ExplorerAddressRow
        device={args.device}
        search={args.search}
        locationIcon={<img src={folderIcon} alt="" className="size-full object-contain" />}
      >
        {/* 피그마 Items 슬롯의 미리보기 크기다. 칠 없는 빈 요소로 채운다 */}
        <div className="shrink-0" style={{ width: 100, height: 100 }} />
      </ExplorerAddressRow>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
