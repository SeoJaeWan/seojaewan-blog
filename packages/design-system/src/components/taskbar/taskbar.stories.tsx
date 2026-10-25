import type { Meta, StoryObj } from '@storybook/react-vite';

import { Taskbar } from './taskbar';

// 피그마 Taskbar의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Taskbar',
  // 캡처 화면 너비(1280)가 미리보기 너비와 같아, 기본 여백(16px)을 두면 오른쪽 끝이 화면 밖으로 잘린다.
  parameters: { layout: 'fullscreen' },
  args: { material: 'acrylic' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
  },
  render: (args) => (
    // Taskbar는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비(1280)로 감싼다.
    // 컴포넌트의 슬롯은 언제나 비어 있으므로, 피그마 빈 Center 슬롯이 차지하는 너비 308만 칠 없는 빈 내용으로 둔다.
    // Right 슬롯은 남은 너비를 채우므로 비워 둔다.
    <div className="w-1280">
      <Taskbar
        material={args.material}
        center={<div className="h-full" style={{ width: 308 }} />}
      />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
