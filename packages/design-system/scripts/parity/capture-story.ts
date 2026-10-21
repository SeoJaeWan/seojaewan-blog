import type { Browser, Locator, Page } from '@playwright/test';

import type { ParityCase } from './figma-export.ts';
import { pixelClip } from './figma-export.ts';
import { PAGE_MARGIN, PARITY_TARGET_ATTRIBUTE, RENDER_TIMEOUT_MS } from './parity-config.ts';
import type { StoryArgValue } from './story-target.ts';
import { storyArgsParam, storyTarget } from './story-target.ts';

export type CaptureResult =
  { ok: true; image: Buffer } | { ok: false; message: string; image?: Buffer };

// Storybook 미리보기가 스토리 렌더링을 마쳤는지 확인하는 브라우저 코드다.
// 내부 API(__STORYBOOK_PREVIEW__)가 없으면 루트에 요소가 생겼는지로 판단한다.
const STORY_RENDERED_SCRIPT = `(() => {
  const body = document.body.classList;
  if (body.contains('sb-show-errordisplay') || body.contains('sb-show-nopreview')) return true;
  const phase = window.__STORYBOOK_PREVIEW__?.currentRender?.phase;
  const hasChild = document.querySelector('#storybook-root > *') !== null;
  return body.contains('sb-show-main') && hasChild && (phase === undefined || phase === 'completed' || phase === 'finished' || phase === 'played');
})()`;

// 크기·위치를 소수 오차 없이 같다고 볼 범위(CSS px)다.
const SIZE_EPSILON = 0.01;

/**
 * 변형 하나에 해당하는 스토리를 피그마와 같은 크기·배율로 렌더링해 스크린샷을 찍는다.
 * @codocs [[피그마 일치 검사:스토리 규칙]]
 * @param browser Chromium 브라우저
 * @param baseUrl 정적 Storybook 주소
 * @param storyId 스토리 ID
 * @param parityCase 비교할 변형
 * @returns renderBounds 영역의 투명 배경 스크린샷, 또는 실패 이유
 */
