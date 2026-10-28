import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChromeFindBar } from './chrome-find-bar';

// 피그마 Chrome/FindBar의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// 피그마 Chrome/FindBar 조립의 찾는 글자와 개수다.
const FIND_QUERY = '훅';
const FIND_COUNT = { current: 1, total: 3 } as const;

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. mobile은 도구 모음 아래 전체 폭이라 피그마 원본 너비(size/390)로 감싼다.
// 그림자가 있는 상자라 가운데 놓으면 소수 px 위치에 놓이므로 정수 위치(padded)에 둔다.
const meta = {
  title: 'Patterns/Chrome/FindBar',
  parameters: { layout: 'padded' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) =>
    args.device === 'mobile' ? (
      <div className="w-390">
        <ChromeFindBar
          device="mobile"
          defaultValue={FIND_QUERY}
          current={FIND_COUNT.current}
          total={FIND_COUNT.total}
        />
      </div>
    ) : (
      <ChromeFindBar
        device="desktop"
        defaultValue={FIND_QUERY}
        current={FIND_COUNT.current}
        total={FIND_COUNT.total}
      />
    ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
