import type { Meta, StoryObj } from '@storybook/react-vite';

import { ShellSurface } from './shell-surface';

// 피그마 ShellSurface의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  material: (typeof MATERIALS)[number];
  device: (typeof DEVICES)[number];
};

const meta = {
  title: 'Components/ShellSurface',
  // 피그마 변형이 640x720이라 캡처 화면(1280x720)과 높이가 같다. 기본 여백과 가운데 정렬 없이 왼쪽 위부터 그린다.
  parameters: { layout: 'fullscreen' },
  args: { material: 'acrylic', device: 'desktop' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  // 컴포넌트의 Content 슬롯은 언제나 비어 있다.
  render: (args) => (
    // 그림자가 화면 가장자리에서 잘리지 않도록 24px 바깥 여백을 두고, 캡처 대상은 ShellSurface로 표시한다.
    // 데스크톱은 높이(720)가 캡처 화면 높이와 같아 위쪽 여백을 두면 아래쪽 모서리와 테두리가 화면 밖으로 잘린다. 위쪽 여백은 뺀다.
    <div className={args.device === 'desktop' ? 'px-24' : 'p-24'}>
      <ShellSurface material={args.material} device={args.device} data-parity-target />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
