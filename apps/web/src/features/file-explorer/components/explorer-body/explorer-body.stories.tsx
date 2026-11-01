import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import {
  getStoryCenter,
  holdStoryDrag,
} from '@/features/file-explorer/utils/story-drag/story-drag';
import { hydrateStoryWorkspace } from '@/features/file-explorer/utils/story-workspace/story-workspace';
import { installStoryClock } from '@/features/taskbar/components/taskbar-apps-layer/story-clock';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import {
  DESKTOP_DROP_TARGET,
  DRAG_REJECTED_ATTRIBUTE,
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
} from '@/shared/hooks/use-item-drag/use-item-drag';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';
import type { ExplorerLocation } from '@/shared/utils/window-rules/window-rules';
import {
  BLOG_FOLDER_ID,
  DEFAULT_EXPLORER_VIEW,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { ExplorerBody } from './explorer-body';
import { BODY_STORY_POSTS } from './story-data';

type ExplorerBodyHostProps = {
  /** 화면 방식 */
  device: DeviceVariant;
  /** 처음 보는 위치 */
  location: ExplorerLocation;
  /** 같은 탭에서 폴더로 갈 때 */
  onNavigate: (location: ExplorerLocation) => void;
  /** 폴더를 새 탭에서 열 때 */
  onOpenInNewTab: (location: ExplorerLocation) => void;
};

type StoryDropTargetProps = {
  /** 놓을 곳 id */
  id: string;
  /** 놓을 곳 이름 */
  name: string;
  /** 보이는 글자 */
  label: string;
};

/**
 * 다른 탐색기 창 본문이나 바탕화면처럼 본문 밖에 있는 놓을 곳 하나.
 * @param props
 * @returns 놓을 곳
 */
function StoryDropTarget(props: StoryDropTargetProps): JSX.Element {
  const { id, name, label } = props;
  const attributes = { [DROP_TARGET_ATTRIBUTE]: id, [DROP_TARGET_NAME_ATTRIBUTE]: name };
  return (
    <div
      {...attributes}
      className="h-size-story-2xs w-size-story-md border border-dashed p-spacing-xs text-center"
    >
      {label}
    </div>
  );
}

/**
 * 창 층이 하는 일 중 위치를 따라가는 일만 하는 틀. 폴더를 열면 그 위치로 바꿔 다시 그리고, 본문 밖의 놓을 곳을 함께 둔다.
 * @param props
 * @returns 탐색기 본문
 */
function ExplorerBodyHost(props: ExplorerBodyHostProps): JSX.Element {
  const {
    device,
    location: initialLocation,
    onNavigate,
    onOpenInNewTab: handleOpenInNewTab,
  } = props;
  const [current, setCurrent] = useState<ExplorerLocation>(initialLocation);

  /**
   * 같은 탭에서 그 위치로 간다.
   * @param next 갈 위치
   */
  function handleNavigate(next: ExplorerLocation): void {
    setCurrent(next);
    onNavigate(next);
  }

  /** Blog 위치로 간다. */
  function handleBlogClick(): void {
    setCurrent(BLOG_FOLDER_ID);
  }

  /** React 위치로 간다. */
  function handleReactClick(): void {
    setCurrent('folder:React');
  }

  return (
    <div className="flex flex-col gap-spacing-sm">
      <div className="flex gap-spacing-sm">
        <button type="button" onClick={handleBlogClick}>
          Blog 위치로
        </button>
        <button type="button" onClick={handleReactClick}>
          React 위치로
        </button>
      </div>
      <div
        className={
          device === 'mobile'
            ? 'flex h-size-window-explorer-height w-full flex-col'
            : 'flex h-size-window-explorer-height w-size-window-explorer-width flex-col'
        }
      >
        <ExplorerBody
          key={current ?? 'desktop'}
          device={device}
          location={current}
          locationIcon={null}
          onNavigate={handleNavigate}
          onOpenInNewTab={handleOpenInNewTab}
        />
      </div>
      <div className="flex gap-spacing-sm">
        <StoryDropTarget id="folder:Next.js" name="Next.js" label="다른 창의 Next.js" />
        <StoryDropTarget id={DESKTOP_DROP_TARGET} name="바탕 화면" label="바탕 화면" />
        <StoryDropTarget id="folder:React" name="React" label="다른 창의 React" />
        <StoryDropTarget id="folder:React/Hooks" name="Hooks" label="다른 창의 Hooks" />
      </div>
    </div>
  );
}

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 동작 스토리다. 실제 작업 공간 저장소에 이은 탐색기 본문을 그린다. 폴더를 열면 위치를 따라가는 틀과 본문 밖의 놓을 곳(다른 창 본문, 바탕화면)을 함께 그린다.
const meta = {
  title: 'Behavior/FileExplorer/ExplorerBody',
  component: ExplorerBodyHost,
  parameters: { layout: 'padded' },
  beforeEach: [
    resetStoryStores,
    async () => {
      await hydrateStoryWorkspace(BODY_STORY_POSTS);
    },
  ],
  args: {
    device: 'desktop',
    location: BLOG_FOLDER_ID,
    onNavigate: fn(),
    onOpenInNewTab: fn(),
  },
} satisfies Meta<typeof ExplorerBodyHost>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 위치에 있는 항목 이름들.
 * @param parentId 위치
 * @returns 이름
 */
function getNamesIn(parentId: string | null): string[] {
  return Object.values(useWorkspaceStore.getState().items)
    .filter((item) => item.parentId === parentId)
    .map((item) => item.name);
}

/**
 * 폴더 내용 목록.
 * @param canvas 캔버스
 * @returns 목록
 */
function getList(canvasElement: HTMLElement): HTMLElement {
  const canvas = within(canvasElement);
  return canvas.getByRole('listbox', { name: '폴더 내용' });
}

/**
 * 폴더 내용 목록의 항목 하나.
 * @param canvas 캔버스
 * @param name 항목 이름
 * @returns 항목
 */
function getOption(canvasElement: HTMLElement, name: string | RegExp): HTMLElement {
  return within(getList(canvasElement)).getByRole('option', { name });
}

/**
 * 고른 항목 이름들.
 * @param canvas 캔버스
 * @returns 이름
 */
function getSelectedNames(canvasElement: HTMLElement): string[] {
  return within(getList(canvasElement))
    .getAllByRole('option')
    .filter((element) => element.getAttribute('aria-selected') === 'true')
    .map((element) => element.textContent);
}

/**
 * 목록 항목들의 글자.
 * @param canvas 캔버스
 * @returns 글자
 */
function getOptionTexts(canvasElement: HTMLElement): string[] {
  return within(getList(canvasElement))
    .getAllByRole('option')
    .map((element) => element.textContent);
}

/**
 * 놓을 곳 이름으로 놓을 곳 요소를 찾는다.
 * @param canvasElement 캔버스 요소
 * @param label 보이는 글자
 * @returns 놓을 곳
 */
function getDropTarget(canvasElement: HTMLElement, label: string): HTMLElement {
  return within(canvasElement).getByText(label);
}

/**
 * 열려 있는 메뉴나 메시지 상자를 찾는다. 닫는 애니메이션이 끝나기 전의 닫힌 것()은 뺀다.
 * @param role 메뉴(menu)나 메시지 상자(alertdialog)의 역할
 * @param name 메시지 상자 이름
 * @returns 열린 것들
 */
function getOpenPopups(role: 'menu' | 'alertdialog', name?: string): HTMLElement[] {
  return screen
    .queryAllByRole(role, name === undefined ? {} : { name })
    .filter((popup) => !popup.hasAttribute('data-closed'));
}

/**
 * 열린 메뉴나 메시지 상자가 나타날 때까지 기다린다.
 * @param role 메뉴(menu)나 메시지 상자(alertdialog)의 역할
 * @param name 메시지 상자 이름
 * @returns 열린 것
 */
async function findOpenPopup(role: 'menu' | 'alertdialog', name?: string): Promise<HTMLElement> {
  return waitFor(() => {
    const [popup] = getOpenPopups(role, name);
    if (popup === undefined) {
      throw new Error('열린 것이 없다');
    }
    return popup;
  });
}

/**
 * 열린 메뉴의 항목을 찾는다.
 * @param name 항목 이름
 * @returns 메뉴 항목
 */
async function findMenuItem(name: string | RegExp): Promise<HTMLElement> {
  return within(await findOpenPopup('menu')).findByRole('menuitem', { name });
}

/**
 * 메뉴나 메시지 상자가 닫힐 때까지 기다린다.
 * @param role 메뉴(menu)나 메시지 상자(alertdialog)의 역할
 */
async function waitForPopupGone(role: 'menu' | 'alertdialog'): Promise<void> {
  await waitFor(async () => {
    await expect(getOpenPopups(role)).toHaveLength(0);
  });
}

/** 옮겨 간 회고를 Blog로 되돌린다. */
function restoreReview(): void {
  useWorkspaceStore.getState().moveItems(['post:b'], BLOG_FOLDER_ID);
}

// 메뉴와 메시지 상자(Base UI)는 닫는 애니메이션이 끝나기 전까지 포커스 가드(aria-hidden이면서 포커스를 받는 요소)를 남긴다.
// 외부 라이브러리가 만드는 요소라 메뉴나 메시지 상자를 여는 스토리에서만 이 규칙을 끈다.
const FOCUS_GUARD_RULE = { id: 'aria-hidden-focus', enabled: false } as const;

/** 항목을 고르고, 열고, 방향키와 끄는 사각형으로 고른다 */
export const Select: Story = {
  play: async ({ canvasElement, args, step }) => {
    const { onNavigate: handleNavigate } = args;
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:조작]]
    await step('상태 줄에 항목 수를 보인다', async () => {
      await expect(canvas.getByText('항목 3개')).toBeInTheDocument();
    });

    await step('항목을 클릭하면 그 항목만 고르고 상태 줄에 고른 항목 수를 보인다', async () => {
      await user.click(getOption(canvasElement, 'React'));
      await expect(getSelectedNames(canvasElement)).toEqual(['React']);
      await expect(canvas.getByText('1개 항목 선택함')).toBeInTheDocument();
    });

    await step('Ctrl + 클릭하면 선택에 더한다', async () => {
      await user.keyboard('{Control>}');
      await user.click(getOption(canvasElement, '회고'));
      await user.keyboard('{/Control}');
      await expect(getSelectedNames(canvasElement)).toEqual(['React', '회고']);
    });

    await step('Shift + 클릭하면 표시 순서로 범위를 고른다', async () => {
      await user.click(getOption(canvasElement, 'Next.js'));
      await user.keyboard('{Shift>}');
      await user.click(getOption(canvasElement, '회고'));
      await user.keyboard('{/Shift}');
      await expect(getSelectedNames(canvasElement)).toEqual(['Next.js', 'React', '회고']);
    });

    await step('Ctrl + A는 모두 고른다', async () => {
      await user.click(getOption(canvasElement, 'React'));
      await user.keyboard('{Control>}a{/Control}');
      await expect(getSelectedNames(canvasElement)).toHaveLength(3);
    });

    await step('빈 곳에서 끄는 사각형은 그려진 자리에 걸친 항목을 고른다', async () => {
      const list = getList(canvasElement);
      const listBox = list.getBoundingClientRect();
      const target = getStoryCenter(getOption(canvasElement, '회고'));
      const start = { x: listBox.right - 10, y: listBox.bottom - 10 };
      const held = await holdStoryDrag(list, [start, target]);
      await held.release();
      await expect(getSelectedNames(canvasElement)).toEqual(['회고']);
    });

    await step('글을 더블클릭하면 Chrome 창으로 연다', async () => {
      await user.dblClick(getOption(canvasElement, '회고'));
      const { windows, order } = useWindowStore.getState();
      await expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
    });

    await step('폴더를 고르고 Enter를 누르면 같은 탭에서 그 폴더로 간다', async () => {
      await user.click(getOption(canvasElement, 'React'));
      await user.keyboard('{Enter}');
      await expect(handleNavigate).toHaveBeenCalledWith('folder:React');
    });
  },
};

