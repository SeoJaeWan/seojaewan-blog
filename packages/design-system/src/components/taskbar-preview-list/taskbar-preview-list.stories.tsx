import type { Meta, StoryObj } from '@storybook/react-vite';

import { WindowPreview } from '../window-preview/window-preview';
import { TaskbarPreviewList } from './taskbar-preview-list';

const meta = {
  title: 'Components/TaskbarPreviewList',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// 피그마 WindowPreview의 App icon 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 TaskbarPreviewList는 변형이 하나다. Previews 슬롯에는 피그마 슬롯 기본 내용과 같은 WindowPreview 둘을 넣는다.
// WindowPreview의 thumbnail 슬롯은 피그마에서 비어 있어 넣지 않는다. 축소 화면 자리의 크기는 WindowPreview가 갖는다.
export const Figma: Story = {
  render: () => (
    <TaskbarPreviewList>
      {[0, 1].map((index) => (
        <WindowPreview key={index} appIcon={<img src={appIcon} alt="" />} />
      ))}
    </TaskbarPreviewList>
  ),
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 미리보기를 children 자리에 그리고, 역할과 접근성 이름 같은 div 속성을 넘긴다 */
export const Default: Story = {
  render: () => (
    <TaskbarPreviewList role="list" aria-label="창 미리보기 목록">
      <div role="listitem">창 미리보기</div>
    </TaskbarPreviewList>
  ),
};
