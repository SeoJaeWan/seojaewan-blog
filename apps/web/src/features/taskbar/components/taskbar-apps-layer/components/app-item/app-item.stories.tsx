import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { StoryStage } from '@seojaewan/design-system/story';

import { PreviewListStory } from '@/features/taskbar/components/taskbar-apps-layer/components/taskbar-window-preview-list/story-preview-list';

import { TaskbarAppItem } from './app-item';

/**
 * 마우스를 올리면 창 미리보기 목록이 열리는 작업 표시줄 앱 버튼을 그린다. 열림 여부는 쓰는 곳이 정하므로 여기서 상태로 든다.
 * 탐색기 창 둘(Taskbar/PreviewList `Count=2`)을 띄운다.
 * @returns 앱 버튼과 미리보기 목록
 */
function AppPreviewStory(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  /** 포인터가 들어오면 목록을 연다. */
  function handlePointerEnter(): void {
    setIsOpen(true);
  }

  /** 포인터가 나가면 목록을 닫는다. */
  function handlePointerLeave(): void {
    setIsOpen(false);
  }

  return (
    <StoryStage placement="bottom-center" target>
      <TaskbarAppItem
        app="file-explorer"
        indicator="active"
        open={isOpen}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        previews={<PreviewListStory count={2} />}
      />
    </StoryStage>
  );
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 실제 화면이 쓰는 `TaskbarAppItem`을 그린다. 피그마 조립은 닫힌 모양(버튼만)이고,
// 미리보기 목록은 버튼 위에 열리므로 캔버스 전체를 쓰고 버튼을 아래에 두며 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다.
// 같은 파일에 열림 동작 스토리(`OpensPreviewList`)를 함께 둔다. 캡처 도구는 제목이 같은 스토리가 여럿이면 `Figma`를 고른다.
const meta = {
  title: 'Patterns/Taskbar/AppPreview',
  parameters: { layout: 'fullscreen' },
  render: () => <AppPreviewStory />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/** 앱 버튼에 마우스를 올리면 TaskbarPreviewList가 열린다. 피그마 설명의 `@runtime` 항목이 열린 목록에 보인다 */
export const OpensPreviewList: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole('button', { name: '파일 탐색기' });

    // @codocs [[작업 표시줄:창 미리보기]]
    await step('앱 버튼은 처음에 목록 없이 닫혀 있다', async () => {
      await expect(body.queryByText('Blog - 파일 탐색기')).not.toBeInTheDocument();
    });

    // @codocs [[작업 표시줄:창 미리보기]]
    await step('마우스를 올리면 두 창의 제목이 든 미리보기 목록이 열린다', async () => {
      await userEvent.hover(button);
      await expect(await body.findByText('Blog - 파일 탐색기')).toBeInTheDocument();
      await expect(body.getByText('React - 파일 탐색기')).toBeInTheDocument();
    });

    // @codocs [[작업 표시줄:창 미리보기]]
    await step('마우스가 나가면 목록이 닫힌다', async () => {
      await userEvent.unhover(button);
      await waitFor(() => expect(body.queryByText('Blog - 파일 탐색기')).not.toBeInTheDocument());
    });
  },
};
