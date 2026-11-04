import windowChromeExport from '@figma/patterns/window/chrome/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import { expect, fireEvent, fn, screen, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { BREAKPOINTS } from '@seojaewan/design-system';
import { FigmaFrame, StoryStage } from '@seojaewan/design-system/story';

import { dragStoryPointer } from '@/features/window/story-pointer';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import {
  type ChromeTabPage,
  createChromeContent,
  getActiveChromePage,
} from '@/shared/utils/chrome-tabs/chrome-tabs';
import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { ChromeWindowLayer } from './chrome-window-layer';
import { mockPostBodies } from './components/chrome-post-tab/story-fetch';
import { useChromeZoomStore } from './stores/chrome-zoom-store/chrome-zoom-store';

const POSTS = [
  { slug: 'react-19-hooks', title: '리액트 19 훅 정리', folderPath: ['React'], date: '2026-10-20' },
  { slug: 'rsc', title: '리액트 서버 컴포넌트', folderPath: ['React'], date: '2026-10-12' },
  { slug: 'next-cache', title: 'Next.js 캐시', folderPath: ['Next.js'], date: '2026-09-01' },
] as const;

const WORK_AREA = { width: 1920, height: 1032 } as const;

const imageBody: readonly PostBlock[] = [
  {
    type: 'image',
    url: 'https://images.seojaewan.com/notion/a',
    caption: [{ text: '구조 그림', link: null }],
  },
];

// `Preview` 스토리가 `history.replaceState`로 바꾸려 한 주소를 적어 두는 곳이다.
const replaceStateCalls: string[] = [];

type ChromeLayerHostProps = {
  /** 화면 방식 */
  device: DeviceVariant;
  /** 마지막 탭을 닫아 창을 닫을 때 */
  onClose: () => void;
};

/** 창 층이 넘기는 최소화는 이 스토리에서 쓰지 않는다. */
function ignoreMinimize(): void {}

/**
 * 창 저장소에서 Chrome 창 내용을 읽어 Chrome 층을 그린다(창 층이 하는 일). 저장소에 Chrome 창이 여럿이면 모두 그린다.
 * 창 자리는 화면을 세로로 나눠 채운다. 피그마 Window/Chrome의 `window` 노드(창 틀, 가로·세로 FILL) 크기 방식을 FigmaFrame으로 준다.
 * @param props
 * @returns Chrome 층
 */
function ChromeLayerHost(props: ChromeLayerHostProps): JSX.Element {
  const { device, onClose: handleClose } = props;
  const windows = useWindowStore((state) => state.windows);
  return (
    <StoryStage placement="fill">
      {Object.entries(windows).map(([id, target]) =>
        target.content.app === 'chrome' ? (
          <FigmaFrame key={id} source={windowChromeExport} node="window">
            <ChromeWindowLayer
              windowId={id}
              content={target.content}
              device={device}
              controls={{
                isInactive: false,
                placement: 'default',
                onMinimize: ignoreMinimize,
                onClose: handleClose,
              }}
            />
          </FigmaFrame>
        ) : null,
      )}
    </StoryStage>
  );
}

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 동작 스토리다. 실제 창 저장소·작업 공간 저장소에 이은 Chrome 층을 그린다. 글 본문은 서버 경로라 `fetch`를 가짜로 바꾼다.
// 상황마다 `beforeEach`에서 글 색인을 채우고 Chrome 창을 연 채로 시작한다.
const meta = {
  title: 'Behavior/Chrome/ChromeWindowLayer',
  component: ChromeLayerHost,
  parameters: {
    layout: 'fullscreen',
    // 색은 바꾸지 않는다. Windows 모양을 유지하기로 함([[접근성:색 대비]]).
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  beforeEach: resetStoryStores,
  args: { device: 'desktop', onClose: fn() },
} satisfies Meta<typeof ChromeLayerHost>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 글 색인을 채우고 저장소에 올라올 때까지 기다린다.
 */
async function hydratePosts(): Promise<void> {
  hydrateWorkspaceStore(POSTS);
  await waitFor(async () => {
    await expect(useWorkspaceStore.getState().items['post:rsc']).toBeDefined();
  });
}

/**
 * 페이지 하나를 보는 Chrome 창을 연다.
 * @param page 볼 페이지
 */
function openChromeWindow(page: ChromeTabPage = { kind: 'new-tab' }): void {
  useWindowStore.getState().open('chrome', WORK_AREA, createChromeContent(page));
}

/**
 * 첫 Chrome 창이 지금 보는 페이지.
 * @returns 페이지
 */
function currentPage(): ChromeTabPage | null {
  for (const target of Object.values(useWindowStore.getState().windows)) {
    if (target.content.app === 'chrome') {
      return getActiveChromePage(target.content);
    }
  }
  return null;
}

/**
 * 주소창.
 * @returns 주소창 입력칸
 */
function addressBar(): HTMLInputElement {
  const input = screen.getByRole('combobox', { name: '주소 및 검색창' });
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('주소창이 입력칸이 아니다');
  }
  return input;
}

