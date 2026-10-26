import type { Meta, StoryObj } from '@storybook/react-vite';

import { resetStoryStores } from '@/shared/stories/story-stores/story-stores';

import { DesktopIconsLayer } from './desktop-icons-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 창 저장소에 이은 바탕화면 아이콘을 그린다. 아이콘을 고르고, 열면(데스크톱 더블클릭, 모바일 한 번)
// 창 저장소에 창을 연다. 창은 다른 기능이라 그리지 않는다. 함께 보려면 `Features/Shell/Shell`을 본다.
const meta = {
  title: 'Features/Desktop/DesktopIconsLayer',
  component: DesktopIconsLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  render: () => (
    <div className="fixed inset-0">
      <DesktopIconsLayer />
    </div>
  ),
} satisfies Meta<typeof DesktopIconsLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
