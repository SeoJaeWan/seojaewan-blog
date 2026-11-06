import { devices, expect, type Page } from '@playwright/test';

import type { CaseDevice } from './define-behavior.ts';
import type { Point } from './touch-input.ts';

/** 작업 공간 저장분의 localStorage 키. */
export const WORKSPACE_STORAGE_KEY = 'seojaewan-blog:workspace';

/**
 * Start 전원 메뉴에서 다시 시작하고 재부팅 화면이 사라질 때까지 기다린다.
 * @param page 앱 페이지
 */
export async function restart(page: Page): Promise<void> {
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('dialog', { name: '시작' }).getByRole('button', { name: '전원' }).click();
  await page.getByRole('menuitem', { name: '다시 시작' }).click();
  await expect(page.getByRole('progressbar', { name: '다시 시작하는 중' })).not.toBeAttached();
}

/**
 * 바탕화면의 Blog 폴더를 더블클릭해 탐색기를 연다.
 * @param page 앱 페이지
 */
export async function openBlogFolder(page: Page): Promise<void> {
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
}

/**
 * 마우스로 누른 채 두 번에 나눠 끌어 옮긴 뒤 놓는다(제목 표시줄 끌기).
 * @param page 앱 페이지
 * @param from 누를 자리
 * @param to 놓을 자리
 */
export async function dragMouse(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}

/**
 * 작업 공간 저장분을 읽는다.
 * @param page 앱 페이지
 * @returns 저장분 문자열. 없으면 null
 */
export async function readWorkspaceStorage(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), WORKSPACE_STORAGE_KEY);
}

/**
 * 시험 페이지가 지금 연 주소를 스크립트를 끈 새 창에서 다시 열어, 서버가 보낸 첫 HTML만 그린 화면을 연다.
 * 화면 크기와 장치는 시험 페이지와 같다. 다 쓰면 돌려준 페이지의 `context().close()`로 닫는다.
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @param page 주소를 연 시험 페이지
 * @param device 터치 장치로 돌리는 케이스면 그 장치
 * @returns 첫 HTML만 그린 페이지
 */
export async function openFirstHtml(page: Page, device?: CaseDevice): Promise<Page> {
  const browser = page.context().browser();
  if (browser === null) {
    throw new Error('브라우저가 없어 첫 HTML을 열 수 없다');
  }
  const deviceOptions =
    device === undefined
      ? {}
      : {
          userAgent: devices[device].userAgent,
          deviceScaleFactor: devices[device].deviceScaleFactor,
          isMobile: devices[device].isMobile,
          hasTouch: devices[device].hasTouch,
        };
  const context = await browser.newContext({
    ...deviceOptions,
    viewport: page.viewportSize(),
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const firstHtml = await context.newPage();
  await firstHtml.goto(page.url());
  return firstHtml;
}

/**
 * 서버가 그린 첫 진입 창을 수화한 뒤 창 저장소가 이어받을 때까지 기다린다. 이어받으면 창의 `data-window-entry`가 빠진다.
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @param page 앱 페이지
 */
export async function waitForEntryWindowHandOver(page: Page): Promise<void> {
  await expect(page.locator('[data-window-entry]')).toHaveCount(0);
}
