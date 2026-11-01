import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { SEARCH_RESULTS } from '@/features/start-menu/components/search-body/story-data';
import {
  START_LETTER_GROUPS,
  START_PINNED,
  startAvailableLetters,
} from '@/features/start-menu/components/start-body/story-data';
import type { StartItem } from '@/features/start-menu/utils/start-items/start-items';

import { StartBody } from './start-body';
import { START_CATEGORY_GROUPS } from './story-data';

// 피그마 Start/Body의 변형 속성 값이다(정규화한 이름).
const VIEWS = ['list', 'grid', 'category', 'results', 'jumplist'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

// 본문은 크기를 갖지 않고 Start 메뉴가 정하므로 피그마 원본 크기(size/574×569, size/356×489)로 감싸 그린다.
const SIZE_CLASS_NAMES = {
  desktop: 'w-size-shell-body-width h-size-start-body-height',
  mobile: 'w-size-shell-mobile-body-width h-size-start-body-mobile-height',
} as const;

type FigmaArgs = {
  view: (typeof VIEWS)[number];
  device: (typeof DEVICES)[number];
  /** 동작 스토리가 항목을 열었을 때 부를 함수 */
  onItemOpen?: (item: StartItem) => void;
};

// 동작 스토리가 항목을 열었는지 보는 함수
const handleStoryItemOpen = fn<(item: StartItem) => void>();

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 데이터는 피그마 조립과 같다.
const meta = {
  title: 'Patterns/Start/Body',
  // 높이(569, 489)가 홀수라 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  args: { view: 'list', device: 'desktop' },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => {
    const className = SIZE_CLASS_NAMES[args.device];
    switch (args.view) {
      case 'list':
      case 'grid':
        return (
          <StartBody
            view={args.view}
            device={args.device}
            className={className}
            pinned={START_PINNED}
            groups={START_LETTER_GROUPS}
          />
        );
      case 'category':
        return (
          <StartBody
            view="category"
            device={args.device}
            className={className}
            pinned={START_PINNED}
            groups={START_CATEGORY_GROUPS}
          />
        );
      case 'results':
        return (
          <StartBody
            view="results"
            device={args.device}
            className={className}
            results={SEARCH_RESULTS}
          />
        );
      case 'jumplist':
        return (
          <StartBody
            view="jump-list"
            device={args.device}
            className={className}
            availableLetters={startAvailableLetters}
          />
        );
    }
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/**
 * 가장 가까운 스크롤 영역을 찾는다. 내용이 넘쳐 실제로 스크롤할 수 있는 조상이다.
 * @param element 시작 요소
 * @returns 스크롤 영역. 없으면 null
 */
function findScrollArea(element: HTMLElement): HTMLElement | null {
  for (let current = element.parentElement; current !== null; current = current.parentElement) {
    if (current.scrollHeight > current.clientHeight && current.clientHeight > 0) {
      return current;
    }
  }
  return null;
}

/** 간단히 보기에서 글자 머리글을 눌러 글자 격자로 목록을 옮긴다 */
export const ListJump: Story = {
  render: () => (
    <StartBody
      view="list"
      pinned={START_PINNED}
      groups={START_LETTER_GROUPS}
      className="h-size-start-body-height"
    />
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const scrollIntoView = spyOn(Element.prototype, 'scrollIntoView');
    /**
     * 글자 격자.
     * @returns 글자 격자
     */
    function jumpList(): HTMLElement {
      return canvas.getByRole('group', { name: '글자로 이동' });
    }

    // @codocs [[Start 메뉴:모두]]
    await step(
      '글자 머리글을 누르면 글자 격자가 열리고 "모두" 제목 줄에 "뒤로" 버튼이 나온다',
      async () => {
        await expect(canvas.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'C' }));
        await expect(canvas.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
        await expect(within(jumpList()).getByRole('button', { name: 'ㄱ' })).toBeInTheDocument();
      },
    );

    // @codocs [[Start 메뉴:모두]]
    await step('항목이 없는 글자는 누를 수 없다', async () => {
      await expect(within(jumpList()).getByRole('button', { name: 'A' })).toBeDisabled();
      await expect(within(jumpList()).getByRole('button', { name: 'R' })).toBeEnabled();
    });

    // @codocs [[Start 메뉴:모두]]
    await step('글자를 고르면 격자가 닫히고 목록이 그 글자 묶음으로 이동한다', async () => {
      scrollIntoView.mockClear();
      await userEvent.click(within(jumpList()).getByRole('button', { name: 'ㄹ' }));
      await waitFor(() =>
        expect(canvas.queryByRole('group', { name: '글자로 이동' })).not.toBeInTheDocument(),
      );
      await expect(scrollIntoView).toHaveBeenCalledTimes(1);
      await expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('data-letter-group', 'ㄹ');
      await expect(canvas.getByRole('button', { name: 'ㄹ' })).toHaveFocus();
    });

    // @codocs [[Start 메뉴:모두]]
    await step('"뒤로"를 누르면 목록을 옮기지 않고 격자를 닫는다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'G' }));
      scrollIntoView.mockClear();
      await userEvent.click(canvas.getByRole('button', { name: '뒤로' }));
      await waitFor(() =>
        expect(canvas.queryByRole('group', { name: '글자로 이동' })).not.toBeInTheDocument(),
      );
      await expect(scrollIntoView).not.toHaveBeenCalled();
      await expect(canvas.getByRole('button', { name: 'G' })).toHaveFocus();
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step('고정됨과 모두 목록은 넘치면 아래로 스크롤하는 같은 영역 안에 있다', async () => {
      const pinnedTitle = canvas.getByText('고정됨');
      const row = canvas.getByText('Blog', { selector: 'p' });
      const area = findScrollArea(pinnedTitle);
      await expect(area).not.toBeNull();
      await expect(area?.contains(row)).toBe(true);
    });
  },
};

/** 범주 보기의 머리글은 종류 이름이라 누를 수 없다 */
export const CategoryHeaders: Story = {
  render: () => (
    <StartBody
      view="category"
      pinned={START_PINNED}
      groups={[
        { label: '앱', items: [{ id: 'app:chrome', kind: 'app', app: 'chrome', title: 'Chrome' }] },
      ]}
    />
  ),
  play: async ({ canvasElement, step }) => {
    // @codocs [[Start 메뉴:모두]]
    await step('범주 보기의 머리글은 종류 이름이라 누를 수 없다', async () => {
      await expect(
        within(canvasElement).queryByRole('button', { name: '앱' }),
      ).not.toBeInTheDocument();
    });
  },
};

/** 모두 목록의 줄을 눌러 항목을 연다 */
export const OpenFromList: Story = {
  args: { onItemOpen: handleStoryItemOpen },
  render: (args) => {
    const { onItemOpen: handleItemOpen } = args;
    return (
      <StartBody
        view="list"
        pinned={START_PINNED}
        groups={START_LETTER_GROUPS}
        className="h-size-start-body-height"
        onItemOpen={handleItemOpen}
      />
    );
  },
  play: async ({ canvasElement, step }) => {
    // 고정됨 칸 뒤(DOM 순서)에 있는 모두 목록의 Chrome 줄이다.
    /**
     * 모두 목록의 Chrome 줄.
     * @returns Chrome 줄
     */
    function row(): HTMLElement {
      const target = within(canvasElement).getAllByRole('button', { name: 'Chrome' })[1];
      if (target === undefined) {
        throw new Error('모두 목록의 Chrome 줄이 없다');
      }
      return target;
    }
    handleStoryItemOpen.mockClear();

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('모두 목록의 줄을 클릭하면 그 항목을 연다', async () => {
      await userEvent.click(row());
      await expect(handleStoryItemOpen).toHaveBeenCalledWith({
        id: 'app:chrome',
        kind: 'app',
        app: 'chrome',
        title: 'Chrome',
      });
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('모두 목록의 줄에서 Enter나 Space를 누르면 그 항목을 연다', async () => {
      handleStoryItemOpen.mockClear();
      row().focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      await expect(handleStoryItemOpen).toHaveBeenCalledTimes(2);
    });
  },
};
