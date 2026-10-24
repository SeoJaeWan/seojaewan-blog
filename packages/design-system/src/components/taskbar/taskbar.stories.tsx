import type { Meta, StoryObj } from '@storybook/react-vite';

import { Taskbar } from './taskbar';

// 피그마 Taskbar의 변형 속성 값이다(정규화한 이름).
const SEARCHES = ['box', 'button'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  search: (typeof SEARCHES)[number];
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Taskbar',
  // 캡처 화면 너비(1280)가 미리보기 너비와 같아, 기본 여백(16px)을 두면 오른쪽 끝이 화면 밖으로 잘린다.
  parameters: { layout: 'fullscreen' },
  args: { search: 'box', material: 'acrylic' },
  argTypes: {
    search: { control: 'inline-radio', options: SEARCHES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  render: (args) => (
    // Taskbar는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비(1280)로 감싼다.
    // 컴포넌트는 슬롯을 채우지 않으므로 Apps 슬롯은 비워 둔다.
    <div className="w-1280">
      <Taskbar search={args.search} material={args.material} />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
