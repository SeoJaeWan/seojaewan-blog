import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import {
  compareMotion,
  findMotionStoryId,
  iterationSummary,
  type ObservedAnimation,
} from './motion-compare.ts';
import type { MotionResult } from './motion-report.ts';
import { TOKENS_CSS_FILE } from './motion-scope.ts';
import { MOTION_SELECTION_ENV, parseMotionSpec, parseValueTracks } from './motion-spec.ts';
import {
  compareMotionValues,
  type CssKeyframe,
  isFailedRow,
  type ObservedEffect,
} from './motion-values.ts';
import {
  FIGMA_MOTIONS_DIR,
  FIGMA_TOKENS_PATH,
  fromRepo,
  motionResultsDir,
  storybookStaticDir,
} from './paths.ts';
import { startStaticServer, type StaticServer } from './static-server.ts';

// @codocs [[피그마 연동:모션]]
// 견본마다 디자인 시스템 Storybook의 `Motion/<이름>` 스토리를 열고 getAnimations()로
// - 시간·이징·지연·반복 횟수를 읽어 json의 토큰 짝(값은 tokens.json)과 비교하고(모션 시간 검사),
// - getKeyframes()의 키프레임 값을 json 키프레임 값과 비교한다(키프레임 값 검사, motion-values.ts).
// 결과는 견본마다 parity-results/motion/<이름>.json에 남기고, CI가 이것으로 PR 댓글 표를 만든다.
// 보통은 run-motion-check.ts가 범위를 정하고 Storybook을 빌드한 뒤 이 파일을 실행한다.

// 스토리 렌더링과 애니메이션 시작을 기다리는 최대 시간(ms)이다.
const RENDER_TIMEOUT_MS = 15_000;

// 문서가 만들어지자마자 모든 CSS 애니메이션을 멈춘다. 짧은 애니메이션이 끝나 getAnimations()에서 빠지기 전에 읽기 위해서다.
// animation-play-state는 시간·이징·지연·반복 횟수와 키프레임 값을 바꾸지 않는다.
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

// 재생 중인 스토리 애니메이션의 키프레임 값을 읽는 브라우저 코드다(키프레임 값 검사).
// - keyframes: getKeyframes() 값. 브라우저가 토큰 var()를 푼 값이다. 속성 이름은 kebab-case로 바꾼다.
// - declarations: 같은 이름의 @keyframes 규칙에 쓴 선언 그대로(var() 포함). 실행 중 값 변수를 찾는 데 쓴다.
// - node: 요소나 그 조상의 data-motion-node(같은 CSS 속성을 움직이는 요소가 여럿일 때 json 노드를 가리킨다).
// - box: translate의 %를 px로 바꿀 요소 크기, pathLength: 경로 트림을 비율로 바꿀 경로 길이.
const READ_EFFECTS_SCRIPT = `(() => {
  const root = document.getElementById('storybook-root');
  const kebab = (key) => key.replace(/[A-Z]/g, (char) => '-' + char.toLowerCase());
  const skip = new Set(['offset', 'computedOffset', 'easing', 'composite']);
  const rules = new Map();
  const walk = (list) => {
    for (const rule of list) {
      if (rule instanceof CSSKeyframesRule) rules.set(rule.name, rule);
      else if (rule.cssRules) walk(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules); } catch { /* 다른 출처 스타일시트는 읽을 수 없다 */ }
  }
  const offsets = (keyText) => keyText.split(',').map((text) => text.trim())
    .map((text) => text === 'from' ? 0 : text === 'to' ? 1 : parseFloat(text) / 100);
  const elements = [];
  return ${STORY_ANIMATIONS}.map((animation) => {
    const target = animation.effect.target;
    if (!elements.includes(target)) elements.push(target);
    const classes = [...target.classList].filter((name) => name.startsWith('motion-'));
    const marked = target.closest('[data-motion-node]');
    const rule = rules.get(animation.animationName);
    const declarations = rule === undefined ? [] : [...rule.cssRules].flatMap((frame) => {
      const values = {};
      for (let index = 0; index < frame.style.length; index += 1) {
        const name = frame.style[index];
        values[name] = frame.style.getPropertyValue(name);
      }
      return offsets(frame.keyText).map((offset) => ({ offset, values }));
    });
    const isPath = typeof target.getTotalLength === 'function';
    const box = target instanceof HTMLElement
      ? { width: target.offsetWidth, height: target.offsetHeight }
      : typeof target.getBBox === 'function' ? target.getBBox() : { width: 0, height: 0 };
    const node = marked !== null && root.contains(marked) ? marked.getAttribute('data-motion-node') : null;
    return {
      name: animation.animationName,
      target: target.tagName.toLowerCase() + classes.map((name) => '.' + name).join('') +
        (node === null ? '' : '[data-motion-node="' + node + '"]'),
      element: elements.indexOf(target),
      node,
      box: { width: box.width, height: box.height },
      pathLength: isPath
        ? (target.hasAttribute('pathLength') ? Number(target.getAttribute('pathLength')) : target.getTotalLength())
        : null,
      keyframes: animation.effect.getKeyframes().map((keyframe) => ({
        offset: keyframe.computedOffset,
        values: Object.fromEntries(Object.entries(keyframe)
          .filter(([key]) => !skip.has(key)).map(([key, value]) => [kebab(key), String(value)])),
      })),
      declarations,
    };
  });
})()`;