/** 보통 아이콘 보기에서 자세히 보기로 바꾸고 열 제목으로 정렬한다 */
export const ViewAndSort: Story = {
  play: async ({ canvasElement, args, step }) => {
    const { onNavigate: handleNavigate } = args;
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:보기와 정렬]]
    await step('기본 보기는 보통 아이콘이라 열 제목이 없다', async () => {
      await expect(canvas.queryByRole('button', { name: '수정한 날짜' })).not.toBeInTheDocument();
    });

    await step('이름 내림차순이어도 폴더를 앞에 둔다', async () => {
      useWorkspaceStore.getState().setExplorerView(BLOG_FOLDER_ID, { sortDirection: 'desc' });
      await waitFor(async () => {
        await expect(getOptionTexts(canvasElement)).toEqual(['React', 'Next.js', '회고']);
      });
      useWorkspaceStore
        .getState()
        .setExplorerView(BLOG_FOLDER_ID, { sortDirection: DEFAULT_EXPLORER_VIEW.sortDirection });
    });

    await step('상태 줄의 자세히 버튼을 누르면 자세히 보기로 바꾼다', async () => {
      await user.click(canvas.getByRole('button', { name: '자세히' }));
      await expect(canvas.getByRole('button', { name: '수정한 날짜' })).toBeInTheDocument();
    });

    await step('자세히 보기의 유형 칸은 폴더를 "파일 폴더"로 보인다', async () => {
      const row = within(getList(canvasElement)).getByRole('option', { name: /^React/ });
      await expect(within(row).getByText('파일 폴더')).toBeInTheDocument();
    });

    await step('열 제목에서 누른 Enter는 고른 항목을 열지 않는다', async () => {
      await user.click(within(getList(canvasElement)).getByRole('option', { name: /^React/ }));
      canvas.getByRole('button', { name: '유형' }).focus();
      await user.keyboard('{Enter}');
      await expect(handleNavigate).not.toHaveBeenCalled();
    });

    await step('열 제목을 누르면 그 열로 정렬한다', async () => {
      await user.click(canvas.getByRole('button', { name: '유형' }));
      await expect(useWorkspaceStore.getState().explorerViews[BLOG_FOLDER_ID]?.sortBy).toBe('type');
    });

    await step('보기는 폴더마다 따로 기억한다', async () => {
      await expect(useWorkspaceStore.getState().explorerViews['folder:React']).toBeUndefined();
    });
  },
};

