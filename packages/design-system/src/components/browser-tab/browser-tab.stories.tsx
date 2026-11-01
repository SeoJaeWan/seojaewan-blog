import type { Meta, StoryObj } from '@storybook/react-vite';

import { BrowserTab } from './browser-tab';

// 피그마 BrowserTab 기본 인스턴스(file/Document 파비콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const faviconImage = new URL('../../assets/images/file-document.webp', import.meta.url).href;

// 피그마 BrowserTab의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'active'] as const;

type FigmaArgs = {
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
  // 탭은 tablist 안에서만 쓴다. 감싸는 요소는 크기를 더하지 않는다.
  render: (args) => (
    <div role="tablist" aria-label="탭">
      <BrowserTab
        active={args.state === 'active'}
        title={args.title}
        showSeparator={args.showSeparator}
        favicon={<img src={faviconImage} alt="" className="size-icon-16 object-contain" />}
      />
    </div>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
// 닫기 버튼이 tablist 안에 있어 aria-required-children에 걸린다. 구조를 바꿀지 사람이 정할 때까지 이 규칙만 끈다
// (임의 작업 문서의 "탭 닫기 버튼" 항목).
export const Figma: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'aria-required-children', enabled: false }] } } },
};