const selected = JSON.parse(process.env[MOTION_SELECTION_ENV] ?? '[]') as string[];
const tokens: unknown = JSON.parse(readFileSync(fromRepo(FIGMA_TOKENS_PATH), 'utf8'));
// tokens.css가 정의한 CSS 변수 이름이다. 키프레임이 이 밖의 변수를 쓰면 실행 중 값이다.
const tokenVariables = new Set(
  [...readFileSync(fromRepo(TOKENS_CSS_FILE), 'utf8').matchAll(/^\s*(--[\w-]+)\s*:/gmu)].map(
    (match) => match[1] ?? '',
  ),
);
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
     * 견본 하나의 모션 스토리를 읽어 json과 비교하고 결과를 남긴다.
     * @param fixtures Playwright 픽스처
     * @param fixtures.page 페이지
     */
    async ({ page }) => {
      const file = `${FIGMA_MOTIONS_DIR}/${name}.json`;
      const json: unknown = JSON.parse(readFileSync(fromRepo(file), 'utf8'));
      const spec = parseMotionSpec(json, file);
      const result: MotionResult = { name, url: spec.url, rows: [], timingErrors: [], error: null };
      try {
        const story = findMotionStoryId(index, name);
        if (!story.ok || server === undefined) {
          result.error = story.ok ? 'Storybook 정적 서버가 없다' : story.message;
          return;
        }
        const observed = await readAnimations(page, server.url, story.id);
        if (spec.iterations === null) {
          // 피그마에서 반복을 알 수 없어 비교하지 않는다. 사람이 [[디자인 기반:모션]] 표와 맞는지 보도록 남긴다.
          console.log(
            `[motion-check] ${name} 반복 횟수(비교 안 함): ${iterationSummary(observed.timing)}`,
          );
        }
        result.timingErrors = compareMotion(spec, tokens, observed.timing);
        if (observed.timing.length > 0) {
          result.rows = compareMotionValues(
            parseValueTracks(json, file),
            observed.effects,
            tokenVariables,
          );
        }
      } finally {
        writeResult(result);
      }
      expect(result.error ?? '').toBe('');
      expect(result.timingErrors).toEqual([]);
      expect(
        result.rows
          .filter(isFailedRow)
          .map(
            (row) =>
              `${row.keyframe} ${row.property}: 피그마 ${row.figma}, 코드 ${row.code}. ${row.note}`,
          ),
      ).toEqual([]);
    },
  );
}

