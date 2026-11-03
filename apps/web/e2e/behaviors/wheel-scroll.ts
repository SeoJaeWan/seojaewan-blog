import type { Page } from '@playwright/test';

const WHEEL_STEP = 100;
const WHEEL_STEP_MS = 50;

/**
 * 마우스 휠을 한 번에 굴리지 않고 나눠 굴린다. 실제 휠처럼 여러 번 나뉘어 trace에서도 움직임이 보인다.
 * 마우스를 굴릴 자리에 먼저 올려 둔 뒤 부른다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param page 굴릴 페이지
 * @param deltaY 세로로 굴릴 전체 거리(px). 음수는 위로
 */
export async function wheelScroll(page: Page, deltaY: number): Promise<void> {
  const direction = Math.sign(deltaY);
  let left = Math.abs(deltaY);
  while (left > 0) {
    const step = Math.min(WHEEL_STEP, left);
    await page.mouse.wheel(0, step * direction);
    await page.waitForTimeout(WHEEL_STEP_MS);
    left -= step;
  }
}
