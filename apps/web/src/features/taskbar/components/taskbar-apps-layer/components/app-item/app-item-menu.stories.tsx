import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';

import { StoryStage } from '@seojaewan/design-system/story';

import { menuTaskbarApp } from '@/features/taskbar/components/taskbar-apps-layer/app-menu/story-data';

import { TaskbarAppItem } from './app-item';

/**
 * 우클릭하면 메뉴가 열리는 작업 표시줄 앱 버튼을 그린다. 열림 여부는 쓰는 곳이 정하므로 여기서 상태로 든다.
 * @returns 앱 버튼과 우클릭 메뉴
 */
function AppMenuStory(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /**
   * 메뉴가 알린 열림 여부를 따른다.
   * @param isNextOpen 바뀐 열림 여부
   */
  function handleMenuOpenChange(isNextOpen: boolean): void {
    setIsMenuOpen(isNextOpen);
  }

  return (
    <StoryStage placement="bottom-center" isTarget>
      <TaskbarAppItem
        app="file-explorer"
        indicator="active"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={handleMenuOpenChange}
        menuItems={menuTaskbarApp}
      />
    </StoryStage>
  );
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 실제 화면이 쓰는 `TaskbarAppItem`을 그린다. 피그마 조립은 닫힌 모양(버튼만)이고,
// 메뉴는 버튼 위에 열리므로 캔버스 전체를 쓰고 버튼을 아래에 두며 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다.
// 같은 파일에 열림 동작 스토리(`OpensMenu`)를 함께 둔다. 캡처 도구는 제목이 같은 스토리가 여럿이면 `Figma`를 고른다.
const meta = {
  title: 'Patterns/Taskbar/AppMenu',
  parameters: { layout: 'fullscreen' },
  render: () => <AppMenuStory />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/** 앱 버튼을 우클릭하면 Menu/TaskbarApp 항목의 메뉴가 열린다 */
export const OpensMenu: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('앱 버튼은 처음에 메뉴 없이 닫혀 있다', async () => {
      await expect(body.queryByRole('menu')).not.toBeInTheDocument();
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('우클릭하면 파일 탐색기, 고정 해제, 창 닫기 항목의 메뉴가 열린다', async () => {
      await fireEvent.contextMenu(body.getByRole('button', { name: '파일 탐색기' }));
      await body.findByRole('menu');
      await expect(body.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        '파일 탐색기',
        '작업 표시줄에서 고정 해제',
        '창 닫기',
      ]);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('항목을 고르면 메뉴가 닫힌다', async () => {
      await fireEvent.click(body.getByRole('menuitem', { name: '창 닫기' }));
      await waitFor(() => expect(body.queryByRole('menu')).not.toBeInTheDocument());
    });
  },
};
