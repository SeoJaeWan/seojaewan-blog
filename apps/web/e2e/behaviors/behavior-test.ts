import { test as base } from '@playwright/test';

import { createTouchInput, drawTouchFinger, type TouchInput } from './touch-input.ts';

/** 설정(`playwright.config.ts`의 `use`)에서 고르는 값. */
export type BehaviorOptions = {
  /** 동작 표시(커서·동작 이름)를 보이는 시간(ms). 동작마다 이만큼 걸리므로 시험은 짧게, 실행해보기는 길게 둔다. */
  actionAnnotationMs: number;
};

type BehaviorFixtures = {
  touch: TouchInput;
  showInput: undefined;
};

/**
 * 행위 케이스를 돌리는 Playwright `test`. 모든 시험에서 마우스·키보드 동작은 Playwright 동작 표시로,
 * 터치는 손가락 표시로 보인다. CI에서도 같다.
 * @codocs [[테스트 작성 규칙:E2E]]
 */
export const test = base.extend<BehaviorFixtures & BehaviorOptions>({
  actionAnnotationMs: [100, { option: true }],
  showInput: [
    async ({ page, actionAnnotationMs }, use) => {
      await page.addInitScript(drawTouchFinger);
      await page.screencast.showActions({ duration: actionAnnotationMs });
      await use(undefined);
    },
    { auto: true },
  ],
  touch: async ({ page, context }, use) => {
    await use(createTouchInput(page, context));
  },
});
