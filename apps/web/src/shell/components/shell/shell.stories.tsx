import type { Meta, StoryObj } from '@storybook/react-vite';

import { resetStoryStores } from '@/shared/stories/story-stores/story-stores';

import { Shell } from './shell';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 앱 화면 전체(바탕화면·창·패널·작업 표시줄·재부팅 화면)를 실제 저장소로 그린다.
// Start 버튼을 누르면 Start 메뉴가 열리고, 앱을 열면 창이 생기며, 전원 메뉴의 다시 시작이 동작한다.
const meta = {
  title: 'Features/Shell/Shell',
  component: Shell,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
} satisfies Meta<typeof Shell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
