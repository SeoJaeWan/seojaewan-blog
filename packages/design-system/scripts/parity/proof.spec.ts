import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import { parityResultsDir, storybookStaticDir, tokensJsonPath } from '../package-paths.ts';
import { cssNamesOf, expectedOfVariable, readFigmaTokens } from './figma-tokens.ts';
import type { ElementCheck, SegmentCheck, TextCheck, VariantChecks } from './layer-checks.ts';
import { FIGMA_LAYER_ATTRIBUTE, FIGMA_ROOT_ATTRIBUTE } from './parity-config.ts';
import { loadParityPlan, type PlanItem } from './parity-plan.ts';
import { inspectItem, openItem } from './parity-runner.ts';

// @codocs [[피그마 일치 검사:비교 규칙]]
// 비교 도구가 틀린 코드를 실제로 잡는지 확인한다. 정상 컴포넌트를 연 뒤 화면(DOM, CSS)이나 피그마 쪽 확인 항목을
// 일부러 틀리게 바꾸고, 틀린 버전은 모두 실패하고 정상 버전(대조군)은 통과해야 한다.
// 실행: pnpm --filter @seojaewan/design-system test:parity-proof (Storybook 빌드 필요)

/** 화면을 바꾸는 함수의 인자. 함수는 브라우저 안에서 실행되므로 바깥 변수를 쓰지 않고 이것만 쓴다 */
type DomInput = { root: string; layer: string; arg: string };

type ProofCase = {
  /** 표에 쓸 이름 */
  name: string;
  /** 비교 항목(컴포넌트와 결과 이름) */
  component: string;
  resultName: string;
  /** 틀린 버전이면 true(실패해야 한다), 대조군이면 false(통과해야 한다) */
  shouldFail: boolean;
  /** 피그마 쪽 확인 항목 바꾸기(예: 여러 구간이 있는 글자) */
  checks?: (checks: VariantChecks) => VariantChecks;
  /** 화면 바꾸기 */
  dom?: { change: (input: DomInput) => void; layer: string; arg: string };
};

type SegmentPart = { end: number; isStrong?: boolean; fontFamily?: string };

const BUTTON_REST = 'style=standard,state=rest,showIcon=true';
const BUTTON_ACCENT = 'style=accent,state=rest';
const BUTTON_DISABLED = 'style=standard,state=disabled';
const MENU_ITEM_REST = 'kind=default,state=rest';
const FLYOUT_ACRYLIC = 'material=acrylic';
// 피그마 Rest → Focused 전환(Smart Animate, motion/duration/fast, motion/easing/direct-entrance)이 걸린 변형
const PILL_FOCUSED = 'appearance=pill,filled=false,state=focused';
// 강조 구간의 굵기 변수
const SEMIBOLD = 'font/weight/semibold';

const tokens = readFigmaTokens(JSON.parse(readFileSync(tokensJsonPath, 'utf8')));

/**
 * 레이어 요소의 클래스를 다른 클래스로 바꾼다. arg는 "기존→새것"이고, 새것은 공백으로 나눠 여럿을 쓸 수 있다.
 * 상태 접두어가 붙은 것까지 모두 바꾼다(코드에서 그 토큰 이름을 다른 이름으로 쓴 경우).
 * @param input 루트 선택자, 레이어(빈 이름이면 루트), 인자
 */
function replaceClass(input: DomInput): void {
  const [from = '', to = ''] = input.arg.split('→');
  const base = document.querySelector(input.root);
  const element = input.layer === '' ? base : base?.querySelector(`[data-figma="${input.layer}"]`);
  if (!(element instanceof Element)) {
    throw new Error(`요소가 없다: ${input.layer}`);
  }
  const matches = [...element.classList].filter(
    (name) => name === from || name.endsWith(`:${from}`),
  );
  if (matches.length === 0) {
    throw new Error(`클래스가 없다: ${from}`);
  }
  for (const old of matches) {
    const prefix = old.slice(0, old.length - from.length);
    element.classList.remove(old);
    element.classList.add(...to.split(' ').map((name) => `${prefix}${name}`));
  }
}

/**
 * 레이어 요소의 안쪽 HTML을 바꾼다.
 * @param input 루트 선택자, 레이어, 새 HTML
 */
