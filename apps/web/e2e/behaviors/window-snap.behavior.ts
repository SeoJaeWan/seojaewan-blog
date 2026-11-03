import { expect, type Locator, type Page } from '@playwright/test';

import { dragMouse, openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

/**
 * 작업 표시줄로 바탕 화면 탐색기를 열고, 바탕화면 Blog 폴더로 탐색기를 하나 더 연다.
 * @param page 앱 페이지
 * @returns Blog 창과 바탕 화면 창
 */
async function openTwoExplorers(page: Page): Promise<{ blog: Locator; desktopWindow: Locator }> {
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  const desktopWindow = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
  await expect(desktopWindow).toBeVisible();
  await openBlogFolder(page);
  const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  await expect(blog).toBeVisible();
  return { blog, desktopWindow };
}

/**
 * 창의 제목 표시줄을 화면 왼쪽 끝으로 끌어 놓는다.
 * @param page 앱 페이지
 * @param window 끌 창
 */
async function dragToLeftEdge(page: Page, window: Locator): Promise<void> {
  const box = await window.boundingBox();
  if (box === null) {
    throw new Error('창 자리를 알 수 없다');
  }
  await dragMouse(page, { x: box.x + 600, y: box.y + 16 }, { x: 2, y: 300 });
}

/**
 * 지금 화면 크기를 읽는다.
 * @param page 앱 페이지
 * @returns 화면 크기
 */
function readViewport(page: Page): { width: number; height: number } {
  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error('화면 크기를 알 수 없다');
  }
  return viewport;
}

