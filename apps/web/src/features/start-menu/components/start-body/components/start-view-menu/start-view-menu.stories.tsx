import type { Meta, StoryObj } from '@storybook/react-vite';

import { StoryStage } from '@seojaewan/design-system/story';

import { menuViewOptions } from '@/features/start-menu/components/start-body/view-menu/story-data';

import { StartViewMenu } from './start-view-menu';

// 피그마 Start/ViewMenu의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 메뉴는 버튼 아래에 열리므로 캔버스 전체를 쓰고 버튼을 위 가운데에 두며,
// 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다. 메뉴는 그 둘레에 함께 찍힌다.
const meta = {
  title: 'Patterns/Start/ViewMenu',
  parameters: { layout: 'fullscreen' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <StoryStage placement="top-center" target>
      <StartViewMenu label="간단히" open={args.state === 'open'} menuItems={menuViewOptions} />
    </StoryStage>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