/** 폴더 이름을 바꾸고, 새 폴더를 만들고, 고른 항목을 지운다 */
export const RenameAndDelete: Story = {
  parameters: { a11y: { config: { rules: [FOCUS_GUARD_RULE] } } },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:조작]]
    await step('아무것도 고르지 않으면 잘라내기가 비활성이다', async () => {
      await expect(canvas.getByRole('button', { name: '잘라내기' })).toBeDisabled();
    });

    await step('폴더 하나를 고르지 않으면 이름 바꾸기가 비활성이다', async () => {
      await user.click(getOption(canvasElement, '회고'));
      await expect(canvas.getByRole('button', { name: '이름 바꾸기' })).toBeDisabled();
    });

    await step('F2를 누르면 고른 폴더의 이름을 바꾼다', async () => {
      await user.click(getOption(canvasElement, 'React'));
      await user.keyboard('{F2}');
      await expect(canvas.getByRole('textbox', { name: '새 이름' })).toHaveValue('React');
    });

    // @codocs [[항목과 폴더:폴더 이름]]
    await step('쓸 수 없는 문자는 입력되지 않게 막고 말풍선으로 알린다', async () => {
      const field = canvas.getByRole('textbox', { name: '새 이름' });
      await user.clear(field);
      await user.type(field, 'a*');
      await expect(field).toHaveValue('a');
      // @codocs [[접근성:역할]]
      const balloon = screen.getByRole('alert');
      await expect(balloon).toHaveTextContent('다음 문자를 사용할 수 없습니다');
      await expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveAttribute(
        'aria-describedby',
        balloon.id,
      );
    });

    // @codocs [[파일 탐색기:조작]]
    await step('같은 위치에 같은 이름의 폴더가 있으면 메시지 상자로 알린다', async () => {
      await user.clear(canvas.getByRole('textbox', { name: '새 이름' }));
      await user.keyboard('Next.js{Enter}');
      const dialog = await findOpenPopup('alertdialog');
      await expect(
        within(dialog).getByText('이 위치에 같은 이름의 폴더가 이미 있습니다.'),
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: '확인' }));
    });

    // @codocs [[항목과 폴더:폴더 이름]]
    await step('예약 이름이면 메시지 상자를 보인 뒤 이름 바꾸기로 돌아간다', async () => {
      await user.clear(canvas.getByRole('textbox', { name: '새 이름' }));
      await user.keyboard('LPT1{Enter}');
      const dialog = await findOpenPopup('alertdialog');
      await expect(
        within(dialog).getByText('지정한 장치 이름이 잘못되었습니다.'),
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: '확인' }));
      await expect(canvas.getByRole('textbox', { name: '새 이름' })).toHaveValue('LPT1');
      await expect(useWorkspaceStore.getState().items['folder:React']?.name).toBe('React');
      await user.keyboard('{Escape}');
    });

    // @codocs [[파일 탐색기:조작]]
    await step('새로 만들기는 새 폴더를 만들고 이름 바꾸기를 시작한다', async () => {
      await user.click(canvas.getByRole('button', { name: '새로 만들기' }));
      await expect(canvas.getByRole('textbox', { name: '새 이름' })).toHaveValue('새 폴더');
      await user.keyboard('{Enter}');
    });

    await step('Delete를 누르면 고른 항목을 휴지통으로 보낸다', async () => {
      await user.click(getOption(canvasElement, '회고'));
      await user.keyboard('{Delete}');
      await expect(getNamesIn(RECYCLE_BIN_ID)).toEqual(['회고']);
    });
  },
};

