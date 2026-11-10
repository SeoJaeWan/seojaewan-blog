import categoryFolderExport from '@figma/patterns/start/category-folder/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, waitFor, within } from 'storybook/test';

import { figmaFrame } from '@seojaewan/design-system/story';

import { StartCategoryPopup } from './start-category-popup';

// 피그마 Start/CategoryFolder의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

// 세 쪽(4열 × 3줄 × 3)에 걸치는 글 25개다.
const pagedPosts = Array.from({ length: 25 }, (_, index) => ({
  id: `post:paged-${String(index + 1)}`,
  kind: 'post' as const,
  title: `글 ${String(index + 1)}`,
}));

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 한 쪽을 넘는 글 범주를 연 팝업이라 쪽 표시 점(3쪽)이 보인다.
const meta = {
  title: 'Patterns/Start/CategoryFolder',
  parameters: { layout: 'padded' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  decorators: [figmaFrame(categoryFolderExport)],
  render: (args) => <StartCategoryPopup device={args.device} label="글" items={pagedPosts} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/**
 * 항목 칸이 팝업의 격자 영역(자르는 틀) 안에 보이는지 본다.
 * @param tile 항목 칸 버튼
 * @returns 틀 안에 들어 있으면 true
 */
function isInsidePage(tile: HTMLElement): boolean {
  const clip = tile.closest('.overflow-clip');
  if (clip === null) {
    throw new Error('격자를 자르는 틀이 없다');
  }
  const tileRect = tile.getBoundingClientRect();
  const clipRect = clip.getBoundingClientRect();
  return tileRect.top >= clipRect.top - 1 && tileRect.bottom <= clipRect.bottom + 1;
}

/** 넘치면 스크롤바 없이 휠 한 번에 한 쪽(3줄)씩 넘기고, 마지막 쪽에서는 더 넘기지 않는다 */
export const Pages: Story = {
  render: () => <StartCategoryPopup device="desktop" label="글" items={pagedPosts} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByText('글', { exact: true });
    const titleTop = title.getBoundingClientRect().top;
    /**
     * 번호로 항목 칸을 찾는다.
     * @param number 글 번호(1부터)
     * @returns 항목 칸 버튼
     */
    function tile(number: number): HTMLElement {
      return canvas.getByRole('button', { name: `글 ${String(number)}` });
    }
    /**
     * 팝업 위에서 휠을 한 번 굴린다.
     * @param deltaY 세로 이동량. 양수는 아래로
     */
    async function wheel(deltaY: number): Promise<void> {
      await fireEvent.wheel(tile(1), { deltaY });
    }
    /** 쪽 넘김 움직임이 끝날 때까지 기다린다. 넘기는 동안 들어온 휠은 버려지기 때문이다. */
    async function waitForTurnEnd(): Promise<void> {
      const grid = tile(1).parentElement;
      await waitFor(() => expect(grid?.getAnimations().length).toBe(0));
    }

    // @codocs [[Start 메뉴:모두]]
    await step('처음에는 첫 쪽(12개)만 보이고 스크롤바가 없다', async () => {
      await expect(isInsidePage(tile(12))).toBe(true);
      await expect(isInsidePage(tile(13))).toBe(false);
      await expect(canvasElement.querySelector('.overflow-y-auto')).toBeNull();
    });

    // @codocs [[Start 메뉴:모두]]
    await step('휠을 한 번 아래로 굴리면 다음 한 쪽만 넘기고 제목은 제자리다', async () => {
      await wheel(100);
      await waitFor(async () => {
        await expect(isInsidePage(tile(12))).toBe(false);
        await expect(isInsidePage(tile(13))).toBe(true);
        await expect(isInsidePage(tile(24))).toBe(true);
        await expect(isInsidePage(tile(25))).toBe(false);
      });
      await expect(title.getBoundingClientRect().top).toBe(titleTop);
      await waitForTurnEnd();
    });

    // @codocs [[Start 메뉴:모두]]
    await step('마지막 쪽에서 더 굴려도 넘기지 않는다', async () => {
      await wheel(100);
      await waitFor(async () => {
        await expect(isInsidePage(tile(24))).toBe(false);
        await expect(isInsidePage(tile(25))).toBe(true);
      });
      await waitForTurnEnd();
      await wheel(100);
      await waitForTurnEnd();
      await expect(isInsidePage(tile(24))).toBe(false);
      await expect(isInsidePage(tile(25))).toBe(true);
    });

    // @codocs [[Start 메뉴:모두]]
    await step('위로 굴리면 한 쪽씩 되돌아간다', async () => {
      await wheel(-100);
      await waitFor(async () => {
        await expect(isInsidePage(tile(12))).toBe(false);
        await expect(isInsidePage(tile(13))).toBe(true);
        await expect(isInsidePage(tile(25))).toBe(false);
      });
    });
  },
};