/**
 * 탭 제목들.
 * @returns 탭 제목
 */
function tabTitles(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent);
}

/**
 * 탭의 닫기 버튼. 닫기 버튼은 탭(`role="tab"`) 옆, 탭 묶음 안에 있다.
 * @param tab 탭
 * @returns 닫기 버튼
 */
function closeButtonOf(tab: HTMLElement | undefined): HTMLElement {
  return within(tab?.parentElement ?? document.body).getByLabelText('탭 닫기');
}

/**
 * 찾기 막대.
 * @returns 찾기 막대
 */
function findBar(): HTMLElement {
  return screen.getByRole('search', { name: '페이지에서 찾기' });
}

/**
 * 찾기 막대 입력칸.
 * @returns 입력칸
 */
function findInput(): HTMLInputElement {
  const input = within(findBar()).getByRole('searchbox');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('찾기 입력칸이 입력칸이 아니다');
  }
  return input;
}

/**
 * ⋮ 메뉴의 확대/축소 줄.
 * @returns 확대/축소 줄
 */
function zoomRow(): HTMLElement {
  return screen.getByRole('group', { name: '확대/축소' });
}

/**
 * 요소에서 Ctrl + 키를 눌러 Chrome 창 단축키를 보낸다.
 * @param target 키를 받을 요소
 * @param key 키
 * @returns 실제 브라우저의 같은 동작을 막았으면 true
 */
function pressCtrl(target: HTMLElement, key: string): boolean {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * ⋮ 메뉴를 연다.
 */
async function openMoreMenu(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: '더보기' }));
}

/**
 * Ctrl+F로 찾기 막대를 열고 글자를 입력한다.
 * @param query 찾는 글자
 */
async function openFindBar(query: string): Promise<void> {
  pressCtrl(addressBar(), 'f');
  await userEvent.type(await waitForFindInput(), query);
}

/**
 * 찾기 입력칸이 나타날 때까지 기다린다.
 * @returns 입력칸
 */
async function waitForFindInput(): Promise<HTMLInputElement> {
  await waitFor(async () => {
    await expect(findBar()).toBeInTheDocument();
  });
  return findInput();
}

/**
 * 탭 제목들이 기대한 값이 될 때까지 기다린다.
 * @param titles 기대한 탭 제목
 */
async function expectTabTitles(titles: string[]): Promise<void> {
  await waitFor(async () => {
    await expect(tabTitles()).toEqual(titles);
  });
}