export const behavior = defineBehavior({
  name: '창을 스냅한다',
  area: '창',
  summary: '끌어서 절반·스냅 레이아웃으로 칸 채움·복원하면 스냅 칸으로',
  conditions: {
    how: {
      label: '스냅하는 법',
      values: ['끌어서 스냅', '스냅 레이아웃'],
      base: '끌어서 스냅',
    },
    cell: {
      label: '스냅할 칸',
      values: ['절반', '3분의 2·3분의 1', '4분의 1', '최대화(위쪽 끝)'],
      base: '절반',
    },
    others: {
      label: '다른 창 상태',
      values: ['있음', '없음', '최소화됨'],
      base: '있음',
    },
    after: {
      label: '스냅한 다음에',
      values: ['Snap Assist에서 고름', 'Snap Assist를 Esc로 닫음', '최대화 후 복원', '끌어서 뗌'],
      base: 'Snap Assist에서 고름',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  noCase: {
    screen: {
      모바일: {
        reason: '모바일에서는 창이 늘 전체화면이라 스냅이 없다',
        docs: ['[[스냅:모바일]]', '[[창 동작:모바일]]'],
      },
    },
  },
  cases: [
    {
      id: 'drag-left-and-assist',
      scenario:
        '탐색기 창 두 개가 열린 상태에서 Blog 창의 제목 표시줄을 화면 왼쪽 끝으로 끌어 놓고, 뜬 Snap Assist에서 첫 번째 창을 고른다',
      result: '왼쪽 절반에 붙고 남은 칸 채움',
      expected: [
        'Blog 창이 화면 왼쪽 절반을 채운다',
        '남은 칸에 다른 창을 고르는 Snap Assist가 뜬다',
        '고르면 Snap Assist가 닫히고 그 창이 오른쪽 남은 절반을 채운다',
      ],
      docs: ['[[스냅:끌어서 스냅]]', '[[스냅:Snap Assist]]'],
      async run({ page, check }) {
        await page.goto('/');
        const { blog, desktopWindow } = await openTwoExplorers(page);
        const viewport = readViewport(page);

        await dragToLeftEdge(page, blog);
        await check('Blog 창이 화면 왼쪽 절반을 채운다', async () => {
          await expect.poll(async () => (await blog.boundingBox())?.x).toBe(0);
          await expect.poll(async () => (await blog.boundingBox())?.width).toBe(viewport.width / 2);
        });

        const assist = page.getByRole('dialog', { name: 'Snap Assist' });
        await check('남은 칸에 다른 창을 고르는 Snap Assist가 뜬다', async () => {
          await expect(assist).toBeVisible();
        });
        await assist.locator('[data-snap-assist-suggestion]').first().click();
        await check('고르면 Snap Assist가 닫히고 그 창이 오른쪽 남은 절반을 채운다', async () => {
          await expect(assist).not.toBeAttached();
          await expect
            .poll(async () => (await desktopWindow.boundingBox())?.x)
            .toBe(viewport.width / 2);
          await expect
            .poll(async () => (await desktopWindow.boundingBox())?.width)
            .toBe(viewport.width / 2);
        });
      },
    },
    {
      id: 'snap-layout',
      change: { how: '스냅 레이아웃' },
      scenario:
        '탐색기 창 두 개가 열린 상태에서 Blog 창의 최대화 버튼에 마우스를 올려 스냅 레이아웃의 "반반 > 오른쪽 절반" 칸을 누르고, 뜬 Snap Assist에서 첫 번째 창을 고른다',
      result: '고른 칸을 창이 채움',
      expected: ['최대화 버튼에 올리면 스냅 레이아웃이 뜬다', '고른 칸(오른쪽 절반)을 창이 채운다'],
      docs: ['[[스냅:스냅 레이아웃]]', '[[스냅:Snap Assist]]'],
      async run({ page, check }) {
        await page.goto('/');
        const { blog } = await openTwoExplorers(page);
        const viewport = readViewport(page);

        await blog.getByRole('button', { name: '최대화' }).hover();
        const layouts = page.getByRole('dialog', { name: '스냅 레이아웃' });
        await check('최대화 버튼에 올리면 스냅 레이아웃이 뜬다', async () => {
          await expect(layouts).toBeVisible();
        });
        await layouts
          .getByRole('group', { name: '반반' })
          .getByRole('button', { name: '오른쪽 절반' })
          .click();
        await check('고른 칸(오른쪽 절반)을 창이 채운다', async () => {
          await expect.poll(async () => (await blog.boundingBox())?.x).toBe(viewport.width / 2);
          await expect.poll(async () => (await blog.boundingBox())?.width).toBe(viewport.width / 2);
        });

        await page
          .getByRole('dialog', { name: 'Snap Assist' })
          .locator('[data-snap-assist-suggestion]')
          .first()
          .click();
      },
    },
    {
      id: 'maximize-then-restore',
      change: { after: '최대화 후 복원' },
      scenario:
        '탐색기 창 두 개가 열린 상태에서 Blog 창의 제목 표시줄을 화면 왼쪽 끝으로 끌어 놓고, 최대화했다가 "이전 크기로 복원" 버튼을 누른다',
      result: '복원하면 스냅 칸으로 돌아옴',
      expected: ['최대화하면 창이 화면 폭을 채운다', '복원하면 스냅했던 칸으로 돌아온다'],
      docs: ['[[스냅:끌어서 스냅]]', '[[스냅:스냅된 창]]'],
      async run({ page, check }) {
        await page.goto('/');
        const { blog } = await openTwoExplorers(page);
        const viewport = readViewport(page);

        await dragToLeftEdge(page, blog);
        await expect.poll(async () => (await blog.boundingBox())?.width).toBe(viewport.width / 2);
        const snapped = await blog.boundingBox();

        await blog.getByRole('button', { name: '최대화' }).click();
        await check('최대화하면 창이 화면 폭을 채운다', async () => {
          await expect.poll(async () => (await blog.boundingBox())?.width).toBe(viewport.width);
        });
        await blog.getByRole('button', { name: '이전 크기로 복원' }).click();
        await check('복원하면 스냅했던 칸으로 돌아온다', async () => {
          await expect.poll(async () => await blog.boundingBox()).toEqual(snapped);
        });
      },
    },
  ],
});
