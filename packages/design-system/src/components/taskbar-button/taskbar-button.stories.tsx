import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskbarButton } from './taskbar-button';

// 피그마 icon 속성의 기본 인스턴스(파일 탐색기 앱 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const appIcon = new URL('../../assets/images/app-file-explorer.png', import.meta.url).href;

// 피그마 TaskbarButton의 변형 속성 값이다(정규화한 이름). Hover·Pressed는 캡처 도구가 마우스로 재현한다.
const INDICATORS = ['none', 'running', 'active'] as const;
const STATES = ['rest', 'hover', 'pressed'] as const;

type ParityArgs = {
  indicator: (typeof INDICATORS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/TaskbarButton',
  args: { indicator: 'none', state: 'rest' },
  argTypes: {
    indicator: { control: 'inline-radio', options: INDICATORS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <TaskbarButton
      indicator={args.indicator}
      label="앱 이름"
      icon={<img src={appIcon} alt="" className="size-full object-contain" />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
export const Parity: Story = {};
