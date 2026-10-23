import type { Locator, Page } from '@playwright/test';

import type { Interaction, StoryArgValue } from './story-target.ts';
import { storyArgsParam } from './story-target.ts';

// 스토리 렌더링과 서체 로딩을 기다리는 최대 시간(ms)이다.
const RENDER_TIMEOUT_MS = 15_000;
// 포털로 그리거나 감싸는 요소가 필요한 스토리가 캡처 대상에 다는 속성이다.
export const PARITY_TARGET_ATTRIBUTE = 'data-parity-target';

// Storybook 미리보기가 스토리 렌더링을 마쳤는지 확인하는 브라우저 코드다.
// 내부 API(__STORYBOOK_PREVIEW__)가 없으면 루트에 요소가 생겼는지로 판단한다.
const STORY_RENDERED_SCRIPT = `(() => {
  const body = document.body.classList;
  if (body.contains('sb-show-errordisplay') || body.contains('sb-show-nopreview')) return true;
  const phase = window.__STORYBOOK_PREVIEW__?.currentRender?.phase;
  const hasChild = document.querySelector('#storybook-root > *') !== null;
  return body.contains('sb-show-main') && hasChild && (phase === undefined || phase === 'completed' || phase === 'finished' || phase === 'played');
})()`;

export type StoryPageResult = { ok: true; target: Locator } | { ok: false; message: string };

/**
 * 변형 하나에 해당하는 스토리를 열고, 피그마 상태(Hover·Pressed·Focused)를 실제 마우스·키보드로 재현한다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param page Playwright 페이지
 * @param storybookUrl Storybook 정적 빌드 주소
 * @param storyId 스토리 ID
 * @param args 스토리 args
 * @param interaction 재현할 상호작용
 * @returns 캡처 대상, 또는 실패 이유
 */
export async function openStory(
  page: Page,
  storybookUrl: string,
  storyId: string,
  args: Readonly<Record<string, StoryArgValue>>,
  interaction: Interaction,
): Promise<StoryPageResult> {
  // Storybook은 iframe.html에 id·viewMode·args를 주면 그 스토리 하나만 그린다(URL args는 `key:value;key:!true`).
  const query = new URLSearchParams({ id: storyId, viewMode: 'story', args: storyArgsParam(args) });
  await page.goto(`${storybookUrl}/iframe.html?${query.toString()}`);

  const renderError = await waitForStory(page, storyId, args);
  if (renderError !== undefined) {
    return { ok: false, message: `스토리를 그리지 못했다: ${renderError}` };
  }
  const target = await findTarget(page);
  const fontError = await waitForFonts(page);
  if (fontError !== undefined) {
    return { ok: false, message: fontError };
  }
  const interactionError = await interact(page, target, interaction);
  if (interactionError !== undefined) {
    return { ok: false, message: interactionError };
  }
  await finishTransitions(page);
  return { ok: true, target };
}

/**
 * Storybook이 스토리 렌더링을 마치거나 오류를 보여줄 때까지 기다리고, URL args가 적용됐는지 확인한다.
 * Storybook은 argTypes 옵션에 없는 값 같은 URL args를 조용히 버리므로 직접 확인한다.
 * @param page 스토리 페이지
 * @param storyId 스토리 ID
 * @param args 넘긴 스토리 args
 * @returns 오류 메시지. 정상이면 undefined
 */
