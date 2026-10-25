import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import {
  compareMotion,
  findMotionStoryId,
  iterationSummary,
  type ObservedAnimation,
} from './motion-compare.ts';
import { MOTION_SELECTION_ENV, parseMotionSpec } from './motion-spec.ts';
import { FIGMA_MOTIONS_DIR, FIGMA_TOKENS_PATH, fromRepo, storybookStaticDir } from './paths.ts';
import { startStaticServer, type StaticServer } from './static-server.ts';

// @codocs [[피그마 연동:모션]]
// 견본마다 디자인 시스템 Storybook의 `Motion/<이름>` 스토리를 열고 getAnimations()로 시간·이징·지연·반복 횟수를 읽어
// json의 토큰 짝(값은 tokens.json)과 비교한다. 키프레임 모양은 사람이 본다.
// 보통은 run-motion-check.ts가 범위를 정하고 Storybook을 빌드한 뒤 이 파일을 실행한다.

// 스토리 렌더링과 애니메이션 시작을 기다리는 최대 시간(ms)이다.
const RENDER_TIMEOUT_MS = 15_000;

// 문서가 만들어지자마자 모든 CSS 애니메이션을 멈춘다. 짧은 애니메이션이 끝나 getAnimations()에서 빠지기 전에 읽기 위해서다.
// animation-play-state는 시간·이징·지연·반복 횟수를 바꾸지 않는다.
const PAUSE_ANIMATIONS_SCRIPT = `(() => {
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { animation-play-state: paused !important; }';
  const append = () => (document.head ?? document.documentElement).append(style);
  if (document.documentElement) append(); else document.addEventListener('DOMContentLoaded', append);
})()`;

// 스토리 안(#storybook-root)에서 도는 CSS 애니메이션(전환 제외)을 고르는 브라우저 식이다.
// Storybook 자체의 불러오기 표시(sb-rotate360 등)는 스토리 밖이라 뺀다.
const STORY_ANIMATIONS = `document.getAnimations().filter((animation) =>
  typeof animation.animationName === 'string' &&
  animation.effect && animation.effect.target instanceof Element &&
  document.getElementById('storybook-root')?.contains(animation.effect.target))`;

// 재생 중인 스토리 애니메이션의 시간 값을 읽는 브라우저 코드다. 끝(offset 1) 키프레임의 이징은 쓰이지 않아 뺀다.
const READ_ANIMATIONS_SCRIPT = `${STORY_ANIMATIONS}
  .map((animation) => {
    const effect = animation.effect;
    const timing = effect.getTiming();
    const target = effect.target;
    const classes = target && target.classList ? [...target.classList].filter((name) => name.startsWith('motion-')) : [];
    return {
      name: animation.animationName,
      target: target ? target.tagName.toLowerCase() + classes.map((name) => '.' + name).join('') : '(대상 없음)',
      duration: typeof timing.duration === 'number' ? timing.duration : Number.NaN,
      delay: timing.delay,
      iterations: timing.iterations === Infinity ? 'infinite' : timing.iterations,
      easings: effect.getKeyframes().filter((keyframe) => keyframe.computedOffset < 1).map((keyframe) => keyframe.easing),
    };
  })`;

const selected = JSON.parse(process.env[MOTION_SELECTION_ENV] ?? '[]') as string[];
const tokens: unknown = JSON.parse(readFileSync(fromRepo(FIGMA_TOKENS_PATH), 'utf8'));
let server: StaticServer | undefined;
let index: unknown;

test.beforeAll(
  /**
   * 디자인 시스템 Storybook 정적 빌드를 띄우고 index.json을 읽는다.
   */
  async () => {
    const dir = storybookStaticDir('design-system');
    server = await startStaticServer(dir);
    index = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8'));
  },
);
test.afterAll(
  /**
   * 띄운 정적 서버를 닫는다.
   */
  async () => {
    await server?.close();
  },
);

for (const name of selected) {
  test(
    name,
    /**
     * 견본 하나의 모션 스토리를 읽어 json과 비교한다.
     * @param fixtures Playwright 픽스처
     * @param fixtures.page 페이지
     */
    async ({ page }) => {
      const file = `${FIGMA_MOTIONS_DIR}/${name}.json`;
      const spec = parseMotionSpec(JSON.parse(readFileSync(fromRepo(file), 'utf8')), file);
      const story = findMotionStoryId(index, name);
      expect(story.ok ? '' : story.message).toBe('');
      if (!story.ok || server === undefined) {
        return;
      }
      const observed = await readAnimations(page, server.url, story.id);
      if (spec.iterations === null) {
        // 피그마에서 반복을 알 수 없어 비교하지 않는다. 사람이 [[디자인 기반:모션]] 표와 맞는지 보도록 남긴다.
        console.log(`[motion-check] ${name} 반복 횟수(비교 안 함): ${iterationSummary(observed)}`);
      }
      expect(compareMotion(spec, tokens, observed)).toEqual([]);
    },
  );
}

/**
 * 모션 스토리를 열고 재생 중인 CSS 애니메이션의 시간 값을 읽는다.
 * @param page Playwright 페이지
 * @param storybookUrl Storybook 정적 빌드 주소
 * @param storyId 스토리 ID
 * @returns CSS 애니메이션. 시간 안에 시작하지 않으면 빈 목록
 */
async function readAnimations(
  page: Page,
  storybookUrl: string,
  storyId: string,
): Promise<ObservedAnimation[]> {
  await page.addInitScript(PAUSE_ANIMATIONS_SCRIPT);
  const query = new URLSearchParams({ id: storyId, viewMode: 'story' });
  await page.goto(`${storybookUrl}/iframe.html?${query.toString()}`);
  try {
    await page.waitForFunction(`${STORY_ANIMATIONS}.length > 0`, undefined, {
      timeout: RENDER_TIMEOUT_MS,
    });
  } catch {
    return [];
  }
  const read: unknown = await page.evaluate(READ_ANIMATIONS_SCRIPT);
  return Array.isArray(read) ? read.map(toObserved) : [];
}

/**
 * 브라우저에서 읽은 값을 CSS 애니메이션 값으로 옮긴다.
 * Chromium은 키프레임마다 이징을 돌려준다(키프레임에 쓴 값, 없으면 요소의 animation-timing-function).
 * @param value 브라우저에서 읽은 값
 * @returns CSS 애니메이션
 */
function toObserved(value: unknown): ObservedAnimation {
  const item: Record<string, unknown> =
    typeof value === 'object' && value !== null ? Object.fromEntries(Object.entries(value)) : {};
  const easings = Array.isArray(item.easings)
    ? item.easings.map((easing: unknown) => (typeof easing === 'string' ? easing : ''))
    : [];
  return {
    name: typeof item.name === 'string' ? item.name : '',
    target: typeof item.target === 'string' ? item.target : '',
    duration: typeof item.duration === 'number' ? item.duration : Number.NaN,
    delay: typeof item.delay === 'number' ? item.delay : Number.NaN,
    iterations: item.iterations === 'infinite' ? 'infinite' : Number(item.iterations),
    easings,
  };
}