function setInnerHtml(input: DomInput): void {
  const element = document
    .querySelector(input.root)
    ?.querySelector(`[data-figma="${input.layer}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`요소가 없다: ${input.layer}`);
  }
  element.innerHTML = input.arg;
}

/**
 * 레이어 요소의 속성을 바꾼다. arg는 "속성=값"이고 값이 비면 속성을 지운다.
 * @param input 루트 선택자, 레이어, 인자
 */
function setAttribute(input: DomInput): void {
  const [name = '', value = ''] = input.arg.split('=');
  const element = document
    .querySelector(input.root)
    ?.querySelector(`[data-figma="${input.layer}"]`);
  if (!(element instanceof Element)) {
    throw new Error(`요소가 없다: ${input.layer}`);
  }
  if (value === '') {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}

/**
 * 레이어 요소(빈 이름이면 루트)에 HTML을 덧붙인다.
 * @param input 루트 선택자, 레이어, 덧붙일 HTML
 */
function appendHtml(input: DomInput): void {
  const base = document.querySelector(input.root);
  const element = input.layer === '' ? base : base?.querySelector(`[data-figma="${input.layer}"]`);
  if (!(element instanceof Element)) {
    throw new Error(`요소가 없다: ${input.layer}`);
  }
  element.insertAdjacentHTML('beforeend', input.arg);
}

/**
 * 레이어 요소(빈 이름이면 루트)에 인라인 스타일을 더한다(다른 CSS로 덮어쓰기). arg는 "속성:값"이다.
 * @param input 루트 선택자, 레이어, 인자
 */
function overrideStyle(input: DomInput): void {
  const [property = '', value = ''] = input.arg.split(':');
  const base = document.querySelector(input.root);
  const element = input.layer === '' ? base : base?.querySelector(`[data-figma="${input.layer}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`요소가 없다: ${input.layer}`);
  }
  element.style.setProperty(property, value);
}

/**
 * 문서에 전역 스타일시트를 더한다(레이어 밖 규칙이라 유틸리티를 덮는다). arg는 CSS 글자다.
 * @param input 인자
 */
function addGlobalStyle(input: DomInput): void {
  const style = document.createElement('style');
  style.textContent = input.arg;
  document.head.append(style);
}

/**
 * 버튼 label 글자를 여러 구간으로 바꾼 확인 항목을 만든다(피그마에서 구간을 나눈 글자를 흉내 낸다).
 * @param characters 글자 내용
 * @param parts 구간 끝 위치와 모양
 * @returns 확인 항목을 바꾸는 함수
 */
function labelSegments(
  characters: string,
  parts: readonly SegmentPart[],
): (checks: VariantChecks) => VariantChecks {
  return (checks) => ({
    ...checks,
    texts: checks.texts.map((text) =>
      text.layer === 'label' ? splitText(text, characters, parts) : text,
    ),
  });
}

/**
 * 글자 확인 항목을 새 내용과 구간으로 바꾼다. 첫 구간(Body)을 본으로 쓴다.
 * @param text 원래 글자 확인 항목
 * @param characters 새 글자 내용
 * @param parts 구간 끝 위치와 모양
 * @returns 바꾼 글자 확인 항목
 */
function splitText(text: TextCheck, characters: string, parts: readonly SegmentPart[]): TextCheck {
  const [body] = text.segments;
  if (body === undefined) {
    throw new Error('label 구간이 없다');
  }
  const segments: SegmentCheck[] = [];
  let start = 0;
  for (const part of parts) {
    const segment: SegmentCheck = {
      ...body,
      start,
      end: part.end,
      fontFamily: part.fontFamily ?? body.fontFamily,
    };
    start = part.end;
    segments.push(part.isStrong === true ? strongSegment(segment) : segment);
  }
  return { ...text, characters, segments };
}

/**
 * 구간을 Body Strong(굵기 semibold) 구간으로 바꾼다.
 * @param segment Body 구간
 * @returns Body Strong 구간
 */
function strongSegment(segment: SegmentCheck): SegmentCheck {
  return {
    ...segment,
    textStyle: 'Body Strong',
    checks: segment.checks.map(semiboldCheck),
  };
}

/**
 * 글자 굵기 확인 항목을 semibold 변수로 바꾼다. 다른 항목은 그대로 둔다.
 * @param check 구간 확인 항목
 * @returns 바꾼 확인 항목
 */
function semiboldCheck(check: ElementCheck): ElementCheck {
  if (check.property !== 'font-weight') {
    return check;
  }
  return {
    ...check,
    figma: SEMIBOLD,
    variables: cssNamesOf(tokens, SEMIBOLD),
    expected: expectedOfVariable(tokens, SEMIBOLD),
  };
}

const emphasis = labelSegments('버튼 강조', [{ end: 3 }, { end: 5, isStrong: true }]);

const cases: ProofCase[] = [
  { name: '정상 Button', component: 'button', resultName: BUTTON_REST, shouldFail: false },
  { name: '정상 Button accent', component: 'button', resultName: BUTTON_ACCENT, shouldFail: false },
  {
    name: '정상 Button disabled',
    component: 'button',
    resultName: BUTTON_DISABLED,
    shouldFail: false,
  },
  { name: '정상 MenuItem', component: 'menu-item', resultName: MENU_ITEM_REST, shouldFail: false },
  {
    name: '정상 Flyout 아크릴',
    component: 'flyout',
    resultName: FLYOUT_ACRYLIC,
    shouldFail: false,
  },
  {
    name: '정상 SearchBox Pill Focused(상태 전환 포함)',
    component: 'search-box',
    resultName: PILL_FOCUSED,
    shouldFail: false,
  },
  {
    name: '강조 구간을 <strong>으로 표시',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: false,
    checks: emphasis,
    dom: {
      change: setInnerHtml,
      layer: 'label',
      arg: '버튼 <strong class="type-body-strong">강조</strong>',
    },
  },
  {
    name: '라틴 글자 구간을 라틴 서체로 나눈 피그마 글자',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: false,
    checks: labelSegments('버튼OK', [{ end: 2 }, { end: 4, fontFamily: 'Open Sans' }]),
    dom: { change: setInnerHtml, layer: 'label', arg: '버튼OK' },
  },
  {
    name: '같은 토큰을 다른 유틸리티로 씀(px-12 → pl-12 pr-12)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: false,
    dom: { change: replaceClass, layer: '', arg: 'px-12→pl-12 pr-12' },
  },
  {
    name: '이웃 상태의 색 토큰(채우기 default → disabled)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: {
      change: replaceClass,
      layer: '',
      arg: 'bg-control-fill-default→bg-control-fill-disabled',
    },
  },
  {
    // 값이 같은 다른 토큰은 계산값으로는 잡지 못하고 이름 비교가 잡는다.
    name: '값이 같은 다른 토큰(accent-fill/default → accent-text-fill/tertiary)',
    component: 'button',
    resultName: BUTTON_ACCENT,
    shouldFail: true,
    dom: {
      change: overrideStyle,
      layer: '',
      arg: 'background-color:var(--color-accent-text-fill-tertiary)',
    },
  },
  {
    name: '여백 토큰 틀림(px-12 → px-16)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: replaceClass, layer: '', arg: 'px-12→px-16' },
  },
  {
    name: '주축 정렬 틀림(justify-center → justify-start)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: replaceClass, layer: '', arg: 'justify-center→justify-start' },
  },
  {
    name: '전역 CSS로 덮어쓰기(button { background: white })',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: addGlobalStyle, layer: '', arg: 'button { background: white; }' },
  },
  {
    name: '인라인 스타일로 덮어쓰기(같은 클래스, padding-left)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: overrideStyle, layer: '', arg: 'padding-left:20px' },
  },
  {
    name: '아이콘 다른 자산',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: {
      change: setAttribute,
      layer: 'icon',
      arg: 'data-asset=icons/ic_fluent_search_16_regular.svg',
    },
  },
  {
    name: '글자 하나 더함(버튼 → 버튼!)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: setInnerHtml, layer: 'label', arg: '버튼!' },
  },
  {
    name: '숨긴 레이어가 보임(MenuItem shortcut)',
    component: 'menu-item',
    resultName: MENU_ITEM_REST,
    shouldFail: true,
    dom: {
      change: appendHtml,
      layer: 'base',
      arg: '<span data-figma="base/shortcut">Ctrl+O</span>',
    },
  },
  {
    name: '표시 빠짐(icon의 data-figma 없음)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: setAttribute, layer: 'icon', arg: `${FIGMA_LAYER_ATTRIBUTE}=` },
  },
  {
    name: '표시 없는 요소에 토큰 클래스',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: appendHtml, layer: '', arg: '<span class="bg-accent-fill-default"></span>' },
  },
  {
    name: '표시 없는 요소에 덮여 보이지 않는 토큰 클래스(bg-accent-fill-default bg-transparent)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: {
      change: appendHtml,
      layer: '',
      arg: '<span class="bg-accent-fill-default bg-transparent"></span>',
    },
  },
  {
    // 값과 닿는 토큰은 같지만, 기대한 이름 앞에 Tailwind 내부 변수가 아닌 사용자 속성을 거친다.
    name: '다른 사용자 속성을 거친 변수 사슬(--color-my-button)',
    component: 'button',
    resultName: BUTTON_ACCENT,
    shouldFail: true,
    dom: {
      change: addGlobalStyle,
      layer: '',
      arg: 'button { --color-my-button: var(--color-accent-fill-default); background-color: var(--color-my-button); }',
    },
  },
  {
    name: '다른 배경 흐림(material-mica)',
    component: 'flyout',
    resultName: FLYOUT_ACRYLIC,
    shouldFail: true,
    dom: {
      change: overrideStyle,
      layer: '',
      arg: 'backdrop-filter:blur(var(--backdrop-blur-material-mica))',
    },
  },
  {
    name: '상태 전환 시간 다름(duration-fast → duration-faster)',
    component: 'search-box',
    resultName: PILL_FOCUSED,
    shouldFail: true,
    dom: { change: replaceClass, layer: '', arg: 'duration-fast→duration-faster' },
  },
  {
    name: '상태 전환 이징 다름(ease-direct-entrance → ease-fade)',
    component: 'search-box',
    resultName: PILL_FOCUSED,
    shouldFail: true,
    dom: { change: replaceClass, layer: '', arg: 'ease-direct-entrance→ease-fade' },
  },
  {
    name: '바뀌는 속성이 transition-property에 없음(opacity만 전환)',
    component: 'search-box',
    resultName: PILL_FOCUSED,
    shouldFail: true,
    dom: { change: overrideStyle, layer: '', arg: 'transition-property:opacity' },
  },
  {
    name: '한글 스타일 구간에 라틴 글자(서체 다름)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    checks: labelSegments('버튼OK', [{ end: 4 }]),
    dom: { change: setInnerHtml, layer: 'label', arg: '버튼OK' },
  },
  {
    name: '강조 구간 빠짐',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    checks: emphasis,
    dom: { change: setInnerHtml, layer: 'label', arg: '버튼 강조' },
  },
];

