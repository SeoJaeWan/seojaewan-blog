import type { Meta, StoryObj } from '@storybook/react-vite';

import { TASKBAR_CLOCK } from './story-data';
import { TaskbarAppButton } from './taskbar-app';
import { TaskbarDefault } from './taskbar-default';

// 피그마 Taskbar/Default의 변형 속성 값이다(정규화한 이름).
const SEARCHES = ['box', 'button'] as const;

// 너비는 쓰는 곳이 정하므로 피그마 원본 너비(size/1280, size/390)로 그린다.
const WIDTH_CLASS_NAMES = { box: 'w-1280', button: 'w-390' } as const;

type ParityArgs = {
  search: (typeof SEARCHES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 고정 앱(File Explorer, Chrome) 버튼을 표시 없이 둔다.
// 캡처 화면 너비(1280)가 미리보기 너비와 같아, 기본 여백을 두면 오른쪽 끝이 잘리므로 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Taskbar/Default',
  parameters: { layout: 'fullscreen' },
  args: { search: 'box' },
  argTypes: {
    search: { control: 'inline-radio', options: SEARCHES },
  },
  render: (args) => (
    <TaskbarDefault
      search={args.search}
      className={WIDTH_CLASS_NAMES[args.search]}
      time={TASKBAR_CLOCK.time}
      date={TASKBAR_CLOCK.date}
      apps={
        <>
          <TaskbarAppButton app="file-explorer" />
          <TaskbarAppButton app="chrome" />
        </>
      }
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
