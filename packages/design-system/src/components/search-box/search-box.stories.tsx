import type { Meta, StoryObj } from '@storybook/react-vite';

import { ParityWrong } from '../parity-wrong';
import { SearchBox } from './search-box';

// 피그마 SearchBox의 변형 속성 값이다(정규화한 이름).
const APPEARANCES = ['default', 'pill'] as const;
const STATES = ['rest', 'hover', 'focused', 'disabled'] as const;

type ParityArgs = {
  appearance: (typeof APPEARANCES)[number];
  filled: boolean;
  state: (typeof STATES)[number];
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
    <>
      <SearchBox
        // 입력값을 바꾸면 처음 값부터 다시 그리도록 key를 바꾼다.
        key={String(args.filled)}
        appearance={args.appearance}
        aria-label="검색"
        placeholder="검색"
        defaultValue={args.filled ? '리액트' : undefined}
        disabled={args.state === 'disabled'}
        // Tab으로 들어오면 브라우저가 입력값 전체를 선택한다. 피그마 Focused는 선택 없이 입력 중인 모양이라
        // 커서를 끝으로 옮겨 선택을 푼다(비교 스크립트는 커서를 숨기고 찍는다).
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
      />
      <ParityWrong component="search-box" />
    </>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Focused는 비교 스크립트가 마우스·키보드로 재현한다.
export const Parity: Story = {};
