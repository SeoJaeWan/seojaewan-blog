import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChromeNewTabSearch, type ChromeNewTabSuggestion } from './chrome-new-tab-search';

// 피그마 Chrome/NewTabSearch의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

// 피그마 `State=Open`의 입력 중인 글자와 추천 목록이다.
const NEW_TAB_QUERY = '리액트';
const newTabSuggestions = [
  { kind: 'post', title: '리액트 19 훅 정리' },
  { kind: 'post', title: '리액트 서버 컴포넌트 이해하기' },
  { kind: 'search', title: '리액트 검색' },
] as const satisfies readonly ChromeNewTabSuggestion[];

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 추천 목록은 트리거 밖으로 뜨는 팝업이라 루트(검색창)를 그대로 찍는다.
// 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
const meta = {
  title: 'Patterns/Chrome/NewTabSearch',
  parameters: { layout: 'padded' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) =>
    args.state === 'open' ? (
      <ChromeNewTabSearch open defaultValue={NEW_TAB_QUERY} suggestions={newTabSuggestions} />
    ) : (
      <ChromeNewTabSearch />
    ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