/** 항목을 잘라내 다른 폴더에 붙여넣는다 */
export const CutAndPaste: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:조작]]
    await step('잘라낸 것이 없으면 붙여넣기가 비활성이다', async () => {
      await expect(canvas.getByRole('button', { name: '붙여넣기' })).toBeDisabled();
    });

    await step(
      '잘라낸 항목은 흐리게 그리고, 지금 위치에 있으면 붙여넣기가 비활성이다',
      async () => {
        await user.click(getOption(canvasElement, '회고'));
        await user.keyboard('{Control>}x{/Control}');
        await expect(getOption(canvasElement, '회고')).toHaveAttribute('data-cut', 'true');
        await expect(canvas.getByRole('button', { name: '붙여넣기' })).toBeDisabled();
      },
    );

    await step('Ctrl + X 뒤 다른 폴더에서 Ctrl + V를 누르면 항목을 옮긴다', async () => {
      await user.click(canvas.getByRole('button', { name: 'React 위치로' }));
      await fireEvent.keyDown(getList(canvasElement), { key: 'v', ctrlKey: true });
      await waitFor(async () => {
        await expect(getNamesIn('folder:React')).toContain('회고');
      });
    });

    await step('폴더를 자기 안으로는 붙여넣을 수 없다', async () => {
      await user.click(canvas.getByRole('button', { name: 'Blog 위치로' }));
      await user.click(getOption(canvasElement, 'React'));
      await user.keyboard('{Control>}x{/Control}');
      await user.click(canvas.getByRole('button', { name: 'React 위치로' }));
      await expect(canvas.getByRole('button', { name: '붙여넣기' })).toBeDisabled();
    });
  },
};

