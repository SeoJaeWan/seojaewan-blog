import { expect, type Page } from '@playwright/test';

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
