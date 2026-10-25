import type { Meta, StoryObj } from '@storybook/react-vite';

import { AddressBar } from './address-bar';

// 피그마 AddressBar의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'focused', 'suggesting'] as const;

type ParityArgs = {
  /** 피그마 TEXT 속성 Query */
  query: string;
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 URL */
  url: string;
};

const meta = {
  title: 'Components/AddressBar',
  // 글자는 피그마 URL·Query 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { query: '검색어', state: 'rest', url: '웹 주소' },
  argTypes: {
    query: { control: 'text' },
    state: { control: 'inline-radio', options: STATES },
    url: { control: 'text' },
  },
  render: (args) => (
    // AddressBar는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비 640으로 감싼다.
    // 캡처 대상은 감싼 요소(#storybook-root의 첫 요소)다. AddressBar와 같은 크기라 찍히는 범위가 같다.
    <div className="w-640">
      <AddressBar
        // 상태나 글자를 바꾸면 처음 값부터 다시 그리도록 key를 바꾼다.
        key={`${args.state}-${args.url}-${args.query}`}
        aria-label="주소"
        url={args.url}
        query={args.query}
        suggesting={args.state === 'suggesting'}
      />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Parity: Story = {};