export async function captureStory(
  browser: Browser,
  baseUrl: string,
  storyId: string,
  parityCase: ParityCase,
): Promise<CaptureResult> {
  const { width, height, scale } = parityCase;
  const clip = pixelClip(parityCase.renderBounds, scale);
  const left = PAGE_MARGIN + Math.max(0, Math.ceil(-clip.x));
  const top = PAGE_MARGIN + Math.max(0, Math.ceil(-clip.y));
  const context = await browser.newContext({
    deviceScaleFactor: scale,
    viewport: {
      width: left + Math.ceil(Math.max(width, clip.x + clip.width)) + PAGE_MARGIN,
      height: top + Math.ceil(Math.max(height, clip.y + clip.height)) + PAGE_MARGIN,
    },
    colorScheme: 'light',
    locale: 'ko-KR',
  });
  try {
    const page = await context.newPage();
    const { args, interaction } = storyTarget(parityCase.properties);
    const url = new URL('iframe.html', `${baseUrl}/`);
    url.searchParams.set('id', storyId);
    url.searchParams.set('viewMode', 'story');
    url.searchParams.set('args', storyArgsParam(args));
    await page.goto(url.href);

    const renderError = await waitForStory(page, storyId, args);
    if (renderError !== undefined) {
      return { ok: false, message: `스토리를 그리지 못했다: ${renderError}` };
    }
    const target = await findTarget(page);
    await placeStory(page, left, top, width);
    const fontError = await waitForFonts(page);
    if (fontError !== undefined) {
      return { ok: false, message: fontError };
    }

    const box = await target.boundingBox();
    if (box === null) {
      return { ok: false, message: '비교할 요소가 화면에 없다.' };
    }
    const interactionError = await interact(page, target, interaction);
    if (interactionError !== undefined) {
      return { ok: false, message: interactionError };
    }
    await nextFrames(page);

    const image = await page.screenshot({
      clip: {
        x: Math.round(box.x * scale) / scale + clip.x,
        y: Math.round(box.y * scale) / scale + clip.y,
        width: clip.width,
        height: clip.height,
      },
      omitBackground: true,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });

    if (
      Math.abs(box.width - width) > SIZE_EPSILON ||
      Math.abs(box.height - height) > SIZE_EPSILON
    ) {
      return {
        ok: false,
        image,
        message: `컴포넌트 크기가 다르다: 피그마 ${width}×${height}, 스토리 ${round(box.width)}×${round(box.height)}`,
      };
    }
    // 노드 왼쪽 위가 장치 픽셀 경계에 있어야 PNG와 같은 픽셀 격자로 잘린다.
    if (!isInteger(box.x * scale) || !isInteger(box.y * scale)) {
      return {
        ok: false,
        image,
        message: `요소가 픽셀 경계에 있지 않다(x=${round(box.x)}, y=${round(box.y)}). 스토리 레이아웃을 확인한다.`,
      };
    }
    return { ok: true, image };
  } finally {
    await context.close();
  }
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
    // 내부 API가 없으면 확인을 건너뛴다.
    return undefined;
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
 * 스토리를 정해진 정수 위치에 두고 배경을 투명하게 한다.
 * 루트 폭을 피그마 노드 폭으로 두어, 부모 폭을 채우는 컴포넌트도 피그마와 같은 폭이 되게 한다.
 * @param page 스토리 페이지
 * @param left 루트 왼쪽 위치(CSS px)
 * @param top 루트 위쪽 위치(CSS px)
 * @param width 피그마 노드 폭(CSS px)
 */
async function placeStory(page: Page, left: number, top: number, width: number): Promise<void> {
  await page.addStyleTag({
    content: `
      html, body { background: transparent !important; }
      body { margin: 0 !important; padding: 0 !important; display: block !important; }
      #storybook-root {
        position: absolute !important;
        left: ${left}px !important;
        top: ${top}px !important;
        width: ${width}px !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `,
  });
}

/**
 * 웹 폰트를 모두 받을 때까지 기다리고, 보이는 글자가 시스템 서체로 그려지지 않았는지 확인한다.
 * @codocs [[디자인 기반:서체]]
 * @param page 스토리 페이지
 * @returns 실패 이유. 정상이면 undefined
 */
async function waitForFonts(page: Page): Promise<string | undefined> {
  return page.evaluate(
    /**
     * 브라우저에서 서체 로딩을 기다리고 대체 서체로 그린 글자를 찾는다.
     */
    async () => {
      await document.fonts.ready;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const fallbacks: string[] = [];
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = node.textContent?.trim() ?? '';
        const element = node.parentElement;
        if (text === '' || element === null || !element.checkVisibility()) {
          continue;
        }
        const style = getComputedStyle(element);
        const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const faces = await document.fonts.load(font, text);
        if (faces.length === 0) {
          fallbacks.push(`"${text.slice(0, 20)}" (${style.fontFamily})`);
        }
      }
      await document.fonts.ready;
      const failed = [...document.fonts]
        .filter((face) => face.status === 'error')
        .map((face) => `${face.family} ${face.weight}`);
      if (failed.length > 0) {
        return `웹 폰트를 받지 못했다: ${failed.join(', ')}`;
      }
      if (fallbacks.length > 0) {
        return `웹 폰트가 아닌 시스템 서체로 그린 글자가 있다: ${fallbacks.join(', ')}`;
      }
      return undefined;
    },
  );
}

/**
 * 비교할 요소를 찾는다. `data-parity-target`이 있으면 그 요소, 없으면 #storybook-root의 첫 요소다.
 * @param page 스토리 페이지
 * @returns 비교할 요소
 */
async function findTarget(page: Page): Promise<Locator> {
  const marked = page.locator(`[${PARITY_TARGET_ATTRIBUTE}]`);
  if ((await marked.count()) > 0) {
    return marked.first();
  }
  return page.locator('#storybook-root > *').first();
}

/**
 * 피그마 상태(Hover, Pressed, Focus)를 실제 마우스·키보드 동작으로 재현한다.
 * @param page 스토리 페이지
 * @param target 비교할 요소
 * @param interaction 재현할 상호작용
 * @returns 실패 이유. 정상이면 undefined
 */
async function interact(
  page: Page,
  target: Locator,
  interaction: ReturnType<typeof storyTarget>['interaction'],
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
      return isFocused ? undefined : 'Tab으로 비교할 요소에 포커스를 줄 수 없다.';
    }
  }
}

/**
 * 상태 변화가 화면에 반영되도록 두 프레임을 기다린다.
 * @param page 스토리 페이지
 */
async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    /**
     * 브라우저에서 두 프레임이 지나면 끝나는 Promise를 만든다.
     */
    () =>
      new Promise<void>((resolve) => {
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

/**
 * 정수인지 확인한다(소수 오차는 무시한다).
 * @param value 확인할 값
 * @returns 정수에 충분히 가까우면 true
 */
function isInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) <= SIZE_EPSILON;
}

/**
 * 메시지에 쓰도록 소수 둘째 자리까지 반올림한다.
 * @param value 숫자
 * @returns 반올림한 숫자
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