/** 바탕 화면에서 Blog 폴더를 삭제한다 */
export const DesktopFolder: Story = {
  args: { location: null },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:조작]]
    await step('Blog 폴더도 삭제해 휴지통으로 보낼 수 있다', async () => {
      await user.click(getOption(canvasElement, 'Blog'));
      await user.click(canvas.getByRole('button', { name: '삭제' }));
      await expect(getNamesIn(RECYCLE_BIN_ID)).toEqual(['Blog']);
    });
  },
};

/** 항목과 빈 곳을 우클릭해 메뉴를 연다 */
export const ContextMenu: Story = {
  parameters: { a11y: { config: { rules: [FOCUS_GUARD_RULE] } } },
  play: async ({ canvasElement, args, step }) => {
    const { onOpenInNewTab: handleOpenInNewTab } = args;
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:우클릭 메뉴]]
    await step('항목을 우클릭하면 그 항목의 메뉴를 연다', async () => {
      await userEvent.pointer({ keys: '[MouseRight]', target: getOption(canvasElement, 'React') });
      await expect(await findMenuItem(/이름 바꾸기/)).toBeInTheDocument();
      await user.keyboard('{Escape}');
      await waitForPopupGone('menu');
    });

    await step('빈 곳을 우클릭하면 빈 곳 메뉴를 연다', async () => {
      await userEvent.pointer({ keys: '[MouseRight]', target: getList(canvasElement) });
      await expect(await findMenuItem(/붙여넣기/)).toBeInTheDocument();
      await user.keyboard('{Escape}');
      await waitForPopupGone('menu');
    });

    await step('새 탭에서 열기는 그 폴더를 새 탭으로 연다', async () => {
      await userEvent.pointer({ keys: '[MouseRight]', target: getOption(canvasElement, 'React') });
      await user.click(await findMenuItem(/새 탭에서 열기/));
      await expect(handleOpenInNewTab).toHaveBeenCalledWith('folder:React');
      await waitForPopupGone('menu');
    });
  },
};