/**
 * 견본 결과를 parity-results/motion/<이름>.json에 남긴다.
 * @param result 견본 결과
 */
function writeResult(result: MotionResult): void {
  mkdirSync(motionResultsDir, { recursive: true });
  writeFileSync(
    path.join(motionResultsDir, `${result.name}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  );
}

/**
 * 모션 스토리를 열고 재생 중인 CSS 애니메이션의 시간 값과 키프레임 값을 읽는다.
 * @param page Playwright 페이지
 * @param storybookUrl Storybook 정적 빌드 주소
 * @param storyId 스토리 ID
 * @returns 시간 값과 키프레임 값. 시간 안에 시작하지 않으면 빈 목록
 */
async function readAnimations(
  page: Page,
  storybookUrl: string,
  storyId: string,
): Promise<{ timing: ObservedAnimation[]; effects: ObservedEffect[] }> {
  await page.addInitScript(PAUSE_ANIMATIONS_SCRIPT);
  const query = new URLSearchParams({ id: storyId, viewMode: 'story' });
  await page.goto(`${storybookUrl}/iframe.html?${query.toString()}`);
  try {
    await page.waitForFunction(`${STORY_ANIMATIONS}.length > 0`, undefined, {
      timeout: RENDER_TIMEOUT_MS,
    });
  } catch {
    return { timing: [], effects: [] };
  }
  const read: unknown = await page.evaluate(READ_ANIMATIONS_SCRIPT);
  const effects: unknown = await page.evaluate(READ_EFFECTS_SCRIPT);
  return {
    timing: Array.isArray(read) ? read.map(toObserved) : [],
    effects: Array.isArray(effects) ? effects.map(toEffect) : [],
  };
}

/**
 * 브라우저에서 읽은 값을 CSS 애니메이션 값으로 옮긴다.
 * Chromium은 키프레임마다 이징을 돌려준다(키프레임에 쓴 값, 없으면 요소의 animation-timing-function).
 * @param value 브라우저에서 읽은 값
 * @returns CSS 애니메이션
 */
function toObserved(value: unknown): ObservedAnimation {
  const item = toRecord(value);
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

/**
 * 브라우저에서 읽은 키프레임 값을 옮긴다.
 * @param value 브라우저에서 읽은 값
 * @returns CSS 애니메이션 키프레임
 */
function toEffect(value: unknown): ObservedEffect {
  const item = toRecord(value);
  const box = toRecord(item.box);
  return {
    name: typeof item.name === 'string' ? item.name : '',
    target: typeof item.target === 'string' ? item.target : '',
    element: typeof item.element === 'number' ? item.element : -1,
    node: typeof item.node === 'string' ? item.node : null,
    box: {
      width: typeof box.width === 'number' ? box.width : 0,
      height: typeof box.height === 'number' ? box.height : 0,
    },
    pathLength: typeof item.pathLength === 'number' ? item.pathLength : null,
    keyframes: toKeyframes(item.keyframes),
    declarations: toKeyframes(item.declarations),
  };
}

/**
 * 브라우저에서 읽은 키프레임 목록을 옮긴다.
 * @param value 키프레임 목록
 * @returns 키프레임
 */
function toKeyframes(value: unknown): CssKeyframe[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(toKeyframe);
}

/**
 * 브라우저에서 읽은 키프레임 하나를 옮긴다.
 * @param value 키프레임
 * @returns 위치와 CSS 값
 */
function toKeyframe(value: unknown): CssKeyframe {
  const keyframe = toRecord(value);
  const values = Object.fromEntries(
    Object.entries(toRecord(keyframe.values)).map(([key, text]) => [key, String(text)]),
  );
  return { offset: typeof keyframe.offset === 'number' ? keyframe.offset : Number.NaN, values };
}

/**
 * 객체면 그대로, 아니면 빈 객체를 돌려준다.
 * @param value 값
 * @returns 객체
 */
function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}
