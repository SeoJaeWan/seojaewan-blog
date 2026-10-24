import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerTab } from './explorer-tab';

// 피그마 ExplorerTab 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.png', import.meta.url).href;

// 피그마 ExplorerTab의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'selected'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
};

const meta = {
  title: 'Components/ExplorerTab',
  // 글자는 피그마 Title 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', title: '폴더 이름' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    title: { control: 'text' },
  },
  render: (args) => (
    <ExplorerTab
      selected={args.state === 'selected'}
      title={args.title}
      icon={<img src={folderIcon} alt="" className="size-icon-16 object-contain" />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