/** 휴지통을 열어 보고, 항목을 복원하고, 비운다 */
export const RecycleBin: Story = {
  parameters: { a11y: { config: { rules: [FOCUS_GUARD_RULE] } } },
  args: { location: RECYCLE_BIN_ID },
  beforeEach: () => {
    useWorkspaceStore.getState().trashItems(['post:b']);
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:휴지통 보기]]
    await step('휴지통은 원래 위치 열이 있는 자세히 보기다', async () => {
      await expect(canvas.getByRole('button', { name: '원래 위치' })).toBeInTheDocument();
    });

    await step('휴지통 안의 항목은 더블클릭해도 열리지 않는다', async () => {
      await user.dblClick(within(getList(canvasElement)).getByRole('option', { name: /^회고/ }));
      await expect(useWindowStore.getState().order).toEqual([]);
    });

    // @codocs [[파일 탐색기:조작]]
    // @codocs [[항목 조작:끌기]]
    await step('휴지통 안의 항목은 끌어 옮길 수 없다', async () => {
      const row = within(getList(canvasElement)).getByRole('option', { name: /^회고/ });
      const target = getStoryCenter(getDropTarget(canvasElement, '바탕 화면'));
      const held = await holdStoryDrag(row, [getStoryCenter(row), target]);
      await held.release();
      await expect(getNamesIn(RECYCLE_BIN_ID)).toContain('회고');
    });

    // @codocs [[파일 탐색기:우클릭 메뉴]]
    await step(
      '휴지통의 빈 곳을 우클릭하면 정렬 기준·새로 고침·휴지통 비우기 메뉴를 연다',
      async () => {
        await userEvent.pointer({ keys: '[MouseRight]', target: getList(canvasElement) });
        await waitFor(async () => {
          await expect(
            within(await findOpenPopup('menu'))
              .getAllByRole('menuitem')
              .map((item) => item.textContent.replace(/\s+/g, '')),
          ).toEqual(['정렬기준', '새로고침', '휴지통비우기']);
        });
      },
    );

    await step('정렬 기준에서 삭제한 날짜를 고르면 휴지통을 삭제한 날짜로 정렬한다', async () => {
      (await findMenuItem(/정렬 기준/)).focus();
      await user.keyboard('{ArrowRight}');
      const deleted = await screen.findByRole('menuitemradio', { name: '삭제한 날짜' });
      deleted.focus();
      await user.keyboard('{Enter}');
      await expect(useWorkspaceStore.getState().explorerViews[RECYCLE_BIN_ID]?.sortBy).toBe(
        'modified',
      );
      await waitForPopupGone('menu');
    });

    await step('새로 고침을 고르면 항목을 잠깐 숨겼다가 다시 보인다', async () => {
      const delay = readCssTimeVariable('--motion-duration-faster');
      const clock = installStoryClock([delay]);
      try {
        await userEvent.pointer({ keys: '[MouseRight]', target: getList(canvasElement) });
        await user.click(await findMenuItem(/새로 고침/));
        await expect(within(getList(canvasElement)).queryAllByRole('option')).toHaveLength(0);
        clock.tick(delay);
        await expect(
          await within(getList(canvasElement)).findByRole('option', { name: /^회고/ }),
        ).toBeInTheDocument();
      } finally {
        clock.restore();
      }
    });

    // @codocs [[접근성:포커스]]
    await step(
      '휴지통 비우기를 고르면 메시지 상자를 보이고 닫으면 항목 자리로 돌아온다',
      async () => {
        await userEvent.pointer({ keys: '[MouseRight]', target: getList(canvasElement) });
        await user.click(await findMenuItem(/휴지통 비우기/));
        await expect(await findOpenPopup('alertdialog', '휴지통 비우기')).toBeInTheDocument();
        await expect(getNamesIn(RECYCLE_BIN_ID)).toEqual(['회고']);
        await user.keyboard('{Escape}');
        await waitForPopupGone('alertdialog');
        await waitFor(() =>
          expect(canvasElement.querySelector('[data-window-focus]')).toHaveFocus(),
        );
      },
    );

    // @codocs [[파일 탐색기:휴지통 보기]]
    // @codocs [[접근성:포커스]]
    await step(
      '휴지통 비우기 버튼을 누르면 메시지 상자를 보이고 취소하면 버튼으로 돌아온다',
      async () => {
        const emptyButton = canvas.getByRole('button', { name: '휴지통 비우기' });
        await user.click(emptyButton);
        await expect(await findOpenPopup('alertdialog', '휴지통 비우기')).toBeInTheDocument();
        await user.keyboard('{Escape}');
        await waitForPopupGone('alertdialog');
        await waitFor(() => expect(emptyButton).toHaveFocus());
      },
    );

    await step('복원을 누르면 고른 항목을 원래 위치로 돌려놓는다', async () => {
      await user.click(within(getList(canvasElement)).getByRole('option', { name: /^회고/ }));
      await user.click(canvas.getByRole('button', { name: '복원' }));
      await expect(getNamesIn(BLOG_FOLDER_ID)).toContain('회고');
    });

    // @codocs [[파일 탐색기:우클릭 메뉴]]
    await step('휴지통이 비었으면 휴지통 비우기를 고를 수 없다', async () => {
      await userEvent.pointer({ keys: '[MouseRight]', target: getList(canvasElement) });
      await expect(await findMenuItem(/휴지통 비우기/)).toHaveAttribute('aria-disabled', 'true');
      await user.keyboard('{Escape}');
      await waitForPopupGone('menu');
    });
  },
};