// @codocs [[Chrome:구성]]
/** 탭을 연다, 고른다, 닫는다, 끌어 옮긴다. 마지막 탭을 닫으면 창을 닫는다 */
export const Tabs: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow({ kind: 'post', slug: 'rsc' });
    return mockPostBodies({});
  },
  play: async ({ args, step }) => {
    await screen.findByRole('tab', { name: /리액트 서버 컴포넌트/ });

    await step('새 탭 버튼은 새 탭 페이지를 새 탭으로 열고 고른다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
      await expectTabTitles(['리액트 서버 컴포넌트', '새 탭']);
      await expect(screen.getByRole('tab', { name: /새 탭/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    await step('고른 탭만 Tab 키로 닿는다', async () => {
      await expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, 0]);
    });

    await step('탭에서 ←를 누르면 앞 탭을 고르고 그 탭에 포커스를 옮긴다', async () => {
      screen.getByRole('tab', { name: /새 탭/ }).focus();
      await userEvent.keyboard('{ArrowLeft}');
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
      await waitFor(async () => {
        await expect(screen.getByRole('tab', { name: /리액트 서버 컴포넌트/ })).toHaveFocus();
      });
    });

    await step('탭을 누르면 그 탭으로 바꾼다', async () => {
      await userEvent.click(screen.getByRole('tab', { name: /새 탭/ }));
      await expect(currentPage()).toEqual({ kind: 'new-tab' });
      await userEvent.click(screen.getByRole('tab', { name: /리액트 서버 컴포넌트/ }));
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
    });

    await step('탭을 끌어 순서를 바꾼다', async () => {
      const [first, second] = screen.getAllByRole('tab');
      if (first === undefined || second === undefined) {
        throw new Error('탭이 둘이 아니다');
      }
      const from = second.getBoundingClientRect();
      const to = first.getBoundingClientRect();
      const y = from.y + from.height / 2;
      await dragStoryPointer(second, [
        { x: from.x + from.width / 2, y },
        { x: (from.x + to.x + to.width / 2) / 2, y },
        { x: to.x + to.width / 2, y },
      ]);
      await expectTabTitles(['새 탭', '리액트 서버 컴포넌트']);
    });

    await step('× 버튼으로 탭을 닫는다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
      await expect(screen.getAllByRole('tab')).toHaveLength(3);
      await userEvent.click(closeButtonOf(screen.getAllByRole('tab')[0]));
      await expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    // @codocs [[접근성:포커스]]
    await step('탭에서 Delete를 누르면 그 탭을 닫고 고른 탭으로 포커스를 옮긴다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
      await expect(screen.getAllByRole('tab')).toHaveLength(3);
      screen.getAllByRole('tab')[2]?.focus();
      await userEvent.keyboard('{Delete}');
      await expect(screen.getAllByRole('tab')).toHaveLength(2);
      await waitFor(async () => {
        await expect(screen.getByRole('tab', { selected: true })).toHaveFocus();
      });
    });

    await step('탭을 가운데 클릭하면 그 탭을 닫는다', async () => {
      await fireEvent(
        screen.getAllByRole('tab')[0] ?? document.body,
        new MouseEvent('auxclick', { bubbles: true, button: 1 }),
      );
      await expect(screen.getAllByRole('tab')).toHaveLength(1);
    });

    await step('마지막 탭을 닫으면 창을 닫는다', async () => {
      await userEvent.click(screen.getByLabelText('탭 닫기'));
      await expect(args.onClose).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[Chrome:구성]]
// @codocs [[Chrome:새 탭 페이지]]
/** 새 탭 페이지에서 최신 글로 갔다가 뒤로·앞으로 간다 */
export const History: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow();
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    await screen.findByRole('button', { name: '리액트 서버 컴포넌트' });

    await step('뒤로·앞으로는 기록이 없으면 비활성이다', async () => {
      await expect(screen.getByRole('button', { name: '뒤로' })).toBeDisabled();
      await expect(screen.getByRole('button', { name: '앞으로' })).toBeDisabled();
    });

    await step('최신 글 바로가기를 누르면 같은 탭에서 그 글로 간다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
    });

    await step('뒤로를 누르면 탭 기록의 앞 페이지로 간다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
      await expect(currentPage()).toEqual({ kind: 'new-tab' });
    });

    await step('앞으로를 누르면 탭 기록의 다음 페이지로 간다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '앞으로' }));
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
    });
  },
};

