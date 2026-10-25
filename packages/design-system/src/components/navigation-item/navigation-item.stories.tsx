import type { Meta, StoryObj } from '@storybook/react-vite';

import { NavigationItem } from './navigation-item';

// 피그마 Item icon 속성의 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.png', import.meta.url).href;

// 피그마 NavigationItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const EXPANDS = ['none', 'collapsed', 'expanded'] as const;
const STATES = ['rest', 'hover', 'selected'] as const;
const LEVELS = ['0', '1', '2', '3'] as const;

type ParityArgs = {
  expand: (typeof EXPANDS)[number];
  state: (typeof STATES)[number];
  level: (typeof LEVELS)[number];
  /** 피그마 TEXT 속성 Label */
  label: string;
};

const meta = {
  title: 'Components/NavigationItem',
  // 글자는 피그마 Label 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { expand: 'none', state: 'rest', level: '0', label: '항목 이름' },
  argTypes: {
    expand: { control: 'inline-radio', options: EXPANDS },
    state: { control: 'inline-radio', options: STATES },
    level: { control: 'inline-radio', options: LEVELS },
    label: { control: 'text' },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 240으로 감싼다([[디자인 시스템:컴포넌트 조립 규칙]]).
  render: (args) => (
    <div className="w-240">
      <NavigationItem
        expand={args.expand}
        selected={args.state === 'selected'}
        level={Number(args.level) as 0 | 1 | 2 | 3}
        label={args.label}
        icon={<img src={folderIcon} alt="" className="size-icon-16 object-contain" />}
      />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
