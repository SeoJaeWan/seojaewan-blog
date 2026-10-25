import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskbarAppButton, TaskbarDefault } from '@/features/taskbar/taskbar';
import { TASKBAR_CLOCK } from '@/shared/story-data/taskbar';

import { DesktopScene } from './desktop-scene';
import { SCENE_ICONS } from './story-data';

// 피그마 Desktop/Scene의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 화면 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1920×1080, size/390×844)로 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-1920 h-1080', mobile: 'w-390 h-844' } as const;

// 피그마 조립의 Taskbar/Default 변형이다. 좁은 화면은 검색 입력칸 대신 검색 버튼을 둔다.
const TASKBAR_SEARCHES = { desktop: 'box', mobile: 'button' } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 창 자리는 비우고, 작업 표시줄에 고정 앱(File Explorer, Chrome) 버튼을 표시 없이 둔다.
// 화면 너비(1920)가 캡처 화면 너비보다 넓어, 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Desktop/Scene',
  parameters: { layout: 'fullscreen' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    <DesktopScene
      className={SIZE_CLASS_NAMES[args.device]}
      icons={SCENE_ICONS}
      taskbar={
        <TaskbarDefault
          search={TASKBAR_SEARCHES[args.device]}
          time={TASKBAR_CLOCK.time}
          date={TASKBAR_CLOCK.date}
          apps={
            <>
              <TaskbarAppButton app="file-explorer" />
              <TaskbarAppButton app="chrome" />
            </>
          }
        />
      }
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