const plan = loadParityPlan(['button', 'menu-item', 'flyout', 'search-box']);
const storybookIndex: unknown = JSON.parse(
  readFileSync(path.join(storybookStaticDir, 'index.json'), 'utf8'),
);
const proofDir = path.join(parityResultsDir, 'proof');

for (const [index, proof] of cases.entries()) {
  test(`${proof.shouldFail ? '틀린 버전' : '대조군'}: ${proof.name}`, async ({ page }) => {
    await checkProof(page, proof, index);
  });
}

/**
 * 경우 하나를 실행하고 결과 파일을 남긴 뒤 기대(틀린 버전은 실패, 대조군은 통과)와 맞는지 확인한다.
 * @param page Playwright 페이지
 * @param proof 확인할 경우
 * @param index 결과 파일 번호
 */
async function checkProof(page: Page, proof: ProofCase, index: number): Promise<void> {
  const failures = await runProof(page, proof);
  mkdirSync(proofDir, { recursive: true });
  writeFileSync(
    path.join(proofDir, `${String(index).padStart(2, '0')}.json`),
    `${JSON.stringify({ name: proof.name, shouldFail: proof.shouldFail, failures }, null, 2)}\n`,
  );
  if (proof.shouldFail) {
    expect(failures, '틀린 버전인데 실패가 없다').not.toEqual([]);
  } else {
    expect(failures.join('\n')).toBe('');
  }
}

/**
 * 비교 항목을 열고 화면·확인 항목을 바꾼 뒤 비교한다.
 * @param page Playwright 페이지
 * @param proof 확인할 경우
 * @returns 실패 메시지 목록
 */
async function runProof(page: Page, proof: ProofCase): Promise<string[]> {
  const item: PlanItem | undefined = plan.items.find(
    (candidate) =>
      candidate.component === proof.component && candidate.resultName === proof.resultName,
  );
  if (item === undefined) {
    throw new Error(`비교 항목이 없다: ${proof.component} ${proof.resultName}`);
  }
  const opened = await openItem(page, item, storybookIndex);
  if (!opened.ok) {
    throw new Error(opened.failures.map((failure) => failure.message).join('\n'));
  }
  if (proof.dom !== undefined) {
    await page.evaluate(proof.dom.change, {
      root: `[${FIGMA_ROOT_ATTRIBUTE}="${item.componentName}"]`,
      layer: proof.dom.layer,
      arg: proof.dom.arg,
    });
  }
  const checks = proof.checks === undefined ? item.checks : proof.checks(item.checks);
  const failures = await inspectItem(page, item, checks);
  return failures.map((failure) => failure.message);
}
