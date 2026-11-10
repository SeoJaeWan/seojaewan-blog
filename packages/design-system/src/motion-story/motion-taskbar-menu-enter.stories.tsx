import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleMenu } from './sample-menu';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-taskbar-menu-enter에는 자르는 틀 안에 작업 표시줄 앱 메뉴 조립(Menu/TaskbarApp, 항목 셋)을 놓고
// 메뉴 전체에 세로 이동 키프레임(대표값 → 0)을 건다. 클래스는 틀에 걸고 틀 바로 안의 메뉴가 움직인다(motion.css).
// 메뉴를 열 때 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 시작 이동 하나다(견본의 대표값 135px).
const meta = {
  title: 'Motion/motion-taskbar-menu-enter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runtimeValues = { '--motion-taskbar-menu-offset': '135px' };

const TASKBAR_APP_LABELS = ['파일 탐색기', '작업 표시줄에서 고정 해제', '창 닫기'] as const;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-taskbar-menu-enter" runtimeValues={runtimeValues}>
      {(motionClassName) => (
        <SampleMenu motionClassName={motionClassName} labels={TASKBAR_APP_LABELS} />
      )}
    </MotionPreview>
  ),
};