// @codocs [[Chrome:새 탭 페이지]]
/** 새 탭 페이지의 검색창은 주소창과 같이 동작한다 */
export const NewTabSearch: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow();
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    /**
     * 새 탭 페이지 검색창.
     * @returns 검색창
     */
    function getSearch(): HTMLElement {
      return screen.getByRole('combobox', { name: '글 검색 또는 URL 입력' });
    }
    await screen.findByRole('combobox', { name: '글 검색 또는 URL 입력' });

    await step('검색창에 주소를 입력하면 주소창과 같이 그 글로 간다', async () => {
      await userEvent.type(getSearch(), '/posts/rsc{Enter}');
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
      await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    });

    await step('입력하면 주소창과 같은 추천 목록을 열고 ↓·Enter로 그 글을 연다', async () => {
      await userEvent.type(getSearch(), '리액');
      const options = screen.getAllByRole('option').map((option) => option.textContent);
      await expect(options).toEqual(['리액트 19 훅 정리', '리액트 서버 컴포넌트', '리액 검색']);
      await expect(getSearch()).not.toHaveAttribute('aria-activedescendant');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
      await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    });

    await step('Esc는 추천을 닫고 빈칸으로 돌리고, 추천을 누르면 그 글을 연다', async () => {
      await userEvent.type(getSearch(), '리액');
      await userEvent.keyboard('{Escape}');
      await expect(screen.queryByRole('option')).not.toBeInTheDocument();
      await expect(getSearch()).toHaveValue('');
      await userEvent.type(getSearch(), 'Next');
      await userEvent.click(screen.getByRole('option', { name: 'Next.js 캐시' }));
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'next-cache' });
    });
  },
};

// @codocs [[Chrome:주소창]]
/** 주소창에 주소·글자를 입력하고 추천을 고른다 */
export const AddressBar: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow({ kind: 'post', slug: 'rsc' });
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    await waitFor(async () => {
      await expect(addressBar()).toHaveValue('seojaewan.com/posts/rsc');
    });

    await step('입력 중에는 추천 목록을 열고 처음에는 아무 추천도 고르지 않는다', async () => {
      await userEvent.type(addressBar(), '리액');
      const options = within(screen.getByRole('listbox', { name: '추천' })).getAllByRole('option');
      await expect(options.map((option) => option.textContent)).toEqual([
        expect.stringContaining('리액트 19 훅 정리'),
        expect.stringContaining('리액트 서버 컴포넌트'),
        '리액 검색',
      ]);
      await expect(
        options.every((option) => option.getAttribute('aria-selected') === 'false'),
      ).toBe(true);
    });

    await step('Esc는 추천을 닫고 원래 주소로 돌리며 전체를 선택한다', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(screen.queryByRole('listbox', { name: '추천' })).not.toBeInTheDocument();
      const input = addressBar();
      await expect(input).toHaveValue('seojaewan.com/posts/rsc');
      await expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
    });

    await step('새 탭 페이지에서는 비어 있다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
      await waitFor(async () => {
        await expect(addressBar()).toHaveValue('');
      });
    });

    await step('블로그 글 주소를 입력하고 Enter를 누르면 그 글로 간다', async () => {
      await userEvent.type(addressBar(), 'seojaewan.com/posts/next-cache{Enter}');
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'next-cache' });
      await expect(screen.getByRole('tab', { name: /Next.js 캐시/ })).toBeInTheDocument();
    });

    await step('없는 글 주소는 찾을 수 없음 화면이다', async () => {
      await userEvent.type(addressBar(), '/posts/none{Enter}');
      await expect(currentPage()).toEqual({ kind: 'not-found', url: '/posts/none' });
      await expect(
        screen.getByText('다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: /posts/none'),
      ).toBeVisible();
    });

    await step('외부 주소는 실제 브라우저의 새 탭에서 열고 탭은 그대로다', async () => {
      const open = spyOn(window, 'open').mockReturnValue(null);
      await userEvent.type(addressBar(), 'https://github.com{Enter}');
      await expect(open).toHaveBeenCalledWith('https://github.com/', '_blank', 'noopener');
      await expect(currentPage()).toEqual({ kind: 'not-found', url: '/posts/none' });
    });

    await step(
      '그 밖의 글자는 탭 안에 검색 결과 페이지를 보이고, 결과 글을 누르면 그 글로 간다',
      async () => {
        await userEvent.type(addressBar(), '캐시{Enter}');
        await expect(currentPage()).toEqual({ kind: 'search', query: '캐시' });
        await userEvent.click(screen.getByRole('button', { name: /Next.js 캐시/ }));
        await expect(currentPage()).toEqual({ kind: 'post', slug: 'next-cache' });
      },
    );

    await step('↓로 추천을 고르고 Enter를 누르면 현재 탭에서 그 글로 간다', async () => {
      await userEvent.type(addressBar(), '리액');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
      await expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    await step('추천을 누르면 그 글로 간다', async () => {
      await userEvent.type(addressBar(), '캐시');
      await userEvent.click(screen.getByRole('option', { name: /Next.js 캐시/ }));
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'next-cache' });
    });
  },
};

