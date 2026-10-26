import type { Meta, StoryObj } from '@storybook/react-vite';

import { BrowserTab } from './browser-tab';

// 피그마 BrowserTab 기본 인스턴스(file/Document 파비콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const faviconImage = new URL('../../assets/images/file-document.webp', import.meta.url).href;

// 피그마 BrowserTab의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'active'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 불리언 속성 Show separator */
  showSeparator: boolean;
};

const meta = {
  title: 'Components/BrowserTab',
  // 글자는 피그마 Title 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', title: '페이지 제목', showSeparator: true },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    title: { control: 'text' },
    showSeparator: { control: 'boolean' },
  },
  render: (args) => (
    <BrowserTab
      active={args.state === 'active'}
      title={args.title}
      showSeparator={args.showSeparator}
      favicon={<img src={faviconImage} alt="" className="size-icon-16 object-contain" />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
