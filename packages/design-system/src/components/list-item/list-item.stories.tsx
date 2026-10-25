import type { Meta, StoryObj } from '@storybook/react-vite';

import { ListItem } from './list-item';

// 피그마 Icon 속성의 기본 인스턴스(file/Document)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const documentIcon = new URL('../../assets/images/file-document.png', import.meta.url).href;

// 피그마 ListItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const SIZES = ['compact', 'two-line'] as const;
const STATES = ['rest', 'hover', 'selected'] as const;

type ParityArgs = {
  size: (typeof SIZES)[number];
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 TEXT 속성 Subtitle(Two-line만) */
  subtitle: string;
  /** 피그마 BOOLEAN 속성 Show subtitle(Two-line만) */
  showSubtitle: boolean;
  /** 피그마 TEXT 속성 Trailing */
  trailing: string;
  /** 피그마 BOOLEAN 속성 Show trailing */
  showTrailing: boolean;
};

const meta = {
  title: 'Components/ListItem',
  // 글자는 피그마 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: {
    size: 'compact',
    state: 'rest',
    title: '항목 이름',
    subtitle: '보조 설명',
    showSubtitle: true,
    trailing: '부가 정보',
    showTrailing: false,
  },
  argTypes: {
    size: { control: 'inline-radio', options: SIZES },
    state: { control: 'inline-radio', options: STATES },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    showSubtitle: { control: 'boolean' },
    trailing: { control: 'text' },
    showTrailing: { control: 'boolean' },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 400으로 감싼다([[디자인 시스템:컴포넌트 조립 규칙]]).
  render: (args) => {
    const common = {
      selected: args.state === 'selected',
      title: args.title,
      icon: <img src={documentIcon} alt="" className="size-full object-contain" />,
      trailing: args.trailing,
      showTrailing: args.showTrailing,
    };
    return (
      <div className="w-400">
        {args.size === 'two-line' ? (
          <ListItem
            {...common}
            size="two-line"
            subtitle={args.subtitle}
            showSubtitle={args.showSubtitle}
          />
        ) : (
          <ListItem {...common} />
        )}
      </div>
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