async function waitForStory(
  page: Page,
  storyId: string,
  args: Readonly<Record<string, StoryArgValue>>,
): Promise<string | undefined> {
  await page.waitForFunction(STORY_RENDERED_SCRIPT, undefined, { timeout: RENDER_TIMEOUT_MS });
  const isShown = await page.evaluate(() => document.body.classList.contains('sb-show-main'));
  if (!isShown) {
    const message = (await page.locator('#error-message').textContent()) ?? '';
    return message.trim() === '' ? 'Storybook이 미리보기를 보여주지 않았다.' : message.trim();
  }

  const appliedJson: unknown = await page.evaluate(
    `JSON.stringify(window.__STORYBOOK_PREVIEW__?.storyStoreValue?.args?.get(${JSON.stringify(storyId)}) ?? null)`,
  );
  const applied: unknown = typeof appliedJson === 'string' ? JSON.parse(appliedJson) : null;
  if (typeof applied !== 'object' || applied === null) {
    return 'Storybook 내부 API로 적용된 args를 읽지 못했다.';
  }
  const actual = new Map(Object.entries(applied));
  const mismatched = Object.entries(args)
    .filter(([name, value]) => actual.get(name) !== value)
    .map(
      ([name, value]) => `${name}=${String(value)}(스토리 값 ${JSON.stringify(actual.get(name))})`,
    );
  return mismatched.length === 0
    ? undefined
    : `args가 적용되지 않았다: ${mismatched.join(', ')}. argTypes 옵션에 이 값이 있는지 확인한다.`;
}

/**
 * 웹 폰트를 모두 받을 때까지 기다리고, 받지 못한 웹 폰트가 없는지 확인한다.
 * @codocs [[디자인 기반:서체]]
 * @param page 스토리 페이지
 * @returns 실패 이유. 정상이면 undefined
 */
async function waitForFonts(page: Page): Promise<string | undefined> {
  return page.evaluate(
    /**
     * 브라우저에서 서체 로딩을 기다리고 받지 못한 서체를 찾는다.
     */
    async () => {
      await document.fonts.ready;
      const failed = [...document.fonts]
        .filter((face) => face.status === 'error')
        .map((face) => `${face.family} ${face.weight}`);
      return failed.length > 0 ? `웹 폰트를 받지 못했다: ${failed.join(', ')}` : undefined;
    },
  );
}

/**
 * 캡처 대상을 찾는다. `data-parity-target`을 단 요소가 있으면 그것, 없으면 `#storybook-root`의 첫 요소다.
 * 상태 재현도 이 요소에 한다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param page 스토리 페이지
 * @returns 캡처 대상
 */
async function findTarget(page: Page): Promise<Locator> {
  const marked = page.locator(`[${PARITY_TARGET_ATTRIBUTE}]`);
  return (await marked.count()) > 0 ? marked.first() : page.locator('#storybook-root > *').first();
}

/**
 * 피그마 상태(Hover, Pressed, Focus)를 실제 마우스·키보드 동작으로 재현한다.
 * @param page 스토리 페이지
 * @param target 캡처 대상
 * @param interaction 재현할 상호작용
 * @returns 실패 이유. 정상이면 undefined
 */
async function interact(
  page: Page,
  target: Locator,
  interaction: Interaction,
): Promise<string | undefined> {
  switch (interaction) {
    case 'none':
      return undefined;
    case 'hover':
      await target.hover();
      return undefined;
    case 'pressed':
      await target.hover();
      await page.mouse.down();
      return undefined;
    case 'focus': {
      // 키보드로 옮긴 포커스여야 :focus-visible 스타일이 나온다.
      await page.keyboard.press('Tab');
      const isFocused = await target.evaluate((element) =>
        element.contains(document.activeElement),
      );
      return isFocused ? undefined : 'Tab으로 캡처 대상에 포커스를 줄 수 없다.';
    }
  }
}

/**
 * 상태 전환 애니메이션을 끝난 상태로 두고 두 프레임을 기다린다.
 * 캡처는 전환이 끝난 모습이어야 피그마 상태 변형과 같다.
 * @param page 스토리 페이지
 */
async function finishTransitions(page: Page): Promise<void> {
  await page.evaluate(
    /**
     * 브라우저에서 진행 중인 애니메이션을 끝내고 두 프레임이 지나면 끝나는 Promise를 만든다.
     */
    () =>
      new Promise<void>((resolve) => {
        for (const animation of document.getAnimations()) {
          animation.finish();
        }
        requestAnimationFrame(
          /**
           * 다음 프레임에서 한 프레임 더 기다린다.
           */
          () => {
            requestAnimationFrame(() => {
              resolve();
            });
          },
        );
      }),
  );
}
