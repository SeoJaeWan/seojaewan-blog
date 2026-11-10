import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskbarPreviewList } from '../components/taskbar-preview-list/taskbar-preview-list';
import { WindowPreview } from '../components/window-preview/window-preview';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-taskbar-preview-enter에는 자르는 틀 안에 창 미리보기 목록(Taskbar/PreviewList, 미리보기 둘)을 놓고
// 목록 전체에 세로 이동 키프레임(190 → 0)을 건다. 클래스는 틀에 걸고 틀 바로 안의 목록이 움직인다(motion.css).
// 미리보기를 열 때 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다.
const meta = {
  title: 'Motion/motion-taskbar-preview-enter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// 피그마 WindowPreview의 App icon 기본 인스턴스(app/File Explorer)다.
const appIcon = new URL('../assets/images/app-file-explorer.webp', import.meta.url).href;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-taskbar-preview-enter">
      {(motionClassName) => (
        <div className={motionClassName}>
          <TaskbarPreviewList>
            {[0, 1].map((index) => (
              <WindowPreview key={index} appIcon={<img src={appIcon} alt="" />} />
            ))}
          </TaskbarPreviewList>
        </div>
      )}
    </MotionPreview>
  ),
};
