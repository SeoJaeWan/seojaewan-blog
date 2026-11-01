import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ListItem } from './list-item';

// 피그마 Icon 속성의 기본 인스턴스(file/Document)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const documentIcon = new URL('../../assets/images/file-document.webp', import.meta.url).href;

// 피그마 ListItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const SIZES = ['compact', 'two-line'] as const;
const STATES = ['rest', 'hover', 'selected'] as const;

type FigmaArgs = {
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
      <div className="w-size-list-item-width">
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
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 제목만 있는 한 줄이다. 오른쪽 보조 글자는 showTrailing을 켜기 전에는 없고, compact는 부제를 받지 않는다 */
export const Default: Story = {
  render: () => (
    // @ts-expect-error subtitle은 size="two-line"에서만 받는다
    <ListItem icon={<i aria-hidden="true" />} subtitle="부제" />
  ),
  play: async ({ canvas, step }) => {
    await step('제목을 그린다', async () => {
      await expect(canvas.getByText('항목 이름')).toBeInTheDocument();
    });
    await step('보조 글자와 부제는 그리지 않는다', async () => {
      await expect(canvas.queryByText('부가 정보')).not.toBeInTheDocument();
      await expect(canvas.queryByText('부제')).not.toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 제목과 부제 두 줄이다. showSubtitle을 끄면 부제를 숨긴다 */
export const TwoLine: Story = {
  render: () => (
    <div className="flex flex-col">
      <ListItem size="two-line" icon={<i aria-hidden="true" />} title="보이는 부제" />
      <ListItem
        size="two-line"
        icon={<i aria-hidden="true" />}
        title="숨긴 부제"
        subtitle="숨겨진 설명"
        showSubtitle={false}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('보조 설명')).toBeInTheDocument();
    await expect(canvas.queryByText('숨겨진 설명')).not.toBeInTheDocument();
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** aria-selected는 option 역할에만 붙인다. 다른 역할이나 역할이 없는 줄은 선택돼도 붙이지 않는다 */
export const Selected: Story = {
  render: () => (
    <div className="flex flex-col">
      <div role="listbox" aria-label="선택 목록">
        <ListItem selected role="option" title="옵션" icon={<i aria-hidden="true" />} />
      </div>
      <ListItem selected role="button" tabIndex={0} title="버튼" icon={<i aria-hidden="true" />} />
      <ListItem selected title="일반" icon={<i aria-hidden="true" />} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('option', { name: '옵션' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByRole('button', { name: '버튼' })).not.toHaveAttribute('aria-selected');
    await expect(canvas.getByText('일반').closest('[aria-selected]')).toBeNull();
  },
};
