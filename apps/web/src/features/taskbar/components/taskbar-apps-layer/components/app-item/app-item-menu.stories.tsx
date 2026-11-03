import type { Meta, StoryObj } from '@storybook/react-vite';

import { StoryStage } from '@seojaewan/design-system/story';

import { menuTaskbarApp } from '@/features/taskbar/components/taskbar-apps-layer/app-menu/story-data';

import { TaskbarAppItem } from './app-item';

// 피그마 Taskbar/AppMenu의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 실제 화면이 쓰는 `TaskbarAppItem`을 그린다. 메뉴는 버튼 위에 열리므로 캔버스 전체를 쓰고 버튼을 아래에 두며,
// 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다. 메뉴는 그 둘레에 함께 찍힌다.
const meta = {
  title: 'Patterns/Taskbar/AppMenu',
  parameters: { layout: 'fullscreen' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <StoryStage placement="bottom-center" target>
      <TaskbarAppItem
        app="file-explorer"
        indicator="active"
        isMenuOpen={args.state === 'open'}
        menuItems={menuTaskbarApp}
      />
    </StoryStage>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