// @codocs [[Chrome:구성]]
/** ⋮ 메뉴: 항목 줄과 링크 복사 */
export const MoreMenu: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow({ kind: 'post', slug: 'rsc' });
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    await screen.findByRole('tab', { name: /리액트 서버 컴포넌트/ });

    await step('⋮ 메뉴는 링크 복사 · 페이지에서 찾기 · 확대/축소 줄이다', async () => {
      await openMoreMenu();
      const items = await screen.findAllByRole('menuitem');
      await expect(
        items.map((item) => item.getAttribute('aria-label') ?? item.textContent),
      ).toEqual(['링크 복사', '페이지에서 찾기Ctrl+F', '축소', '확대']);
      await expect(zoomRow()).toHaveTextContent('100%');
    });

    await step('링크 복사는 글을 보고 있으면 공유 링크를 복사한다', async () => {
      const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
      await userEvent.click(screen.getByRole('menuitem', { name: '링크 복사' }));
      await expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/posts/rsc`);
    });

    await step('링크 복사는 글을 보고 있지 않으면 비활성이다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
      await openMoreMenu();
      await expect(await screen.findByRole('menuitem', { name: '링크 복사' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  },
};

// @codocs [[Chrome:페이지에서 찾기]]
/** 새 탭 페이지에서 페이지 본문을 찾는다 */
export const Find: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow();
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    await screen.findByRole('button', { name: '리액트 서버 컴포넌트' });

    await step(
      '⋮ 메뉴의 페이지에서 찾기를 누르면 찾기 막대를 열고 입력칸에 포커스를 준다',
      async () => {
        await openMoreMenu();
        await userEvent.click(await screen.findByRole('menuitem', { name: /페이지에서 찾기/ }));
        await waitFor(async () => {
          await expect(findInput()).toHaveFocus();
        });
      },
    );

    await step('Esc로 닫는다', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(
        screen.queryByRole('search', { name: '페이지에서 찾기' }),
      ).not.toBeInTheDocument();
    });

    await step(
      'Chrome 창에 포커스가 있을 때 Ctrl+F로 열고 실제 브라우저의 찾기는 막는다',
      async () => {
        const isPrevented = pressCtrl(addressBar(), 'f');
        await expect(isPrevented).toBe(true);
        await waitFor(async () => {
          await expect(findInput()).toHaveFocus();
        });
      },
    );

    await step('입력할 때마다 페이지 본문에서 찾아 `현재/전체` 개수를 보인다', async () => {
      await userEvent.type(findInput(), '리액트');
      await expect(findBar()).toHaveTextContent('1/2');
      await userEvent.clear(findInput());
      await userEvent.type(findInput(), '없는 글자');
      await expect(findBar()).toHaveTextContent('0/0');
      await userEvent.clear(findInput());
      await userEvent.type(findInput(), '리액트');
    });

    await step(
      '이미 열려 있으면 Ctrl+F가 입력칸에 포커스를 주고 글자를 모두 선택한다',
      async () => {
        addressBar().focus();
        pressCtrl(addressBar(), 'f');
        await waitFor(async () => {
          await expect(findInput()).toHaveFocus();
        });
        await expect([findInput().selectionStart, findInput().selectionEnd]).toEqual([0, 3]);
      },
    );

    await step(
      'Enter·다음은 다음, Shift+Enter·이전은 이전이고 끝에 닿으면 처음으로 돌아간다',
      async () => {
        await userEvent.keyboard('{Enter}');
        await expect(findBar()).toHaveTextContent('2/2');
        await userEvent.keyboard('{Enter}');
        await expect(findBar()).toHaveTextContent('1/2');
        await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
        await expect(findBar()).toHaveTextContent('2/2');
        await userEvent.click(screen.getByRole('button', { name: '다음 찾기' }));
        await expect(findBar()).toHaveTextContent('1/2');
        await userEvent.click(screen.getByRole('button', { name: '이전 찾기' }));
        await expect(findBar()).toHaveTextContent('2/2');
      },
    );

    await step('닫기 버튼으로 닫는다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '찾기 닫기' }));
      await expect(
        screen.queryByRole('search', { name: '페이지에서 찾기' }),
      ).not.toBeInTheDocument();
    });

    await step('다른 페이지로 가거나 탭을 바꾸면 닫는다', async () => {
      await openFindBar('리액트');
      await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
      await expect(
        screen.queryByRole('search', { name: '페이지에서 찾기' }),
      ).not.toBeInTheDocument();
      await openFindBar('리액트');
      await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
      await expect(
        screen.queryByRole('search', { name: '페이지에서 찾기' }),
      ).not.toBeInTheDocument();
    });
  },
};

// @codocs [[Chrome:확대/축소]]
/** 단축키와 ⋮ 메뉴로 배율을 바꾼다 */
export const Zoom: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow();
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    await screen.findByRole('button', { name: '더보기' });

    await step('Ctrl + `+`·`-`·`0`으로 배율을 바꾸고 실제 브라우저의 확대는 막는다', async () => {
      await expect(pressCtrl(addressBar(), '=')).toBe(true);
      await expect(useChromeZoomStore.getState().zoom).toBe(110);
      pressCtrl(addressBar(), '-');
      pressCtrl(addressBar(), '-');
      await expect(useChromeZoomStore.getState().zoom).toBe(90);
      pressCtrl(addressBar(), '0');
      await expect(useChromeZoomStore.getState().zoom).toBe(100);
    });

    await step('⋮ 메뉴의 −·+로 배율을 바꾸고 눌러도 메뉴가 닫히지 않는다', async () => {
      await openMoreMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: '확대' }));
      await expect(zoomRow()).toHaveTextContent('110%');
      await userEvent.click(screen.getByRole('menuitem', { name: '축소' }));
      await userEvent.click(screen.getByRole('menuitem', { name: '축소' }));
      await expect(zoomRow()).toHaveTextContent('90%');
      await expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    await step('끝 단계에서는 그쪽 버튼이 비활성이다', async () => {
      for (let count = 0; count < 10; count += 1) {
        useChromeZoomStore.getState().zoomIn();
      }
      await waitFor(async () => {
        await expect(zoomRow()).toHaveTextContent('200%');
      });
      await expect(screen.getByRole('menuitem', { name: '확대' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await expect(screen.getByRole('menuitem', { name: '축소' })).toBeEnabled();
    });
  },
};

// @codocs [[Chrome:확대/축소]]
/** Chrome 창이 둘이면 페이지 본문만 키우고 같은 배율을 쓴다 */
export const TwoWindows: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow();
    openChromeWindow({ kind: 'search', query: '리액트' });
    return mockPostBodies({});
  },
  play: async ({ canvasElement }) => {
    await screen.findAllByRole('tablist');
    useChromeZoomStore.getState().zoomIn();
    await waitFor(async () => {
      const zoomed = [...canvasElement.querySelectorAll<HTMLElement>('[style*="zoom"]')];
      await expect(zoomed.map((element) => element.style.zoom)).toEqual(['1.1', '1.1']);
      await expect(zoomed.every((element) => element.closest('[role="tablist"]') === null)).toBe(
        true,
      );
    });
  },
};

// @codocs [[Chrome:글 화면]]
/** 글 본문 이미지를 크게 본다 */
export const ImageViewer: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow({ kind: 'post', slug: 'rsc' });
    return mockPostBodies({ rsc: imageBody });
  },
  play: async ({ step }) => {
    const image = await screen.findByRole('button', { name: '이미지 크게 보기: 구조 그림' });

    await step(
      '이미지를 누르면 페이지 영역을 덮어 크게 보고 포커스를 그 안으로 옮긴다',
      async () => {
        await userEvent.click(image);
        await expect(screen.getByRole('dialog', { name: '구조 그림' })).toHaveFocus();
        await expect(screen.getByRole('tablist')).toBeVisible();
      },
    );

    await step('크게 보는 동안 Tab 키 포커스는 그 안에만 머문다', async () => {
      const close = within(screen.getByRole('dialog', { name: '구조 그림' })).getByRole('button', {
        name: '닫기',
      });
      await userEvent.tab();
      await expect(close).toHaveFocus();
      await userEvent.tab();
      await expect(close).toHaveFocus();
      await userEvent.tab({ shift: true });
      await expect(close).toHaveFocus();
    });

    await step('Esc로 닫고 닫으면 원래 이미지로 포커스를 돌린다', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await expect(image).toHaveFocus();
    });

    await step('닫기 버튼으로 닫는다', async () => {
      await userEvent.click(image);
      await userEvent.click(
        within(screen.getByRole('dialog', { name: '구조 그림' })).getByRole('button', {
          name: '닫기',
        }),
      );
      await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await step('이미지 밖 바탕으로 닫고 원래 이미지로 포커스를 돌린다', async () => {
      await userEvent.click(image);
      await userEvent.click(screen.getByRole('dialog', { name: '구조 그림' }));
      await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await expect(image).toHaveFocus();
    });

    await step('찾기 막대가 열려 있으면 크게 보기가 그 위를 덮는다', async () => {
      pressCtrl(addressBar(), 'f');
      await waitForFindInput();
      await userEvent.click(image);
      const dialog = screen.getByRole('dialog', { name: '구조 그림' });
      await expect(
        findBar().compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  },
};

// @codocs [[Chrome:휴지통에 있는 글]]
// @codocs [[Chrome:새 탭 페이지]]
// @codocs [[Chrome:주소창]]
/** 휴지통에 있는 글을 주소로 열면 복원할지 묻는다 */
export const TrashedPost: Story = {
  beforeEach: async () => {
    await hydratePosts();
    useWorkspaceStore.getState().trashItems(['post:rsc']);
    openChromeWindow();
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    await screen.findByRole('combobox', { name: '글 검색 또는 URL 입력' });

    await step('최신 글 바로가기와 추천에서 휴지통에 든 글은 뺀다', async () => {
      await expect(
        screen.queryByRole('button', { name: '리액트 서버 컴포넌트' }),
      ).not.toBeInTheDocument();
      await userEvent.type(addressBar(), '리액');
      await expect(
        screen.queryByRole('option', { name: /리액트 서버 컴포넌트/ }),
      ).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
    });

    await step(
      '휴지통에 있는 글 주소를 주소창에 넣으면 바로 열지 않고 복원할지 묻는다',
      async () => {
        await userEvent.clear(addressBar());
        await userEvent.type(addressBar(), '/posts/rsc{Enter}');
        const dialog = await screen.findByRole('alertdialog');
        await expect(dialog).toHaveTextContent('휴지통에 있는 글');
        await expect(dialog).toHaveTextContent('이 글은 휴지통에 있어요. 복원하고 열까요?');
        await expect(currentPage()).toEqual({ kind: 'new-tab' });
      },
    );

    await step('취소를 누르면 보던 페이지를 그대로 둔다', async () => {
      await userEvent.click(await screen.findByRole('button', { name: '취소' }));
      await waitFor(async () => {
        await expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      await expect(currentPage()).toEqual({ kind: 'new-tab' });
      await expect(useWorkspaceStore.getState().items['post:rsc']?.trash).not.toBeNull();
    });

    await step('다음 글은 휴지통에 있는 글을 건너뛴다', async () => {
      await userEvent.type(addressBar(), 'seojaewan.com/posts/next-cache{Enter}');
      await expect(await screen.findByText('리액트 19 훅 정리')).toBeInTheDocument();
      await expect(screen.queryByText('리액트 서버 컴포넌트')).not.toBeInTheDocument();
    });

    await step('복원을 누르면 그 글을 원래 위치로 돌려놓고 연다', async () => {
      await userEvent.type(addressBar(), '/posts/rsc{Enter}');
      await userEvent.click(await screen.findByRole('button', { name: '복원' }));
      await waitFor(async () => {
        await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
      });
      await expect(useWorkspaceStore.getState().items['post:rsc']?.trash).toBeNull();
    });
  },
};

// @codocs [[Chrome:글 화면]]
/** 페이지 모양은 기기가 아니라 창 내용 너비를 따라, 창 너비가 경계를 넘으면 바로 바뀐다 */
export const WindowWidthLayout: Story = {
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow({ kind: 'post', slug: 'rsc' });
    return mockPostBodies({});
  },
  play: async ({ canvasElement, step }) => {
    const area = canvasElement.querySelector<HTMLElement>('[data-layout]');
    const host = canvasElement.firstElementChild;
    if (area === null || !(host instanceof HTMLElement)) {
      throw new Error('페이지 영역이 없다');
    }

    await step('넓은 창은 wide다', async () => {
      await expect(area.dataset.layout).toBe('wide');
    });

    await step('창 내용 너비가 경계 아래로 내려가면 narrow다', async () => {
      host.style.width = `${String(BREAKPOINTS.chromePageWidth - 1)}px`;
      await waitFor(async () => {
        await expect(area.dataset.layout).toBe('narrow');
      });
    });

    await step('경계를 다시 넘으면 wide로 돌아온다', async () => {
      host.style.width = '';
      await waitFor(async () => {
        await expect(area.dataset.layout).toBe('wide');
      });
    });
  },
};

// @codocs [[창 동작:모바일]]
// @codocs [[Chrome:모바일]]
/** 모바일 폭에서는 탭 줄이 없고 앞으로·새로고침이 ⋮ 메뉴 맨 위에 있다 */
export const Mobile: Story = {
  args: { device: 'mobile' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  beforeEach: async () => {
    await hydratePosts();
    openChromeWindow();
    return mockPostBodies({});
  },
  play: async ({ step }) => {
    // 뷰포트를 바꾼 뒤 처음 그리는 데 부하가 걸리면 기본 대기(1초)를 넘길 수 있어 넉넉히 기다린다.
    await screen.findByRole('button', { name: '더보기' }, { timeout: 5000 });

    await step('모바일은 탭 줄이 없다', async () => {
      await expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    await step('도구 모음에는 앞으로·새로고침 버튼이 없다', async () => {
      await expect(screen.queryByRole('button', { name: '앞으로' })).not.toBeInTheDocument();
      await expect(screen.queryByRole('button', { name: '새로고침' })).not.toBeInTheDocument();
    });

    await step('앞으로·새로고침이 ⋮ 메뉴 맨 위에 있다', async () => {
      await openMoreMenu();
      const items = await screen.findAllByRole('menuitem');
      await expect(items.slice(0, 2).map((item) => item.textContent)).toEqual([
        '앞으로',
        '새로고침',
      ]);
      await userEvent.keyboard('{Escape}');
      // 닫는 애니메이션이 끝날 때까지 메뉴가 남는다. 남은 메뉴는 `pointer-events: none`이라
      // 다음 단계가 다시 연 메뉴 대신 이 메뉴의 항목을 집으면 클릭이 막힌다.
      await waitFor(async () => {
        await expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    await step('⋮ 메뉴의 앞으로는 탭 기록의 다음 페이지로 간다', async () => {
      await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
      await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
      await openMoreMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: '앞으로' }));
      await expect(currentPage()).toEqual({ kind: 'post', slug: 'rsc' });
    });
  },
};

// @codocs [[창 동작:브라우저 주소]]
/** 작업 표시줄 미리보기처럼 Chrome 창만 다시 그리는 곳에서는 브라우저 주소를 바꾸지 않는다 */
export const Preview: Story = {
  beforeEach: async () => {
    await hydratePosts();
    replaceStateCalls.length = 0;
    const replaceState = spyOn(window.history, 'replaceState').mockImplementation(
      /**
       * 부른 주소를 적어 둔다. 실제 주소는 바꾸지 않는다.
       * @param _data 기록 상태
       * @param _unused 쓰지 않는 값
       * @param url 바꾸려는 주소
       */
      (_data, _unused, url) => {
        replaceStateCalls.push(String(url));
      },
    );
    openChromeWindow({ kind: 'post', slug: 'rsc' });
    const restoreBodies = mockPostBodies({});
    return () => {
      replaceState.mockRestore();
      restoreBodies();
    };
  },
  play: async () => {
    await screen.findByRole('tab', { name: /리액트 서버 컴포넌트/ });
    await expect(replaceStateCalls).toEqual([]);
  },
};
