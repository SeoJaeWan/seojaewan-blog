import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import { parityResultsDir, storybookStaticDir } from '../package-paths.ts';
import type { SegmentCheck, TextCheck, VariantChecks } from './layer-checks.ts';
import { FIGMA_LAYER_ATTRIBUTE, FIGMA_ROOT_ATTRIBUTE } from './parity-config.ts';
import { loadParityPlan, type PlanItem } from './parity-plan.ts';
import { inspectItem, openItem } from './parity-runner.ts';

// @codocs [[피그마 일치 검사:비교 규칙]]
// 비교 도구가 틀린 코드를 실제로 잡는지 확인한다. 정상 컴포넌트를 연 뒤 화면(DOM)이나 피그마 쪽 확인 항목을
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
const BUTTON_DISABLED = 'style=standard,state=disabled';

/**
 * 레이어 요소의 클래스를 다른 클래스로 바꾼다. arg는 "기존→새것"이다.
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
    element.classList.replace(old, `${old.slice(0, old.length - from.length)}${to}`);
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
    typeClasses: ['type-body-strong'],
    styleFigma: 'font/size/body, font/line-height/body, font/weight/semibold, 0%',
    styleComputed: segment.styleComputed.map((expectation) =>
      expectation.property === 'font-weight'
        ? { ...expectation, css: 'var(--font-weight-semibold)' }
        : expectation,
    ),
  };
}

const emphasis = labelSegments('버튼 강조', [{ end: 3 }, { end: 5, isStrong: true }]);

const cases: ProofCase[] = [
  { name: '정상 Button', component: 'button', resultName: BUTTON_REST, shouldFail: false },
  {
    name: '정상 Button disabled',
    component: 'button',
    resultName: BUTTON_DISABLED,
    shouldFail: false,
  },
  {
    name: '정상 MenuItem',
    component: 'menu-item',
    resultName: 'kind=default,state=rest',
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
    name: '배경↔선 토큰 바꿈(배경)',
    component: 'button',
    resultName: BUTTON_DISABLED,
    shouldFail: true,
    dom: {
      change: replaceClass,
      layer: '',
      arg: 'bg-control-fill-disabled→bg-control-stroke-default',
    },
  },
  {
    name: '배경↔선 토큰 바꿈(선)',
    component: 'button',
    resultName: BUTTON_DISABLED,
    shouldFail: true,
    dom: {
      change: replaceClass,
      layer: '',
      arg: 'inner-border-control-stroke-default→inner-border-control-fill-disabled',
    },
  },
  {
    // 다른 상태(active:)에 같은 이름이 남아 이름 확인은 통과하고, 계산값 확인이 잡아야 한다.
    name: '적용 중인 상태의 클래스만 틀림(data-disabled:inner-border-*)',
    component: 'button',
    resultName: BUTTON_DISABLED,
    shouldFail: true,
    dom: {
      change: replaceClass,
      layer: '',
      arg: 'data-disabled:inner-border-control-stroke-default→data-disabled:inner-border-control-fill-disabled',
    },
  },
  {
    name: '다른 토큰(채우기 default → secondary)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: {
      change: replaceClass,
      layer: '',
      arg: 'bg-control-fill-default→bg-control-fill-secondary',
    },
  },
  {
    name: '정렬 클래스 틀림(justify-center → justify-start)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: replaceClass, layer: '', arg: 'justify-center→justify-start' },
  },
  {
    name: '여백 토큰 틀림(px-12 → px-16)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: replaceClass, layer: '', arg: 'px-12→px-16' },
  },
  {
    name: '강조 구간 빠짐',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    checks: emphasis,
    dom: { change: setInnerHtml, layer: 'label', arg: '버튼 강조' },
  },
  {
    name: '강조 구간 위치 틀림',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    checks: emphasis,
    dom: {
      change: setInnerHtml,
      layer: 'label',
      arg: '<strong class="type-body-strong">버튼</strong> 강조',
    },
  },
  {
    name: '글자 하나 다름(버튼 → 버툰)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: setInnerHtml, layer: 'label', arg: '버툰' },
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
    name: '숨긴 레이어가 보임(MenuItem shortcut)',
    component: 'menu-item',
    resultName: 'kind=default,state=rest',
    shouldFail: true,
    dom: {
      change: appendHtml,
      layer: 'base',
      arg: '<span data-figma="base/shortcut">Ctrl+O</span>',
    },
  },
  {
    name: '아이콘 다른 이름',
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
    name: '다른 CSS로 덮어쓰기(같은 클래스, 인라인 padding-left)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    dom: { change: overrideStyle, layer: '', arg: 'padding-left:20px' },
  },
  {
    name: '정상 Flyout 아크릴',
    component: 'flyout',
    resultName: 'material=acrylic',
    shouldFail: false,
  },
  {
    // 재질 칠의 루미너시티 층은 요소가 쌓임 맥락을 만들면 뒤 배경과 섞이지 않는다.
    name: '재질 요소가 쌓임 맥락을 만듦(isolate)',
    component: 'flyout',
    resultName: 'material=acrylic',
    shouldFail: true,
    dom: { change: overrideStyle, layer: '', arg: 'isolation:isolate' },
  },
  {
    name: '한글 스타일 구간에 라틴 글자(서체 다름)',
    component: 'button',
    resultName: BUTTON_REST,
    shouldFail: true,
    checks: labelSegments('버튼OK', [{ end: 4 }]),
    dom: { change: setInnerHtml, layer: 'label', arg: '버튼OK' },
  },
];

const plan = loadParityPlan(['button', 'menu-item', 'flyout']);
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
