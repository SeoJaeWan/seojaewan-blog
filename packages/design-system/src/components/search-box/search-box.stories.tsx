import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { SearchBox } from './search-box';

// 피그마 SearchBox의 변형 속성 값이다(정규화한 이름).
const APPEARANCES = ['default', 'pill', 'taskbar', 'web'] as const;
const STATES = ['rest', 'hover', 'focused', 'pressed', 'disabled'] as const;

// SearchBox는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비를 모양별로 감싼다.
const previewWidthClassNames = {
  default: 'w-240',
  pill: 'w-320',
  taskbar: 'w-220',
  web: 'w-320',
} as const satisfies Record<(typeof APPEARANCES)[number], string>;

type FigmaArgs = {
  appearance: (typeof APPEARANCES)[number];
  filled: boolean;
  state: (typeof STATES)[number];
  /** 동작 스토리에서 입력을 확인하는 핸들러 */
  onChange?: () => void;
};

const meta = {
  title: 'Components/SearchBox',
  args: { appearance: 'default', filled: false, state: 'rest' },
  argTypes: {
    appearance: { control: 'inline-radio', options: APPEARANCES },
    filled: { control: 'boolean' },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    // 캡처 대상은 감싼 요소(#storybook-root의 첫 요소)다. SearchBox와 같은 크기라 찍히는 범위가 같다.
    <div className={previewWidthClassNames[args.appearance]}>
      <SearchBox
        // 입력값을 바꾸면 처음 값부터 다시 그리도록 key를 바꾼다.
        key={String(args.filled)}
        appearance={args.appearance}
        aria-label="검색"
        placeholder="검색"
        defaultValue={args.filled ? '검색어' : undefined}
        disabled={args.state === 'disabled'}
        // Tab으로 들어오면 브라우저가 입력값 전체를 선택한다. 피그마 Focused는 선택 없이 입력 중인 모양이라
        // 커서를 끝으로 옮겨 선택을 푼다(캡처 도구는 커서를 숨기고 찍는다).
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
      />
    </div>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 접근성 이름을 갖는 검색 입력창이다. Tab으로 포커스를 받고, 입력하면 값이 바뀌고 onChange를 부른다 */
export const Default: Story = {
  args: { onChange: fn() },
  render: ({ onChange: handleChange }) => (
    <SearchBox appearance="pill" aria-label="검색" placeholder="검색" onChange={handleChange} />
  ),
  play: async ({ args, canvas, userEvent, step }) => {
    const searchbox = canvas.getByRole('searchbox', { name: '검색' });

    await step('접근성 이름과 안내 글자를 갖는다', async () => {
      await expect(searchbox).toHaveAttribute('placeholder', '검색');
    });

    await step('Tab으로 포커스를 받는다', async () => {
      await userEvent.tab();
      await expect(searchbox).toHaveFocus();
    });

    await step('입력하면 값이 바뀌고 onChange를 부른다', async () => {
      await userEvent.keyboard('리액트');
      await expect(searchbox).toHaveValue('리액트');
      await expect(args.onChange).toHaveBeenCalled();
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 비활성이면 입력할 수 없다 */
export const Disabled: Story = {
  render: () => <SearchBox aria-label="검색" disabled defaultValue="리액트" />,
  play: async ({ canvas, userEvent }) => {
    const searchbox = canvas.getByRole('searchbox', { name: '검색' });

    await userEvent.type(searchbox, '뷰');

    await expect(searchbox).toBeDisabled();
    await expect(searchbox).toHaveValue('리액트');
  },
};
