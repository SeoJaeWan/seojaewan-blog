import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileRow } from './file-row';

// 피그마 FileRow Icon 속성의 기본 인스턴스(폴더 이미지)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 FileRow의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = [
  'rest',
  'hover',
  'selected',
  'selected-focus',
  'rename',
  'cut',
  'cut-selected',
] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Name */
  name: string;
  /** 피그마 TEXT 속성 Date */
  date: string;
  /** 피그마 TEXT 속성 Type */
  type: string;
  /** 피그마 TEXT 속성 Location */
  location: string;
  /** 피그마 BOOLEAN 속성 Show location */
  showLocation: boolean;
};

const meta = {
  title: 'Components/FileRow',
  parameters: { layout: 'padded' },
  // 글자는 피그마 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: {
    state: 'rest',
    name: '파일 이름',
    date: '수정한 날짜',
    type: '유형',
    location: '위치',
    showLocation: false,
  },
  argTypes: {
    state: { control: 'select', options: STATES },
    name: { control: 'text' },
    date: { control: 'text' },
    type: { control: 'text' },
    location: { control: 'text' },
    showLocation: { control: 'boolean' },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 840으로 감싼다([[디자인 시스템:컴포넌트 조립 규칙]]).
  render: (args) => (
    <div className="w-840">
      <FileRow
        name={args.name}
        date={args.date}
        type={args.type}
        location={args.location}
        showLocation={args.showLocation}
        icon={<img src={folderIcon} alt="" className="size-icon-16 object-contain" />}
        selected={['selected', 'selected-focus', 'cut-selected'].includes(args.state)}
        focused={args.state === 'selected-focus'}
        cut={args.state === 'cut' || args.state === 'cut-selected'}
        renaming={args.state === 'rename'}
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
