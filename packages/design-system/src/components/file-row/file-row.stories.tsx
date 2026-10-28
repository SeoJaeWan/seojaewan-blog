import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileRow } from './file-row';

// 피그마 FileRow Icon 속성의 기본 인스턴스(폴더 이미지)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 FileRow의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로, Focused는 Tab 키로 재현한다.
const VIEWS = ['default', 'recycle-bin'] as const;
const STATES = ['rest', 'hover', 'selected', 'focused', 'rename', 'cut', 'cut-selected'] as const;

type ParityArgs = {
  view: (typeof VIEWS)[number];
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
  /** 피그마 TEXT 속성 Original location */
  originalLocation: string;
  /** 피그마 TEXT 속성 Deleted date */
  deletedDate: string;
};

const meta = {
  title: 'Components/FileRow',
  parameters: { layout: 'padded' },
  // 글자는 피그마 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: {
    view: 'default',
    state: 'rest',
    name: '파일 이름',
    date: '수정한 날짜',
    type: '유형',
    location: '위치',
    showLocation: false,
    originalLocation: '원래 위치',
    deletedDate: '삭제한 날짜',
  },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    state: { control: 'select', options: STATES },
    name: { control: 'text' },
    date: { control: 'text' },
    type: { control: 'text' },
    location: { control: 'text' },
    showLocation: { control: 'boolean' },
    originalLocation: { control: 'text' },
    deletedDate: { control: 'text' },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 840으로 감싼다([[디자인 시스템:컴포넌트 조립 규칙]]).
  render: (args) => (
    <div className="w-840">
      {/* Focused는 캡처 도구가 Tab으로 포커스를 옮기므로 줄이 포커스를 받을 수 있게 한다. 선은 :focus-visible로 그린다. */}
      <FileRow
        tabIndex={0}
        view={args.view}
        name={args.name}
        date={args.date}
        type={args.type}
        location={args.location}
        showLocation={args.showLocation}
        originalLocation={args.originalLocation}
        deletedDate={args.deletedDate}
        icon={<img src={folderIcon} alt="" className="size-icon-16 object-contain" />}
        selected={args.state === 'selected' || args.state === 'cut-selected'}
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
