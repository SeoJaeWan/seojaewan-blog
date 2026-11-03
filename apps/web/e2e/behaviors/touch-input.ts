import type { BrowserContext, CDPSession, Locator, Page } from '@playwright/test';

/** 화면 좌표(CSS px). */
export type Point = { x: number; y: number };

/** 터치할 곳. 요소면 가운데를 누른다. */
export type TouchTarget = Locator | Point;

/** 실제 터치 장치처럼 손가락 이벤트를 보내는 함수들. */
export type TouchInput = {
  /** 짧게 눌렀다 뗀다. */
  tap: (target: TouchTarget) => Promise<void>;
  /** 누른 채 기다렸다 뗀다. 기본 700ms(Base UI 길게 누르기 500ms보다 길게). */
  longPress: (target: TouchTarget, holdMs?: number) => Promise<void>;
  /** 누른 채 끌어 옮긴 뒤 뗀다. */
  swipe: (from: TouchTarget, to: TouchTarget, steps?: number) => Promise<void>;
};

type TouchEventType = 'touchStart' | 'touchMove' | 'touchEnd';

const TAP_HOLD_MS = 120;
const LONG_PRESS_MS = 700;
const MOVE_STEP_MS = 40;
const SWIPE_STEPS = 15;

/**
 * 요소면 가운데 좌표를, 좌표면 그대로 돌려준다.
 * @param target 터치할 곳
 * @returns 화면 좌표
 */
async function pointOf(target: TouchTarget): Promise<Point> {
  if (!('boundingBox' in target)) {
    return target;
  }
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error('터치할 요소가 화면에 없다');
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * 터치 입력을 만든다. Playwright `touchscreen`은 탭만 있어 CDP `Input.dispatchTouchEvent`로 보낸다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param page 터치할 페이지
 * @param context 페이지의 브라우저 컨텍스트(CDP 세션을 연다)
 * @returns 탭·길게 누르기·끌기 함수
 */
export function createTouchInput(page: Page, context: BrowserContext): TouchInput {
  let session: CDPSession | undefined;

  /**
   * 터치 이벤트 하나를 보낸다.
   * @param type 이벤트 종류
   * @param points 닿아 있는 손가락 자리
   */
  async function send(type: TouchEventType, points: Point[]): Promise<void> {
    session ??= await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  }

  return {
    async tap(target) {
      const point = await pointOf(target);
      await send('touchStart', [point]);
      await page.waitForTimeout(TAP_HOLD_MS);
      await send('touchEnd', []);
    },
    async longPress(target, holdMs = LONG_PRESS_MS) {
      const point = await pointOf(target);
      await send('touchStart', [point]);
      await page.waitForTimeout(holdMs);
      await send('touchEnd', []);
    },
    async swipe(from, to, steps = SWIPE_STEPS) {
      const start = await pointOf(from);
      const end = await pointOf(to);
      await send('touchStart', [start]);
      for (let step = 1; step <= steps; step += 1) {
        const ratio = step / steps;
        await page.waitForTimeout(MOVE_STEP_MS);
        await send('touchMove', [
          { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio },
        ]);
      }
      await send('touchEnd', []);
    },
  };
}

/**
 * 손가락 표시를 그린다. Playwright 동작 표시에는 터치가 없어 반투명 원이 손가락을 따라가게 한다.
 * `addInitScript`로 페이지마다 넣으며 브라우저 안에서 돈다. 앱에 닿지 않게 `pointer-events:none`·`aria-hidden`·`inert`를 둔다.
 * @codocs [[테스트 작성 규칙:E2E]]
 */
export function drawTouchFinger(): void {
  /** 손가락 원을 한 번만 만들고 터치 이벤트를 따라가게 한다. */
  function make(): void {
    if (document.getElementById('__behavior_finger') !== null) {
      return;
    }
    const finger = document.createElement('div');
    finger.id = '__behavior_finger';
    finger.setAttribute('aria-hidden', 'true');
    finger.setAttribute('inert', '');
    finger.style.cssText =
      'position:fixed;left:-200px;top:-200px;width:56px;height:56px;margin:-28px 0 0 -28px;' +
      'border-radius:50%;background:rgba(40,120,255,.25);border:3px solid rgba(40,120,255,.7);' +
      'pointer-events:none;z-index:2147483647;opacity:0;transition:transform .12s,background .12s,opacity .35s;';
    document.documentElement.appendChild(finger);

    /**
     * 원을 손가락 자리로 옮긴다.
     * @param touch 첫 손가락
     */
    function move(touch: Touch | undefined): void {
      if (touch === undefined) {
        return;
      }
      finger.style.left = `${touch.clientX}px`;
      finger.style.top = `${touch.clientY}px`;
    }

    /**
     * 누르면 진하고 작게 보인다.
     * @param event 터치 시작
     */
    function press(event: TouchEvent): void {
      move(event.touches[0]);
      finger.style.transition = 'transform .12s,background .12s,opacity .05s';
      finger.style.opacity = '1';
      finger.style.transform = 'scale(.7)';
      finger.style.background = 'rgba(40,120,255,.6)';
    }

    /** 떼면 옅게 사라진다. */
    function lift(): void {
      finger.style.transition = 'transform .12s,background .12s,opacity .6s';
      finger.style.opacity = '0';
      finger.style.transform = 'scale(1)';
      finger.style.background = 'rgba(40,120,255,.25)';
    }

    addEventListener('touchstart', press, true);
    addEventListener(
      'touchmove',
      (event) => {
        move(event.touches[0]);
      },
      true,
    );
    addEventListener('touchend', lift, true);
    addEventListener('touchcancel', lift, true);
  }

  // 초기화 스크립트는 문서 요소가 생기기 전에 돌 수 있다.
  document.addEventListener('readystatechange', make);
  document.addEventListener('DOMContentLoaded', make);
}
