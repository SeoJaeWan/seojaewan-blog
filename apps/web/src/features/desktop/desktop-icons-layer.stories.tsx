import type { Meta, StoryObj } from '@storybook/react-vite';
import type { queries } from 'storybook/test';
import { expect, fireEvent, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { dragStoryPointer } from '@/features/window/story-pointer';
import { DRAG_REJECTED_ATTRIBUTE } from '@/shared/hooks/use-item-drag/use-item-drag';
import { useItemClipboardStore } from '@/shared/stores/item-clipboard-store/item-clipboard-store';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import { createExplorerContent } from '@/shared/utils/window-rules/window-rules';
import {
  BLOG_FOLDER_ID,
  isItemInTrash,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { DesktopIconsLayer } from './desktop-icons-layer';

const POSTS = [{ slug: 'a', title: '가', folderPath: [], date: '2026-10-20' }] as const;

/** 눌러 둔 수정 키(Ctrl, Shift)가 다음 입력까지 이어지는 사용자 입력기 */
type StoryUser = ReturnType<typeof userEvent.setup>;

/** 화면 위 자리 */
type Point = {
  /** 가로(px) */
  x: number;
  /** 세로(px) */
  y: number;
};

/** 메뉴 항목의 역할 */
type MenuItemRole = 'menuitem' | 'menuitemradio' | 'menuitemcheckbox';

/**
 * 메뉴·메시지 상자·툴팁은 문서 끝에 포털하므로 문서 전체에서 찾는다.
 * @returns 문서 전체를 찾는 도구
 */
function page(): ReturnType<typeof within<typeof queries>> {
  return within(document.body);
}

/**
 * 사용자 입력기를 만든다. Base UI 메뉴가 열려 있는 동안 바깥에 pointer-events: none을 걸어, 누를 수 있는지 보는 검사를 끈다.
 * @returns 사용자 입력기
 */
function startUser(): StoryUser {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

/**
 * 바탕화면 아이콘을 이름으로 찾는다.
 * @param name 아이콘 이름
 * @returns 아이콘 요소
 */
function icon(name: string): HTMLElement {
  return page().getByRole('option', { name });
}

/**
 * 고른 아이콘 이름을 돌려준다.
 * @returns 고른 아이콘 이름
 */
function selectedNames(): (string | null)[] {
  return page()
    .queryAllByRole('option', { selected: true })
    .map((element) => element.textContent);
}

/**
 * 열린 창들의 내용을 돌려준다.
 * @returns 창 내용
 */
function windowContents(): unknown[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => windows[id]?.content);
}

/**
 * 항목이 휴지통에 있는지 본다.
 * @param id 항목 id
 * @returns 휴지통에 있으면 true
 */
function isTrashed(id: string): boolean {
  return isItemInTrash(useWorkspaceStore.getState(), id);
}

/**
 * 요소를 우클릭해 메뉴를 연다.
 * @param element 우클릭할 요소
 * @returns 열린 메뉴
 */
async function openMenu(element: HTMLElement): Promise<HTMLElement> {
  await fireEvent.contextMenu(element);
  return page().findByRole('menu');
}

/** 메뉴가 사라지기를 기다린다. 실제 브라우저라 닫는 애니메이션이 끝나야 다음 메뉴를 열 수 있다. */
async function waitForMenuClosed(): Promise<void> {
  await waitFor(async () => {
    await expect(page().queryAllByRole('menu')).toHaveLength(0);
  });
}

/** 열린 메뉴를 Esc로 닫는다. */
async function closeMenu(): Promise<void> {
  await fireEvent.keyDown(page().getByRole('menu'), { key: 'Escape' });
  await waitForMenuClosed();
}

/**
 * 열린 메뉴의 항목을 고른다.
 * @param user 사용자 입력기
 * @param name 항목 이름
 */
async function chooseMenuItem(user: StoryUser, name: string | RegExp): Promise<void> {
  await user.click(page().getByRole('menuitem', { name }));
  await waitForMenuClosed();
}

/**
 * 열린 메뉴의 항목 이름을 돌려준다.
 * @returns 항목 이름
 */
function menuItemNames(): (string | null)[] {
  return page()
    .getAllByRole('menuitem')
    .map((item) => item.textContent);
}

/**
 * 빈 곳 메뉴를 열어 하위 메뉴의 항목을 찾는다.
 * @param user 사용자 입력기
 * @param submenu 하위 메뉴를 여는 항목 이름
 * @param role 찾을 항목의 역할
 * @param name 찾을 항목 이름
 * @returns 찾은 항목
 */
async function findSubmenuItem(
  user: StoryUser,
  submenu: string,
  role: MenuItemRole,
  name: string,
): Promise<HTMLElement> {
  await openMenu(page().getByRole('listbox'));
  await user.click(page().getByRole('menuitem', { name: submenu }));
  return page().findByRole(role, { name });
}

/**
 * 빈 곳 메뉴를 열어 하위 메뉴의 항목을 고른다.
 * @param user 사용자 입력기
 * @param submenu 하위 메뉴를 여는 항목 이름
 * @param role 고를 항목의 역할
 * @param name 고를 항목 이름
 */
async function chooseSubmenuItem(
  user: StoryUser,
  submenu: string,
  role: MenuItemRole,
  name: string,
): Promise<void> {
  await user.click(await findSubmenuItem(user, submenu, role, name));
  await waitForMenuClosed();
}

/**
 * Blog 폴더의 이름 바꾸기를 시작하고 입력창을 비운다.
 * @param user 사용자 입력기
 * @returns 입력창
 */
async function startBlogRename(user: StoryUser): Promise<HTMLElement> {
  await user.click(icon('Blog'));
  await user.keyboard('{F2}');
  const field = page().getByRole('textbox', { name: '새 이름' });
  await user.clear(field);
  return field;
}

/**
 * 메시지 상자가 닫히고 입력창에 포커스가 돌아오기를 기다린다.
 * @returns 입력창
 */
async function waitForReturnToRename(): Promise<HTMLElement> {
  await waitFor(async () => {
    await expect(page().queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  const field = page().getByRole('textbox', { name: '새 이름' });
  await waitFor(async () => {
    await expect(field).toHaveFocus();
  });
  return field;
}

/**
 * 요소의 가운데 자리를 돌려준다.
 * @param element 요소
 * @returns 가운데 자리
 */
function centerOf(element: Element): Point {
  const box = element.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * 포인터 이벤트 값을 만든다.
 * @param point 포인터 자리
 * @returns 이벤트 값
 */
function pointerAt(point: Point): PointerEventInit {
  return { pointerId: 1, button: 0, pointerType: 'mouse', clientX: point.x, clientY: point.y };
}

/**
 * 요소를 눌러 끌기를 시작한 채로 둔다. 끄는 동안의 강조·툴팁을 보려고 `dragStoryPointer` 대신 쓴다.
 * 끌기 쪽(`usePointerDrag`)이 합성 포인터 id의 붙잡기 오류를 받아 넘기므로 `setPointerCapture`를 바꾸지 않아도 된다.
 * @param target 끌 요소
 * @param over 끌어 갈 자리
 */
async function holdDrag(target: Element, over: Point): Promise<void> {
  await fireEvent.pointerDown(target, pointerAt(centerOf(target)));
  await fireEvent.pointerMove(target, pointerAt(over));
}

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 작업 공간 저장소에 이은 바탕화면 아이콘을 그린다.
// 클릭·Ctrl·Shift·끄는 사각형으로 고르고, 방향키·Ctrl + A·Enter·Delete·F2를 쓰고, 아이콘을 끌어 폴더·휴지통에 놓거나
// (자동 정렬을 끄면) 다른 칸으로 옮기고, 빈 곳·아이콘을 우클릭해 메뉴를 써 볼 수 있다.
// 연 창은 다른 기능이라 그리지 않는다. 함께 보려면 `Features/Shell/Shell`을 본다.
const meta = {
  title: 'Features/Desktop/DesktopIconsLayer',
  component: DesktopIconsLayer,
  // 색은 바꾸지 않는다. Windows 모양을 유지하기로 함([[접근성:색 대비]]).
  parameters: {
    layout: 'fullscreen',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  beforeEach: resetStoryStores,
  render: () => (
    <div className="fixed inset-spacing-none">
      <DesktopIconsLayer />
    </div>
  ),
} satisfies Meta<typeof DesktopIconsLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 글 색인을 넣어 글 `가`를 Blog 폴더에 둔다. */
function hydratePost(): void {
  hydrateWorkspaceStore(POSTS);
}

/** 글 색인을 넣고 글 `가`를 바탕화면으로 옮긴다. */
function showPostOnDesktop(): void {
  hydratePost();
  useWorkspaceStore.getState().moveItems(['post:a'], null);
}

/** `새 폴더` 안에 이름이 `Blog`인 폴더를 만들어, 바탕화면의 Blog를 `새 폴더`로 옮길 수 없게 한다. */
function blockBlogFromNewFolder(): void {
  const store = useWorkspaceStore.getState();
  const outer = store.createFolder(null);
  const inner = outer.ok ? store.createFolder(outer.id) : outer;
  if (inner.ok) {
    store.renameFolder(inner.id, 'Blog');
  }
}

export const Default: Story = {};

// 자동 정렬을 끈 바탕화면이다. 아이콘을 끌어 원하는 칸에 둘 수 있다.
export const ManualArrange: Story = {
  beforeEach: () => {
    useWorkspaceStore.getState().setDesktopAutoArrange(false);
  },
};

// 휴지통에 항목이 있어 휴지통 아이콘이 찬 모양이다. 휴지통 우클릭 > 휴지통 비우기로 메시지 상자를 볼 수 있다.
export const RecycleBinFull: Story = {
  beforeEach: () => {
    useWorkspaceStore.getState().trashItems(['link:resume']);
  },
};

// 바탕화면에 무엇이 보이는지 확인한다.
// @codocs [[바탕화면:표시하는 항목]]
export const ShownItems: Story = {
  beforeEach: hydratePost,
  play: async ({ step }) => {
    const store = useWorkspaceStore.getState();

    await step('상위 폴더가 없는 항목과 휴지통을 보여 준다', async () => {
      for (const name of ['휴지통', 'Blog', 'GitHub']) {
        await expect(icon(name)).toBeInTheDocument();
      }
      await expect(page().queryByText('가')).not.toBeInTheDocument();
    });

    // @codocs [[항목과 폴더:외부 링크]]
    await step('주소를 비워 둔 외부 링크(이력서)는 보이지 않는다', async () => {
      await expect(page().queryByText('이력서')).not.toBeInTheDocument();
    });

    // @codocs [[항목 조작:끌기]]
    await step('바탕화면 영역은 탐색기 항목을 끌어 놓을 곳이다', async () => {
      await expect(page().getByRole('listbox', { name: '바탕화면 아이콘' })).toHaveAttribute(
        'data-drop-target',
        'desktop',
      );
    });

    await step('항목을 폴더 안으로 옮기면 사라지고, 바탕화면으로 옮기면 나타난다', async () => {
      store.moveItems(['link:github'], BLOG_FOLDER_ID);
      store.moveItems(['post:a'], null);
      await expect(await page().findByRole('option', { name: '가' })).toBeInTheDocument();
      await expect(page().queryByText('GitHub')).not.toBeInTheDocument();
    });

    await step('휴지통에 항목이 있으면 찬 모양이고, 모두 복원하면 빈 모양이다', async () => {
      await expect(icon('휴지통')).toHaveAttribute('data-full', 'false');
      store.trashItems(['post:a']);
      await waitFor(async () => {
        await expect(icon('휴지통')).toHaveAttribute('data-full', 'true');
      });
      store.restoreItems(['post:a']);
      await waitFor(async () => {
        await expect(icon('휴지통')).toHaveAttribute('data-full', 'false');
      });
    });
  },
};

// 더블클릭과 Enter로 아이콘을 연다.
// @codocs [[창 동작:열기 규칙]]
// @codocs [[항목 조작:열기]]
export const OpenIcons: Story = {
  play: async ({ step }) => {
    const user = startUser();

    await step('Blog 폴더를 더블클릭하면 그 폴더를 보는 새 탐색기 창을 연다', async () => {
      await user.dblClick(icon('Blog'));
      await expect(windowContents()).toEqual([createExplorerContent(BLOG_FOLDER_ID)]);
    });

    await step('휴지통을 더블클릭하면 휴지통을 보는 탐색기 창을 연다', async () => {
      await user.dblClick(icon('휴지통'));
      await expect(windowContents().at(-1)).toEqual(createExplorerContent(RECYCLE_BIN_ID));
    });

    await step('외부 링크를 더블클릭하면 창을 만들지 않고 브라우저의 새 탭으로 연다', async () => {
      const open = spyOn(window, 'open').mockReturnValue(null);
      await user.dblClick(icon('GitHub'));
      await expect(open).toHaveBeenCalledWith('https://github.com/SeoJaeWan', '_blank', 'noopener');
      await expect(windowContents()).toHaveLength(2);
      open.mockRestore();
    });

    // @codocs [[항목 조작:단축키]]
    await step('Enter는 고른 아이콘을 연다', async () => {
      await user.click(icon('Blog'));
      await user.keyboard('{Enter}');
      await expect(windowContents()).toHaveLength(3);
    });
  },
};

// 클릭과 키보드로 아이콘을 고른다.
// @codocs [[항목 조작:선택]]
// @codocs [[항목 조작:단축키]]
export const SelectIcons: Story = {
  play: async ({ step }) => {
    const user = startUser();

    await step('클릭하면 고르고, Ctrl + 클릭은 더하고, 빈 곳을 누르면 선택을 지운다', async () => {
      await user.click(icon('Blog'));
      await expect(selectedNames()).toEqual(['Blog']);
      await user.keyboard('{Control>}');
      await user.click(icon('GitHub'));
      await user.keyboard('{/Control}');
      await expect(selectedNames()).toEqual(['Blog', 'GitHub']);
      await user.click(page().getByRole('listbox'));
      await expect(selectedNames()).toEqual([]);
    });

    await step('Shift + 클릭은 마지막으로 고른 아이콘부터 격자 순서로 범위를 고른다', async () => {
      await user.click(icon('휴지통'));
      await user.keyboard('{Shift>}');
      await user.click(icon('GitHub'));
      await user.keyboard('{/Shift}');
      await expect(selectedNames()).toEqual(['휴지통', 'Blog', 'GitHub']);
    });

    await step(
      '방향키는 격자에서 옆 아이콘으로 선택을 옮기고, Ctrl + A는 모두 고른다',
      async () => {
        await user.click(icon('휴지통'));
        await user.keyboard('{ArrowDown}');
        await expect(selectedNames()).toEqual(['Blog']);
        await expect(icon('Blog')).toHaveFocus();
        await user.keyboard('{Control>}a{/Control}');
        await expect(selectedNames()).toEqual(['휴지통', 'Blog', 'GitHub']);
      },
    );
  },
};

// 아이콘을 휴지통으로 보내고 다음 아이콘으로 선택과 포커스를 옮긴다.
// @codocs [[항목 조작:단축키]]
export const DeleteIcons: Story = {
  beforeEach: showPostOnDesktop,
  play: async ({ step }) => {
    const user = startUser();

    await step('메뉴의 삭제로 지워도 메뉴가 닫힌 뒤 다음 아이콘으로 포커스를 옮긴다', async () => {
      await openMenu(icon('GitHub'));
      await chooseMenuItem(user, /^삭제/);
      await expect(isTrashed('link:github')).toBe(true);
      await waitFor(async () => {
        await expect(icon('가')).toHaveFocus();
      });
      await expect(selectedNames()).toEqual(['가']);
      useWorkspaceStore.getState().restoreItems(['link:github']);
      await page().findByRole('option', { name: 'GitHub' });
    });

    await step('Delete는 휴지통으로 보내고 다음(없으면 이전) 아이콘으로 옮긴다', async () => {
      await user.click(icon('GitHub'));
      await user.keyboard('{Delete}');
      await expect(isTrashed('link:github')).toBe(true);
      await expect(page().queryByText('GitHub')).not.toBeInTheDocument();
      await expect(selectedNames()).toEqual(['가']);
      await expect(icon('가')).toHaveFocus();
      await user.keyboard('{Delete}');
      await expect(selectedNames()).toEqual(['Blog']);
      await expect(icon('Blog')).toHaveFocus();
    });

    await step('휴지통은 Delete로 보내지 않고, Blog 폴더는 Delete로 보낸다', async () => {
      await user.click(icon('휴지통'));
      await user.keyboard('{Delete}');
      await expect(icon('휴지통')).toBeInTheDocument();
      await user.click(icon('Blog'));
      await user.keyboard('{Delete}');
      await expect(page().queryByRole('option', { name: 'Blog' })).not.toBeInTheDocument();
      await expect(isTrashed(BLOG_FOLDER_ID)).toBe(true);
    });
  },
};

// 단축키와 메뉴로 잘라내고 붙여넣는다.
// @codocs [[항목 조작:잘라내기와 붙여넣기]]
export const CutAndPaste: Story = {
  beforeEach: hydratePost,
  play: async ({ step }) => {
    const user = startUser();

    await step(
      'Ctrl + X로 자른 아이콘은 탐색기와 함께 쓰는 잘라낸 항목이 되고 흐려진다',
      async () => {
        await user.click(icon('GitHub'));
        await user.keyboard('{Control>}x{/Control}');
        await expect(useItemClipboardStore.getState().cutIds).toEqual(['link:github']);
        await expect(icon('GitHub')).toHaveAttribute('data-cut', 'true');
        await expect(icon('Blog')).toHaveAttribute('data-cut', 'false');
        useItemClipboardStore.getState().clear();
      },
    );

    // @codocs [[바탕화면 우클릭 메뉴:아이콘]]
    await step('메뉴의 잘라내기는 고른 항목을 잘라낸다', async () => {
      await openMenu(icon('GitHub'));
      await chooseMenuItem(user, /^잘라내기/);
      await expect(useItemClipboardStore.getState().cutIds).toEqual(['link:github']);
      useItemClipboardStore.getState().clear();
    });

    await step('Ctrl + V로 바탕화면에 붙여넣고, 비운 뒤 붙여넣은 항목을 고른다', async () => {
      useItemClipboardStore.getState().cut(['post:a']);
      await user.click(icon('GitHub'));
      await user.keyboard('{Control>}v{/Control}');
      await expect(useWorkspaceStore.getState().items['post:a']?.parentId).toBeNull();
      await expect(useItemClipboardStore.getState().cutIds).toEqual([]);
      await waitFor(async () => {
        await expect(selectedNames()).toEqual(['가']);
      });
      useWorkspaceStore.getState().moveItems(['post:a'], BLOG_FOLDER_ID);
    });

    // @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
    await step('빈 곳 메뉴의 붙여넣기는 옮기고, 붙여넣을 것이 없으면 비활성이다', async () => {
      await openMenu(page().getByRole('listbox'));
      await expect(page().getByRole('menuitem', { name: /^붙여넣기/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await closeMenu();
      useItemClipboardStore.getState().cut(['post:a']);
      await openMenu(page().getByRole('listbox'));
      await chooseMenuItem(user, /^붙여넣기/);
      await expect(useWorkspaceStore.getState().items['post:a']?.parentId).toBeNull();
      await expect(useItemClipboardStore.getState().cutIds).toEqual([]);
    });
  },
};

// 폴더 이름을 키보드와 메뉴로 바꾼다.
// @codocs [[항목 조작:단축키]]
export const RenameFolder: Story = {
  play: async ({ step }) => {
    const user = startUser();

    await step('F2는 폴더 이름 바꾸기를 시작하고, Enter로 확정한다', async () => {
      await user.click(icon('Blog'));
      await user.keyboard('{F2}');
      const field = page().getByRole('textbox', { name: '새 이름' });
      await expect(field).toHaveFocus();
      await user.clear(field);
      await user.type(field, '내 블로그{Enter}');
      await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('내 블로그');
      await expect(page().queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
      await expect(icon('내 블로그')).toHaveFocus();
    });

    await step('Esc는 이름 바꾸기를 취소하고, 외부 링크는 F2로 이름을 바꾸지 않는다', async () => {
      await user.click(icon('내 블로그'));
      await user.keyboard('{F2}');
      await user.type(page().getByRole('textbox', { name: '새 이름' }), 'x{Escape}');
      await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('내 블로그');
      await user.click(icon('GitHub'));
      await user.keyboard('{F2}');
      await expect(page().queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
    });

    // @codocs [[바탕화면 우클릭 메뉴:아이콘]]
    await step(
      '메뉴로 시작하면 닫힌 뒤 입력창에 포커스를 두고, 쓸 수 없는 문자는 막아 알린다',
      async () => {
        await openMenu(icon('내 블로그'));
        await chooseMenuItem(user, /^이름 바꾸기/);
        const field = await page().findByRole('textbox', { name: '새 이름' });
        await expect(field).toHaveFocus();
        await user.clear(field);
        await user.type(field, 'a:');
        await expect(page().getByRole('alert')).toHaveTextContent('다음 문자를 사용할 수 없습니다');
        await expect(field).toHaveValue('a');
        await user.type(field, 'b{Enter}');
        await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('ab');
      },
    );
  },
};

// 확정할 수 없는 폴더 이름을 입력하면 알리고 이름 바꾸기로 돌아간다.
// @codocs [[항목과 폴더:폴더 이름]]
export const InvalidFolderNames: Story = {
  beforeEach: () => {
    useWorkspaceStore.getState().createFolder(null);
  },
  play: async ({ step }) => {
    const user = startUser();

    await step('비었거나 공백만 있으면 원래 이름으로 되돌린다', async () => {
      const field = await startBlogRename(user);
      await user.type(field, '   {Enter}');
      await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
      await expect(page().queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
    });

    await step('예약 이름이면 메시지 상자를 보인 뒤 입력값을 둔 채 돌아간다', async () => {
      const field = await startBlogRename(user);
      await user.type(field, 'con.txt{Enter}');
      const dialog = await page().findByRole('alertdialog');
      await expect(
        within(dialog).getByText('지정한 장치 이름이 잘못되었습니다.'),
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: '확인' }));
      await expect(await waitForReturnToRename()).toHaveValue('con.txt');
      await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
    });

    await step('같은 이름의 폴더가 있으면 합치지 않고 메시지 상자를 보인 뒤 돌아간다', async () => {
      const field = await waitForReturnToRename();
      await user.clear(field);
      await user.type(field, '새 폴더{Enter}');
      const dialog = await page().findByRole('alertdialog');
      await expect(
        within(dialog).getByText('이 위치에 같은 이름의 폴더가 이미 있습니다.'),
      ).toBeInTheDocument();
      await user.keyboard('{Escape}');
      await expect(await waitForReturnToRename()).toHaveValue('새 폴더');
      await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
    });

    await step('포커스가 메시지 상자로 옮겨지기 전에 입력창에 온 Esc는 끝내지 않는다', async () => {
      const field = await waitForReturnToRename();
      await user.clear(field);
      await user.type(field, 'CON{Enter}');
      await page().findByRole('alertdialog');
      await fireEvent.keyDown(field, { key: 'Escape' });
      await expect(await waitForReturnToRename()).toHaveValue('CON');
    });

    await user.keyboard('{Escape}');
    await expect(page().queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
  },
};

// 아이콘을 폴더·휴지통·탐색기 창 위에 끌어 놓는다. 오른쪽 아래 상자는 Blog를 보는 탐색기 창 본문을 대신한다.
// @codocs [[항목 조작:끌기]]
export const DragToFolder: Story = {
  beforeEach: () => {
    showPostOnDesktop();
    useWorkspaceStore.getState().createFolder(null);
  },
  render: () => (
    <div className="fixed inset-spacing-none">
      <DesktopIconsLayer />
      <div
        data-testid="explorer-body"
        data-drop-target={BLOG_FOLDER_ID}
        data-drop-target-name="Blog"
        style={{ position: 'fixed', right: 0, bottom: 0, width: 200, height: 200 }}
      />
    </div>
  ),
  play: async ({ step }) => {
    await step('폴더 위로 끄는 동안 이동 툴팁과 강조를 보이고, 놓으면 옮긴다', async () => {
      const github = icon('GitHub');
      const over = centerOf(icon('Blog'));
      await holdDrag(github, over);
      await expect(page().getByRole('tooltip')).toHaveTextContent('Blog(으)로 이동');
      await expect(icon('Blog')).toHaveAttribute('aria-selected', 'true');
      await fireEvent.pointerUp(github, pointerAt(over));
      await expect(useWorkspaceStore.getState().items['link:github']?.parentId).toBe(
        BLOG_FOLDER_ID,
      );
      await expect(page().queryByRole('tooltip')).not.toBeInTheDocument();
    });

    await step('휴지통 위에 놓으면 휴지통으로 보낸다', async () => {
      const post = icon('가');
      await dragStoryPointer(post, [centerOf(post), centerOf(icon('휴지통'))]);
      await expect(isTrashed('post:a')).toBe(true);
    });

    await step('탐색기 창 위에 놓으면 그 창이 보는 폴더로 옮긴다', async () => {
      const folder = icon('새 폴더');
      await dragStoryPointer(folder, [
        centerOf(folder),
        centerOf(page().getByTestId('explorer-body')),
      ]);
      const moved = Object.values(useWorkspaceStore.getState().items).find(
        (item) => item.name === '새 폴더',
      );
      await expect(moved?.parentId).toBe(BLOG_FOLDER_ID);
    });
  },
};

// 옮길 수 없는 곳 위로 끌면 막히고, 놓아도 제자리다.
// @codocs [[항목 조작:끌기]]
export const DragRejected: Story = {
  beforeEach: blockBlogFromNewFolder,
  play: async ({ step }) => {
    const blog = icon('Blog');
    const blocked = centerOf(icon('새 폴더'));

    await step(
      '옮길 수 없는 곳 위로 끄는 동안은 강조와 툴팁 없이 not-allowed 커서를 보인다',
      async () => {
        await holdDrag(blog, blocked);
        await expect(document.documentElement).toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
        await expect(page().queryByRole('tooltip')).not.toBeInTheDocument();
        await expect(icon('새 폴더')).toHaveAttribute('aria-selected', 'false');
      },
    );

    await step('바탕화면 빈 곳은 칸 옮기기라 막힌 곳이 아니다', async () => {
      const area = page().getByRole('listbox').getBoundingClientRect();
      await fireEvent.pointerMove(blog, pointerAt({ x: area.right - 40, y: area.bottom - 40 }));
      await expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
    });

    await step('놓으면 커서를 되돌린다', async () => {
      await fireEvent.pointerMove(blog, pointerAt(blocked));
      await expect(document.documentElement).toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
      await fireEvent.pointerUp(blog, pointerAt(blocked));
      await expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
    });

    await step('자동 정렬을 끈 채 옮길 수 없는 곳에 놓으면 아이콘이 제자리다', async () => {
      useWorkspaceStore.getState().setDesktopAutoArrange(false);
      await waitFor(async () => {
        await expect(useWorkspaceStore.getState().desktop.autoArrange).toBe(false);
      });
      const before = { left: blog.offsetLeft, top: blog.offsetTop };
      await dragStoryPointer(blog, [centerOf(blog), centerOf(icon('새 폴더'))]);
      await expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.parentId).toBeNull();
      await expect(icon('Blog').offsetLeft).toBe(before.left);
      await expect(icon('Blog').offsetTop).toBe(before.top);
    });
  },
};

// 아이콘을 빈 곳에 끌어 놓으면 자동 정렬 설정에 따라 자리가 정해진다.
// @codocs [[항목 조작:끌기]]
export const DragToEmptyCell: Story = {
  play: async ({ step }) => {
    /** GitHub 아이콘을 오른쪽으로 두 칸(보통 아이콘 간격 92px) 끌어 놓는다. */
    async function dragGithubRight(): Promise<void> {
      const github = icon('GitHub');
      const start = centerOf(github);
      await dragStoryPointer(github, [start, { x: start.x + 184, y: start.y }]);
    }

    await step('자동 정렬이 켜져 있으면 빈 곳에 놓아도 정렬된 자리로 돌아간다', async () => {
      await dragGithubRight();
      await expect(icon('GitHub').offsetLeft).toBe(8);
      await expect(useWorkspaceStore.getState().desktop.positions['link:github']).toBeUndefined();
    });

    await step('꺼져 있으면 놓은 칸으로 옮긴다', async () => {
      useWorkspaceStore.getState().setDesktopAutoArrange(false);
      await waitFor(async () => {
        await expect(useWorkspaceStore.getState().desktop.autoArrange).toBe(false);
      });
      await dragGithubRight();
      await expect(useWorkspaceStore.getState().desktop.positions['link:github']).toEqual({
        column: 2,
        row: 2,
      });
      await waitFor(async () => {
        await expect(icon('GitHub').offsetLeft).toBe(192);
      });
      await expect(icon('GitHub').offsetTop).toBe(188);
    });
  },
};

// 빈 곳을 우클릭해 메뉴를 쓴다. 메뉴 항목 구성은 `empty-menu-entries.test.ts`가 맡는다.
// @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
export const DesktopMenu: Story = {
  play: async ({ step }) => {
    const user = startUser();

    await step('빈 곳을 우클릭하면 메뉴를 열고 선택을 지운다', async () => {
      await user.click(icon('Blog'));
      await expect(selectedNames()).toEqual(['Blog']);
      await openMenu(page().getByRole('listbox'));
      await closeMenu();
      await expect(selectedNames()).toEqual([]);
    });

    await step('보기에서 아이콘 크기와 자동 정렬을, 정렬 기준에서 기준을 고른다', async () => {
      await chooseSubmenuItem(user, '보기', 'menuitemradio', '큰 아이콘');
      await expect(useWorkspaceStore.getState().desktop.iconSize).toBe('large');

      await chooseSubmenuItem(user, '보기', 'menuitemcheckbox', '아이콘 자동 정렬');
      await expect(useWorkspaceStore.getState().desktop.autoArrange).toBe(false);
      // 끄는 순간의 자리를 저장해 아이콘이 움직이지 않는다.
      await expect(useWorkspaceStore.getState().desktop.positions[BLOG_FOLDER_ID]).toEqual({
        column: 0,
        row: 1,
      });

      await chooseSubmenuItem(user, '정렬 기준', 'menuitemradio', '항목 유형');
      await expect(useWorkspaceStore.getState().desktop.sortBy).toBe('type');
    });

    await step('새로 만들기 > 폴더는 새 폴더를 만들고 바로 이름 바꾸기를 시작한다', async () => {
      await chooseSubmenuItem(user, '새로 만들기', 'menuitem', '폴더');
      const field = await page().findByRole('textbox', { name: '새 이름' });
      await expect(field).toHaveValue('새 폴더');
      await expect(field).toHaveFocus();
      await user.keyboard('{Escape}');
    });
  },
};

// 아이콘을 우클릭해 메뉴를 쓴다. 항목 종류별 구성은 `item-menu-entries.test.ts`가 맡고, 여기서는 고른 아이콘에 맞게 이어지는지 본다.
// @codocs [[바탕화면 우클릭 메뉴:아이콘]]
export const ItemMenu: Story = {
  beforeEach: showPostOnDesktop,
  play: async ({ step }) => {
    const user = startUser();

    await step('우클릭한 항목의 종류와 고정 여부에 맞는 메뉴를 연다', async () => {
      await openMenu(icon('Blog'));
      await expect(menuItemNames()).toContain('이름 바꾸기F2');
      await expect(menuItemNames()).toContain('시작 화면에서 고정 해제');
      await closeMenu();
      await openMenu(icon('가'));
      await expect(menuItemNames()).not.toContain('이름 바꾸기F2');
      await expect(menuItemNames()).toContain('시작 화면에 고정');
      await closeMenu();
    });

    await step(
      '여러 개를 고르면 열기·잘라내기·삭제이고, 휴지통이 있으면 삭제를 못 고른다',
      async () => {
        await user.click(icon('Blog'));
        await user.keyboard('{Control>}');
        await user.click(icon('GitHub'));
        await user.keyboard('{/Control}');
        await openMenu(icon('GitHub'));
        await expect(menuItemNames()).toEqual(['열기', '잘라내기Ctrl+X', '삭제Delete']);
        await expect(page().getByRole('menuitem', { name: /^삭제/ })).not.toHaveAttribute(
          'aria-disabled',
          'true',
        );
        await closeMenu();
        await user.keyboard('{Control>}');
        await user.click(icon('휴지통'));
        await user.keyboard('{/Control}');
        await openMenu(icon('GitHub'));
        await expect(page().getByRole('menuitem', { name: /^삭제/ })).toHaveAttribute(
          'aria-disabled',
          'true',
        );
        await closeMenu();
        await user.click(page().getByRole('listbox'));
      },
    );

    await step('시작 화면에 고정·고정 해제는 Start 고정됨을 바꾼다', async () => {
      await openMenu(icon('GitHub'));
      await chooseMenuItem(user, '시작 화면에서 고정 해제');
      await expect(useWorkspaceStore.getState().startPins).not.toContain('link:github');
      await openMenu(icon('GitHub'));
      await chooseMenuItem(user, '시작 화면에 고정');
      await expect(useWorkspaceStore.getState().startPins).toContain('link:github');
    });

    await step('링크 복사는 글이면 공유 링크, 외부 링크면 그 주소를 복사한다', async () => {
      const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
      await openMenu(icon('가'));
      await chooseMenuItem(user, '링크 복사');
      await expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/posts/a`);
      await openMenu(icon('GitHub'));
      await chooseMenuItem(user, '링크 복사');
      await expect(writeText).toHaveBeenLastCalledWith('https://github.com/SeoJaeWan');
      writeText.mockRestore();
    });

    await step('새 창에서 열기는 열린 Chrome 창이 있어도 글을 새 Chrome 창으로 연다', async () => {
      await user.dblClick(icon('가'));
      await expect(windowContents()).toHaveLength(1);
      await openMenu(icon('가'));
      await chooseMenuItem(user, '새 창에서 열기');
      await expect(windowContents()).toHaveLength(2);
    });

    // 휴지통이 비었을 때의 비활성은 탐색기 명령과 같은 규칙이다([[파일 탐색기:구성]]).
    await step('휴지통이 비었으면 휴지통 비우기를 고를 수 없다', async () => {
      await openMenu(icon('휴지통'));
      await expect(page().getByRole('menuitem', { name: '휴지통 비우기' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await closeMenu();
    });

    await step('휴지통 비우기는 지우지 않고 메시지 상자만 보여 준다', async () => {
      useWorkspaceStore.getState().trashItems(['link:github']);
      await openMenu(icon('휴지통'));
      await chooseMenuItem(user, '휴지통 비우기');
      const dialog = await page().findByRole('alertdialog');
      await expect(
        within(dialog).getByText('소중한 글이에요 지우지 말아주세요'),
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: '확인' }));
      await waitFor(async () => {
        await expect(page().queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      await expect(isTrashed('link:github')).toBe(true);
    });
  },
};

// 모바일 폭의 바탕화면이다. 뷰포트는 addon-vitest가 실제 브라우저 크기로 바꾼다.
// @codocs [[바탕화면 아이콘:모바일]]
// @codocs [[반응형:입력 차이]]
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ step }) => {
    const user = startUser();
    // GitHub을 누르면 실제로 새 탭이 열리므로 막는다.
    const open = spyOn(window, 'open').mockReturnValue(null);
    await waitFor(async () => {
      await expect(page().getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'false');
    });

    await step('아이콘을 탭하면 연다', async () => {
      await user.click(icon('Blog'));
      await expect(windowContents()).toEqual([createExplorerContent(BLOG_FOLDER_ID)]);
    });

    await step('Ctrl + 탭과 Ctrl + A로 여러 개를 고르지 않는다', async () => {
      await user.keyboard('{Control>}');
      await user.click(icon('GitHub'));
      await user.keyboard('{/Control}');
      await expect(selectedNames()).toEqual(['GitHub']);
      await user.keyboard('{Control>}a{/Control}');
      await expect(selectedNames()).toEqual(['GitHub']);
    });

    await step('메뉴가 열린 동안(길게 누른 뒤) 오는 탭은 아이콘을 열지 않는다', async () => {
      const blog = icon('Blog');
      const count = windowContents().length;
      await openMenu(blog);
      await fireEvent.click(blog);
      await expect(windowContents()).toHaveLength(count);
      await closeMenu();
    });

    await step('아이콘을 끌어 옮기지 않는다', async () => {
      const github = icon('GitHub');
      const over = centerOf(icon('Blog'));
      await holdDrag(github, over);
      await expect(page().queryByRole('tooltip')).not.toBeInTheDocument();
      await fireEvent.pointerUp(github, pointerAt(over));
      await expect(useWorkspaceStore.getState().items['link:github']?.parentId).toBeNull();
    });

    await step('늘 자동 정렬이라 자동 정렬 항목을 고를 수 없고, 눌러도 바뀌지 않는다', async () => {
      const autoArrange = await findSubmenuItem(
        user,
        '보기',
        'menuitemcheckbox',
        '아이콘 자동 정렬',
      );
      await expect(autoArrange).toHaveAttribute('aria-disabled', 'true');
      await user.click(autoArrange);
      await expect(useWorkspaceStore.getState().desktop.autoArrange).toBe(true);
      await fireEvent.keyDown(autoArrange, { key: 'Escape' });
      await waitForMenuClosed();
    });

    open.mockRestore();
  },
};