/** 휴지통에 보낸 폴더 안의 항목을 검색한다 */
export const RecycleBinFolder: Story = {
  args: { location: RECYCLE_BIN_ID },
  beforeEach: () => {
    useWorkspaceStore.getState().trashItems(['folder:React']);
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step('휴지통에서는 휴지통 항목 안에서 찾는다', async () => {
      await user.type(canvas.getByRole('searchbox', { name: '검색' }), '훅');
      await expect(within(getList(canvasElement)).getAllByRole('option')).toHaveLength(1);
    });

    // @codocs [[파일 탐색기:휴지통 보기]]
    await step('휴지통에 보낸 폴더 안의 항목만 고르면 복원이 비활성이다', async () => {
      await user.click(within(getList(canvasElement)).getByRole('option', { name: /^훅 정리/ }));
      await expect(canvas.getByRole('button', { name: '복원' })).toBeDisabled();
    });
  },
};

/** 항목을 끌어 폴더, 다른 창 본문, 바탕 화면에 놓는다 */
export const DragItems: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:조작]]
    // @codocs [[항목 조작:끌기]]
    await step(
      '항목을 같은 창의 폴더 위로 끌면 이동 툴팁과 강조를 보이고, 놓으면 그 폴더로 옮긴다',
      async () => {
        const item = getOption(canvasElement, '회고');
        const folder = getOption(canvasElement, 'React');
        const held = await holdStoryDrag(item, [getStoryCenter(item), getStoryCenter(folder)]);
        await expect(screen.getByRole('tooltip')).toHaveTextContent('React(으)로 이동');
        await expect(getOption(canvasElement, 'React')).toHaveAttribute('data-drop-active', 'true');
        await held.release();
        await expect(getNamesIn('folder:React')).toContain('회고');
        restoreReview();
      },
    );

    await step('다른 탐색기 창 본문에 놓으면 그 창이 보는 폴더로 옮긴다', async () => {
      const item = await waitFor(() => getOption(canvasElement, '회고'));
      const target = getStoryCenter(getDropTarget(canvasElement, '다른 창의 Next.js'));
      const held = await holdStoryDrag(item, [getStoryCenter(item), target]);
      await held.release();
      await expect(getNamesIn('folder:Next.js')).toContain('회고');
      restoreReview();
    });

    await step('바탕화면에 놓으면 바탕화면으로 옮긴다', async () => {
      const item = await waitFor(() => getOption(canvasElement, '회고'));
      const target = getStoryCenter(getDropTarget(canvasElement, '바탕 화면'));
      const held = await holdStoryDrag(item, [getStoryCenter(item), target]);
      await held.release();
      await expect(getNamesIn(null)).toContain('회고');
      restoreReview();
    });

    await step('폴더를 자기 하위 폴더로 끌어 놓으면 제자리다', async () => {
      const item = await waitFor(() => getOption(canvasElement, 'React'));
      const target = getStoryCenter(getDropTarget(canvasElement, '다른 창의 React'));
      const held = await holdStoryDrag(item, [getStoryCenter(item), target]);
      await held.release();
      await expect(getNamesIn(BLOG_FOLDER_ID)).toContain('React');
    });

    await step(
      '옮길 수 없는 곳 위에서는 이동 툴팁 없이 not-allowed 커서를 보이고, 놓으면 되돌린다',
      async () => {
        const item = getOption(canvasElement, 'React');
        const target = getStoryCenter(getDropTarget(canvasElement, '다른 창의 Hooks'));
        const held = await holdStoryDrag(item, [getStoryCenter(item), target]);
        await expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        await expect(document.documentElement).toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
        await held.release();
        await expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
      },
    );

    await step(
      '지금 보는 위치(이 창의 본문)는 놓을 곳이 아닐 뿐이라 not-allowed 커서를 보이지 않는다',
      async () => {
        const item = getOption(canvasElement, '회고');
        const list = getList(canvasElement).getBoundingClientRect();
        const held = await holdStoryDrag(item, [
          getStoryCenter(item),
          { x: list.right - 10, y: list.bottom - 10 },
        ]);
        await expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        await expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
        await held.release();
      },
    );

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step('검색 중에는 결과 항목을 이 창 본문에 놓아도 제자리다', async () => {
      await user.type(canvas.getByRole('searchbox', { name: '검색' }), '훅');
      const row = within(getList(canvasElement)).getByRole('option', { name: /^훅 정리/ });
      const list = getList(canvasElement).getBoundingClientRect();
      const held = await holdStoryDrag(row, [
        getStoryCenter(row),
        { x: list.right - 10, y: list.bottom - 10 },
      ]);
      await held.release();
      await expect(getNamesIn('folder:React')).toContain('훅 정리');
    });
  },
};

