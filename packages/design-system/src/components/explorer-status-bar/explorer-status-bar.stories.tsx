import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerStatusBar } from './explorer-status-bar';

// 피그마 ExplorerStatusBar의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 컴포넌트는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비를 기기별로 감싼다.
const previewWidthClassNames = {
  desktop: 'w-798',
  mobile: 'w-388',
} as const satisfies Record<(typeof DEVICES)[number], string>;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

const meta = {
  title: 'Components/ExplorerStatusBar',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    // 캡처 대상은 감싼 요소(#storybook-root의 첫 요소)다. 컴포넌트와 같은 크기라 찍히는 범위가 같다.
    <div className={previewWidthClassNames[args.device]}>
      <ExplorerStatusBar device={args.device} />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