/** 현재 폴더 안에서 검색한다 */
export const Search: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    function getSearchBox(): HTMLElement {
      return canvas.getByRole('searchbox', { name: '검색' });
    }

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step(
      '검색어를 넣으면 현재 폴더와 하위 폴더에서 찾은 항목을 보이고 위치 열을 더한다',
      async () => {
        await user.type(getSearchBox(), '훅');
        await expect(getOptionTexts(canvasElement)).toEqual([expect.stringMatching(/^훅 정리/)]);
        await expect(canvas.getByRole('button', { name: '위치' })).toBeInTheDocument();
      },
    );

    await step('검색어를 지우면 원래 보기로 돌아간다', async () => {
      await user.clear(getSearchBox());
      await expect(canvas.getByText('항목 3개')).toBeInTheDocument();
    });

    await step('다른 위치로 가면 검색어를 비운다', async () => {
      await user.type(getSearchBox(), '훅');
      await user.click(canvas.getByRole('button', { name: 'React 위치로' }));
      await expect(getSearchBox()).toHaveValue('');
    });

    await step('다른 위치로 갔다가 돌아와도 앞의 검색어가 되살아나지 않는다', async () => {
      await user.type(getSearchBox(), '훅');
      await user.click(canvas.getByRole('button', { name: 'Blog 위치로' }));
      await user.click(canvas.getByRole('button', { name: 'React 위치로' }));
      await user.click(canvas.getByRole('button', { name: 'Blog 위치로' }));
      await expect(getSearchBox()).toHaveValue('');
    });
  },
};

/** 모바일 폭에서는 폴더를 탭해 열고, 항목을 끌지 않고, 검색 줄을 따로 연다 */
export const Mobile: Story = {
  args: { device: 'mobile' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement, args, step }) => {
    const { onNavigate: handleNavigate } = args;
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:폴더 안 검색]]
    await step('모바일 주소 줄에는 검색 상자 대신 검색 버튼이 있다', async () => {
      await expect(canvas.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '검색' })).toBeInTheDocument();
    });

    await step(
      '검색 버튼을 누르면 ← 버튼과 검색 상자로 바뀌고 검색 상자에 포커스를 준다',
      async () => {
        await user.click(canvas.getByRole('button', { name: '검색' }));
        await expect(canvas.getByRole('button', { name: '검색 닫기' })).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument();
        await waitFor(async () => {
          await expect(canvas.getByRole('searchbox', { name: '검색' })).toHaveFocus();
        });
      },
    );

    await step('입력이 비어 있으면 원래 폴더 내용을, 입력하면 검색 결과를 보여 준다', async () => {
      await expect(canvas.getByText('항목 3개')).toBeInTheDocument();
      await user.keyboard('훅');
      await expect(getOptionTexts(canvasElement)).toEqual([expect.stringMatching(/^훅 정리/)]);
    });

    await step('← 버튼은 검색어를 지우고 원래 주소 줄로 돌아간다', async () => {
      await user.click(canvas.getByRole('button', { name: '검색 닫기' }));
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
      await expect(canvas.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
      await expect(canvas.getByText('항목 3개')).toBeInTheDocument();
    });

    await step('검색 상자에서 Esc를 누르면 검색어를 지우고 원래 주소 줄로 돌아간다', async () => {
      await user.click(canvas.getByRole('button', { name: '검색' }));
      await user.keyboard('훅');
      await user.keyboard('{Escape}');
      await expect(canvas.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
      await expect(canvas.getByText('항목 3개')).toBeInTheDocument();
      await user.click(canvas.getByRole('button', { name: '검색' }));
      await expect(canvas.getByRole('searchbox', { name: '검색' })).toHaveValue('');
    });

    await step('다른 위치로 가면 검색을 끝내고 원래 주소 줄로 돌아간다', async () => {
      await user.keyboard('훅');
      await user.click(canvas.getByRole('button', { name: 'React 위치로' }));
      await expect(canvas.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '검색' })).toBeInTheDocument();
      await user.click(canvas.getByRole('button', { name: 'Blog 위치로' }));
    });

    // @codocs [[파일 탐색기:조작]]
    // @codocs [[반응형:입력 차이]]
    await step('모바일은 항목을 끌어 옮기지 않는다', async () => {
      const item = getOption(canvasElement, '회고');
      const folder = getOption(canvasElement, 'React');
      const held = await holdStoryDrag(item, [getStoryCenter(item), getStoryCenter(folder)]);
      await held.release();
      await expect(getNamesIn(BLOG_FOLDER_ID)).toContain('회고');
    });

    await step('모바일은 폴더를 탭하면 같은 탭에서 그 폴더로 간다', async () => {
      await user.click(getOption(canvasElement, 'React'));
      await expect(handleNavigate).toHaveBeenCalledWith('folder:React');
    });
  },
};
